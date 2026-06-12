/**
 * Browser-only: resize + JPEG encode so receipt uploads stay under a byte budget.
 * Import only from client components.
 */

import {
  MAX_RECEIPT_UPLOAD_BYTES,
  RECEIPT_IMAGE_MAX_LONG_EDGE,
} from '@/lib/receiptUploadLimits';

const JPEG_MIME = 'image/jpeg';

/** Helps iPhone camera JPEGs/HEIC (EXIF Orientation) bitmap correctly before canvas resize. */
const IMAGE_BITMAP_ORIENTATION: ImageBitmapOptions = { imageOrientation: 'from-image' };

async function createOrientedBitmap(source: Blob | HTMLImageElement | ImageBitmap): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== 'function') return null;
  try {
    return await createImageBitmap(source, IMAGE_BITMAP_ORIENTATION);
  } catch {
    try {
      return await createImageBitmap(source);
    } catch {
      return null;
    }
  }
}

function isHeicLike(file: File): boolean {
  const t = file.type.toLowerCase();
  if (t === 'image/heic' || t === 'image/heif') return true;
  const n = file.name.toLowerCase();
  return n.endsWith('.heic') || n.endsWith('.heif');
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image. On iPhone, try Settings → Camera → Formats → Most Compatible.'));
    };
    img.src = url;
  });
}

async function heicFileToJpegBlob(file: File): Promise<Blob> {
  const mod = await import('heic2any');
  const heic2any = mod.default as (opts: {
    blob: Blob;
    toType: string;
    quality: number;
  }) => Promise<Blob | Blob[]>;
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.82 });
  const blob = Array.isArray(out) ? out[0] : out;
  if (!(blob instanceof Blob)) {
    throw new Error('HEIC conversion failed.');
  }
  return blob;
}

async function decodeToDrawable(file: File): Promise<CanvasImageSource> {
  if (isHeicLike(file)) {
    try {
      return await loadImageFromFile(file);
    } catch {
      // continue
    }
    const heicBmp = await createOrientedBitmap(file);
    if (heicBmp) return heicBmp;
    const jpegBlob = await heicFileToJpegBlob(file);
    const jpegBmp = await createOrientedBitmap(jpegBlob);
    if (jpegBmp) return jpegBmp;
    return loadImageFromFile(
      new File([jpegBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: JPEG_MIME })
    );
  }

  const bmp = await createOrientedBitmap(file);
  if (bmp) return bmp;
  return loadImageFromFile(file);
}

function dimensions(source: CanvasImageSource): { w: number; h: number } {
  if (source instanceof HTMLImageElement) {
    return { w: source.naturalWidth, h: source.naturalHeight };
  }
  if (source instanceof ImageBitmap) {
    return { w: source.width, h: source.height };
  }
  return { w: 0, h: 0 };
}

function canvasSizeForMaxEdge(w: number, h: number, maxEdge: number): { cw: number; ch: number } {
  if (w <= 0 || h <= 0) return { cw: 1, ch: 1 };
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  return {
    cw: Math.max(1, Math.round(w * scale)),
    ch: Math.max(1, Math.round(h * scale)),
  };
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), JPEG_MIME, quality);
  });
}

const JPEG_Q_MIN = 0.08;
const JPEG_Q_MAX = 0.92;

/**
 * Highest JPEG quality (~monotonic size) such that encoded size stays under maxBytes.
 * Fewer encode steps than a fixed ladder once the budget is tight to a narrow quality band.
 */
async function encodeJpegQualityUnderBudget(
  canvas: HTMLCanvasElement,
  maxBytes: number
): Promise<Blob | null> {
  const first = await canvasToJpegBlob(canvas, JPEG_Q_MAX);
  if (!first) return null;
  if (first.size <= maxBytes) return first;

  const floor = await canvasToJpegBlob(canvas, JPEG_Q_MIN);
  if (!floor || floor.size > maxBytes) return null;

  let lo = JPEG_Q_MIN;
  let hi = JPEG_Q_MAX;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) * 0.5;
    const blob = await canvasToJpegBlob(canvas, mid);
    if (!blob) return null;
    if (blob.size <= maxBytes) lo = mid;
    else hi = mid;
  }

  let best = await canvasToJpegBlob(canvas, lo);
  if (best && best.size <= maxBytes) return best;

  for (let q = lo; q >= JPEG_Q_MIN; q -= 0.04) {
    const blob = await canvasToJpegBlob(canvas, q);
    if (blob && blob.size <= maxBytes) return blob;
  }
  return floor.size <= maxBytes ? floor : null;
}

function baseNameFromFile(file: File): string {
  const n = file.name.replace(/\.[^.]+$/, '');
  return n.replace(/[^\w.-]+/g, '-').slice(0, 80) || 'receipt';
}

function logReceiptCompressDebug(payload: {
  originalBytes: number;
  outBytes: number;
  w: number;
  h: number;
  canvasW: number;
  canvasH: number;
  maxEdge: number;
}) {
  if (process.env.NODE_ENV !== 'development') return;
  const pct =
    payload.originalBytes > 0
      ? `${(((payload.originalBytes - payload.outBytes) / payload.originalBytes) * 100).toFixed(1)}%`
      : 'n/a';
  console.debug(
    '[receipt compress]',
    `${payload.originalBytes}B → ${payload.outBytes}B (${pct} vs original); src ${payload.w}×${payload.h}px; canvas ${payload.canvasW}×${payload.canvasH}px; maxEdge ${payload.maxEdge}`
  );
}

/**
 * JPEG under byte cap while respecting {@link RECEIPT_IMAGE_MAX_LONG_EDGE} when downscaling matters.
 * Returns the original File when pixels are already within the long-edge cap **and** size ≤ maxBytes
 * so we skip lossy round-trips where possible.
 */
export async function compressReceiptImageForUpload(
  file: File,
  maxBytes: number = MAX_RECEIPT_UPLOAD_BYTES
): Promise<File> {
  let drawable: CanvasImageSource;
  try {
    drawable = await decodeToDrawable(file);
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error('Could not decode image.');
  }

  const originalBytes = file.size;
  const { w, h } = dimensions(drawable);
  if (w <= 0 || h <= 0) {
    if (drawable instanceof ImageBitmap) drawable.close();
    throw new Error('Invalid image dimensions.');
  }

  if (Math.max(w, h) <= RECEIPT_IMAGE_MAX_LONG_EDGE && file.size <= maxBytes) {
    if (drawable instanceof ImageBitmap) drawable.close();
    return file;
  }

  const MIN_EDGE = 260;
  const SCALE_STEP = 0.8;
  let maxEdge = RECEIPT_IMAGE_MAX_LONG_EDGE;

  try {
    while (maxEdge >= MIN_EDGE) {
      const { cw, ch } = canvasSizeForMaxEdge(w, h, maxEdge);
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context.');
      ctx.drawImage(drawable, 0, 0, cw, ch);

      const blob = await encodeJpegQualityUnderBudget(canvas, maxBytes);
      if (blob) {
        const name = `${baseNameFromFile(file)}.jpg`;
        const out = new File([blob], name, { type: JPEG_MIME, lastModified: Date.now() });
        logReceiptCompressDebug({
          originalBytes,
          outBytes: out.size,
          w,
          h,
          canvasW: cw,
          canvasH: ch,
          maxEdge,
        });
        return out;
      }

      maxEdge = Math.floor(maxEdge * SCALE_STEP);
    }

    for (const edge of [320, 256, 224, 192, 160, 128]) {
      const { cw, ch } = canvasSizeForMaxEdge(w, h, edge);
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context.');
      ctx.drawImage(drawable, 0, 0, cw, ch);
      const blob = await encodeJpegQualityUnderBudget(canvas, maxBytes);
      if (blob) {
        const name = `${baseNameFromFile(file)}.jpg`;
        const out = new File([blob], name, { type: JPEG_MIME, lastModified: Date.now() });
        logReceiptCompressDebug({
          originalBytes,
          outBytes: out.size,
          w,
          h,
          canvasW: cw,
          canvasH: ch,
          maxEdge: edge,
        });
        return out;
      }
    }

    throw new Error(
      'Could not reduce image enough; try a closer photo or fewer items in frame.'
    );
  } finally {
    if (drawable instanceof ImageBitmap) {
      drawable.close();
    }
  }
}
