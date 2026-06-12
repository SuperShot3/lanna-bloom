import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from 'pdf-lib';
import type { Expense } from '@/types/expenses';
import type {
  SupabaseOrderRow,
  SupabaseOrderItemRow,
  SupabaseStatusHistoryRow,
} from '@/lib/supabase/adminQueries';

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;

/** THB for PDF — avoid `฿` so standard fonts (WinAnsi) never throw. */
function formatThbPdfAmount(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return 'THB n/a';
  const s = Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `THB ${s}`;
}

function formatPdfDateTime(iso: string | null | undefined): string {
  if (!iso?.trim()) return 'n/a';
  try {
    const d = new Date(iso.trim());
    if (Number.isNaN(d.getTime())) return iso.trim();
    return d.toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Bangkok',
    });
  } catch {
    return iso.trim();
  }
}

/** First transition to DELIVERED in chronological history (history must be oldest-first). */
function deriveDeliveredAtIso(
  order: SupabaseOrderRow,
  history: SupabaseStatusHistoryRow[]
): string | null {
  const deliveredRow = history.find(
    (h) => String(h.to_status ?? '').trim().toUpperCase() === 'DELIVERED'
  );
  if (deliveredRow?.created_at?.trim()) return deliveredRow.created_at.trim();
  const os = String(order.order_status ?? '').trim().toUpperCase();
  if (os === 'DELIVERED') {
    return (
      order.fulfillment_status_updated_at?.trim() ||
      order.updated_at?.trim() ||
      null
    );
  }
  return null;
}

function formatContactPreference(raw: string | null | undefined): string {
  const s = raw?.trim();
  if (!s) return 'n/a';
  if (s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String).join(', ');
    } catch {
      /* fall through */
    }
  }
  return s;
}

function collectDeliveryLines(order: SupabaseOrderRow): string[] {
  const lines: string[] = [];
  const addr = order.address?.trim();
  const district = order.district?.trim();
  if (addr || district) {
    const parts = [addr, district].filter(Boolean);
    if (parts.length) lines.push(`Drop-off: ${parts.join(', ')}`);
  }
  if (order.delivery_date?.trim()) {
    lines.push(`Requested delivery date: ${order.delivery_date.trim()}`);
  }
  if (order.delivery_window?.trim()) {
    lines.push(`Delivery window: ${order.delivery_window.trim()}`);
  }
  const driver = order.driver_name?.trim();
  const driverPhone = order.driver_phone?.trim();
  if (driver || driverPhone) {
    lines.push(`Driver: ${[driver, driverPhone].filter(Boolean).join(' · ') || 'n/a'}`);
  }
  if (order.delivery_google_maps_url?.trim()) {
    lines.push(`Maps: ${order.delivery_google_maps_url.trim()}`);
  }
  lines.push(
    `Our delivery cost (paid to driver / courier, not customer retail fee): ${formatThbPdfAmount(order.delivery_cost)}`
  );
  return lines;
}

/**
 * Standard 14 fonts only support WinAnsi; Thai or symbols cause pdf-lib to throw.
 * When we only have Helvetica, keep printable ASCII only.
 */
function winAnsiSafe(s: string): string {
  return Array.from(s, (ch) => {
    const c = ch.codePointAt(0)!;
    return c >= 0x20 && c <= 0x7e ? ch : '?';
  }).join('');
}

interface BodyFont {
  font: PDFFont;
  /** True when an embedded Unicode font loaded (Thai / full names OK). */
  unicode: boolean;
}

function prepareBodyText(s: string, bodyFont: BodyFont): string {
  return bodyFont.unicode ? s : winAnsiSafe(s);
}

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

async function embedBodyFont(pdfDoc: PDFDocument): Promise<BodyFont> {
  const urls = [
    'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-thai@5.1.0/files/noto-sans-thai-thai-400-normal.ttf',
    'https://unpkg.com/@fontsource/noto-sans-thai@5.1.0/files/noto-sans-thai-thai-400-normal.ttf',
    'https://cdn.jsdelivr.net/gh/fontsource/font-files@main/fonts/google/noto-sans-thai/files/noto-sans-thai-thai-400-normal.ttf',
  ];
  const timeoutMs = 20_000;
  const signal =
    typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? AbortSignal.timeout(timeoutMs)
      : undefined;

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength < 5000) continue;
      let font: PDFFont;
      try {
        font = await pdfDoc.embedFont(bytes, { subset: true });
      } catch {
        font = await pdfDoc.embedFont(bytes);
      }
      return { font, unicode: true };
    } catch {
      continue;
    }
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  return { font, unicode: false };
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
    const imgSignal =
      typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
        ? AbortSignal.timeout(12_000)
        : undefined;
    const res = await fetch(url, {
      signal: imgSignal,
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
  bodyFont: BodyFont,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  lineHeight: number
): number {
  const safe = prepareBodyText(text, bodyFont);
  const font = bodyFont.font;
  const words = safe.split(/\s+/).filter(Boolean);
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
  /** Oldest-first (matches getOrderByOrderId) — used for delivered timestamp. */
  statusHistory?: SupabaseStatusHistoryRow[];
  receiptFiles: { bytes: Uint8Array; label: string }[];
}

export async function buildPaperBillRequestPdf(input: PaperBillPdfInput): Promise<Uint8Array> {
  const { expense, order, items, statusHistory = [], receiptFiles } = input;
  const pdfDoc = await PDFDocument.create();
  const bodyFont = await embedBodyFont(pdfDoc);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { font } = bodyFont;

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

  page.drawText(prepareBodyText(`Order: ${order.order_id}`, bodyFont), {
    x: MARGIN,
    y,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.25),
  });
  y -= 16;
  page.drawText(prepareBodyText(`Expense: ${expense.id}`, bodyFont), {
    x: MARGIN,
    y,
    size: 10,
    font,
    color: rgb(0.35, 0.35, 0.4),
  });
  y -= 18;

  const cust =
    order.customer_name?.trim() ||
    order.recipient_name?.trim() ||
    'n/a';
  const contactPref = formatContactPreference(order.contact_preference);
  const phone = order.phone?.trim() || order.recipient_phone?.trim() || 'n/a';
  const email = order.customer_email?.trim() || 'n/a';
  const amt = formatThbPdfAmount(expense.amount);

  y = drawWrapped(page, bodyFont, `Customer: ${cust}`, MARGIN, y, PAGE_W - 2 * MARGIN, 11, 14);
  y -= 4;
  y = drawWrapped(page, bodyFont, `Preferred contact: ${contactPref}`, MARGIN, y, PAGE_W - 2 * MARGIN, 11, 14);
  y -= 4;
  y = drawWrapped(page, bodyFont, `Phone: ${phone}`, MARGIN, y, PAGE_W - 2 * MARGIN, 11, 14);
  y -= 4;
  y = drawWrapped(page, bodyFont, `Email: ${email}`, MARGIN, y, PAGE_W - 2 * MARGIN, 11, 14);
  y -= 12;

  const placedIso = order.created_at?.trim();
  const deliveredIso = deriveDeliveredAtIso(order, statusHistory);
  y = drawWrapped(
    page,
    bodyFont,
    `Order placed: ${formatPdfDateTime(placedIso ?? null)}`,
    MARGIN,
    y,
    PAGE_W - 2 * MARGIN,
    11,
    14
  );
  y -= 4;
  const deliveredLabel =
    deliveredIso != null
      ? `Delivered: ${formatPdfDateTime(deliveredIso)}`
      : order.order_status?.trim().toUpperCase() === 'DELIVERED'
        ? 'Delivered: time not on record (status shows DELIVERED)'
        : `Delivered: pending / not recorded (status: ${order.order_status?.trim() || 'n/a'})`;
  y = drawWrapped(page, bodyFont, deliveredLabel, MARGIN, y, PAGE_W - 2 * MARGIN, 11, 14);
  y -= 14;

  page.drawText('Delivery (our records)', {
    x: MARGIN,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.2),
  });
  y -= 16;
  for (const dl of collectDeliveryLines(order)) {
    y = drawWrapped(page, bodyFont, dl, MARGIN, y, PAGE_W - 2 * MARGIN, 10, 13);
    y -= 2;
  }
  y -= 8;

  y = drawWrapped(
    page,
    bodyFont,
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
      `${it.bouquet_title ?? it.bouquet_id ?? 'Item'}${it.size ? ` · ${it.size}` : ''}`;

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
      y = drawWrapped(page, bodyFont, label, MARGIN + thumbW + 10, y, PAGE_W - 2 * MARGIN - thumbW - 10, 10, 13);
      y -= Math.max(h - 14, 8);
    } else {
      y = drawWrapped(page, bodyFont, `${label} (no product image on file)`, MARGIN, y, PAGE_W - 2 * MARGIN, 10, 13);
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
        y = drawWrapped(
          page,
          bodyFont,
          `${label} (image format not embedded - open in admin)`,
          MARGIN,
          y,
          PAGE_W - 2 * MARGIN,
          10,
          13
        );
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
      page.drawText(prepareBodyText(label, bodyFont), {
        x: MARGIN,
        y,
        size: 9,
        font,
        color: rgb(0.35, 0.35, 0.4),
      });
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
  drawWrapped(page, bodyFont, footer, MARGIN, y, PAGE_W - 2 * MARGIN, 10, 13);

  return pdfDoc.save();
}
