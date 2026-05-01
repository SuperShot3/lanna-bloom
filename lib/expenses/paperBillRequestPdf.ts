import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from 'pdf-lib';
import type { Expense } from '@/types/expenses';
import type { SupabaseOrderRow, SupabaseOrderItemRow } from '@/lib/supabase/adminQueries';
import { formatThb } from '@/lib/costsUtils';

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;

function siteBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`;
  return 'http://localhost:3000';
}

function absoluteImageUrl(snapshot: string | null): string | null {
  if (!snapshot?.trim()) return null;
  const t = snapshot.trim();
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  if (t.startsWith('//')) return `https:${t}`;
  if (t.startsWith('/')) return `${siteBaseUrl()}${t}`;
  return t;
}

async function embedUnicodeFont(pdfDoc: PDFDocument): Promise<PDFFont> {
  const urls = [
    'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-thai@5.1.0/files/noto-sans-thai-thai-400-normal.ttf',
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
      if (!res.ok) continue;
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength < 5000) continue;
      return await pdfDoc.embedFont(bytes);
    } catch {
      continue;
    }
  }
  return pdfDoc.embedFont(StandardFonts.Helvetica);
}

async function embedRasterImage(
  pdfDoc: PDFDocument,
  bytes: Uint8Array
): Promise<PDFImage | null> {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    try {
      return await pdfDoc.embedJpg(bytes);
    } catch {
      return null;
    }
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    try {
      return await pdfDoc.embedPng(bytes);
    } catch {
      return null;
    }
  }
  return null;
}

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: 'image/*' },
    });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    return buf.byteLength > 0 ? buf : null;
  } catch {
    return null;
  }
}

function drawWrapped(
  page: { drawText: (t: string, o: Record<string, unknown>) => void },
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  lineHeight: number
): number {
  const words = text.split(/\s+/).filter(Boolean);
  let line = '';
  let cy = y;
  const flush = () => {
    if (!line) return;
    page.drawText(line, { x, y: cy, size, font, color: rgb(0.1, 0.1, 0.12) });
    cy -= lineHeight;
    line = '';
  };
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      line = trial;
    } else {
      flush();
      if (font.widthOfTextAtSize(w, size) <= maxWidth) {
        line = w;
      } else {
        page.drawText(w, { x, y: cy, size, font, color: rgb(0.1, 0.1, 0.12) });
        cy -= lineHeight;
      }
    }
  }
  flush();
  return cy;
}

export interface PaperBillPdfInput {
  expense: Expense;
  order: SupabaseOrderRow;
  items: SupabaseOrderItemRow[];
  receiptFiles: { bytes: Uint8Array; label: string }[];
}

export async function buildPaperBillRequestPdf(input: PaperBillPdfInput): Promise<Uint8Array> {
  const { expense, order, items, receiptFiles } = input;
  const pdfDoc = await PDFDocument.create();
  const font = await embedUnicodeFont(pdfDoc);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const title = 'Paper bill request (vendor)';
  page.drawText(title, {
    x: MARGIN,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.2),
  });
  y -= 28;

  page.drawText(`Order: ${order.order_id}`, { x: MARGIN, y, size: 11, font, color: rgb(0.2, 0.2, 0.25) });
  y -= 16;
  page.drawText(`Expense: ${expense.id}`, { x: MARGIN, y, size: 10, font, color: rgb(0.35, 0.35, 0.4) });
  y -= 18;

  const cust =
    order.customer_name?.trim() ||
    order.recipient_name?.trim() ||
    '—';
  const contactPref = order.contact_preference?.trim() || '—';
  const phone = order.phone?.trim() || order.recipient_phone?.trim() || '—';
  const email = order.customer_email?.trim() || '—';
  const amt = formatThb(expense.amount);

  y = drawWrapped(page, font, `Customer: ${cust}`, MARGIN, y, PAGE_W - 2 * MARGIN, 11, 14);
  y -= 4;
  y = drawWrapped(page, font, `Preferred contact: ${contactPref}`, MARGIN, y, PAGE_W - 2 * MARGIN, 11, 14);
  y -= 4;
  y = drawWrapped(page, font, `Phone: ${phone}`, MARGIN, y, PAGE_W - 2 * MARGIN, 11, 14);
  y -= 4;
  y = drawWrapped(page, font, `Email: ${email}`, MARGIN, y, PAGE_W - 2 * MARGIN, 11, 14);
  y -= 12;
  y = drawWrapped(
    page,
    font,
    `Amount paid to supplier (expense): ${amt} · ${expense.description}`,
    MARGIN,
    y,
    PAGE_W - 2 * MARGIN,
    11,
    14
  );
  y -= 20;

  page.drawText('Items purchased (from order)', {
    x: MARGIN,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.2),
  });
  y -= 18;

  const thumbW = 72;
  const thumbH = 72;
  const displayItems = items.length > 0 ? items : [];

  for (const it of displayItems) {
    if (y < MARGIN + thumbH + 80) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    const label =
      `${it.bouquet_title ?? it.bouquet_id ?? 'Item'}${it.size ? ` · ${it.size}` : ''}` +
      (it.price != null ? ` · ${formatThb(it.price)}` : '');

    const url = absoluteImageUrl(it.image_url_snapshot ?? null);
    let img: PDFImage | null = null;
    if (url) {
      const b = await fetchImageBytes(url);
      if (b) img = await embedRasterImage(pdfDoc, b);
    }

    if (img) {
      const scale = Math.min(thumbW / img.width, thumbH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      page.drawImage(img, { x: MARGIN, y: y - h, width: w, height: h });
      y = drawWrapped(page, font, label, MARGIN + thumbW + 10, y, PAGE_W - 2 * MARGIN - thumbW - 10, 10, 13);
      y -= Math.max(h - 14, 8);
    } else {
      y = drawWrapped(page, font, `${label} (no product image on file)`, MARGIN, y, PAGE_W - 2 * MARGIN, 10, 13);
      y -= 8;
    }
    y -= 10;
  }

  if (receiptFiles.length > 0) {
    if (y < MARGIN + 100) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    y -= 8;
    page.drawText('Payment proof on file (slip / transfer)', {
      x: MARGIN,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.2),
    });
    y -= 20;

    for (const { bytes, label } of receiptFiles) {
      const img = await embedRasterImage(pdfDoc, bytes);
      if (!img) {
        y = drawWrapped(page, font, `${label} (image format not embedded — open in admin)`, MARGIN, y, PAGE_W - 2 * MARGIN, 10, 13);
        y -= 16;
        continue;
      }
      const maxW = PAGE_W - 2 * MARGIN;
      const maxH = 320;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      if (y < MARGIN + h + 40) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      }
      page.drawText(label, { x: MARGIN, y, size: 9, font, color: rgb(0.35, 0.35, 0.4) });
      y -= 12;
      page.drawImage(img, { x: MARGIN, y: y - h, width: w, height: h });
      y -= h + 24;
    }
  }

  const footer =
    'Please issue the missing paper bill / tax invoice for the amount above.';
  if (y < MARGIN + 36) {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  }
  drawWrapped(page, font, footer, MARGIN, y, PAGE_W - 2 * MARGIN, 10, 13);

  return pdfDoc.save();
}
