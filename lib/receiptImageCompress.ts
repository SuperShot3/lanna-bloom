/**
 * Browser-only: resize + JPEG encode so receipt uploads stay under a byte budget.
 * Import only from client components.
 */

import { MAX_RECEIPT_UPLOAD_BYTES } from '@/lib/receiptUploadLimits';

const JPEG_MIME = 'image/jpeg';

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
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
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
    try {
      if (typeof createImageBitmap === 'function') {
        return await createImageBitmap(file);
      }
    } catch {
      // continue
    }
    const jpegBlob = await heicFileToJpegBlob(file);
    if (typeof createImageBitmap === 'function') {
      return await createImageBitmap(jpegBlob);
    }
    return loadImageFromFile(
      new File([jpegBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: JPEG_MIME })
    );
  }

  try {
    if (typeof createImageBitmap === 'function') {
      return await createImageBitmap(file);
    }
  } catch {
    // fall through
  }
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

async function encodeUnderBudget(canvas: HTMLCanvasElement, maxBytes: number): Promise<Blob> {
  const qualities = [0.92, 0.85, 0.78, 0.7, 0.62, 0.55, 0.48, 0.42, 0.36, 0.32, 0.28];
  for (const q of qualities) {
    const blob = await canvasToJpegBlob(canvas, q);
    if (blob && blob.size <= maxBytes) return blob;
  }
  const last = await canvasToJpegBlob(canvas, 0.28);
  if (last && last.size <= maxBytes) return last;
  if (last) return last;
  throw new Error('Could not encode image.');
}

function baseNameFromFile(file: File): string {
  const n = file.name.replace(/\.[^.]+$/, '');
  return n.replace(/[^\w.-]+/g, '-').slice(0, 80) || 'receipt';
}

/**
 * Returns a File suitable for upload: same file if already small enough, else JPEG under maxBytes.
 */
export async function compressReceiptImageForUpload(
  file: File,
  maxBytes: number = MAX_RECEIPT_UPLOAD_BYTES
): Promise<File> {
  if (file.size <= maxBytes) {
    return file;
  }

  let drawable: CanvasImageSource;
  try {
    drawable = await decodeToDrawable(file);
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error('Could not decode image.');
  }

  const { w, h } = dimensions(drawable);
  if (w <= 0 || h <= 0) {
    if (drawable instanceof ImageBitmap) drawable.close();
    throw new Error('Invalid image dimensions.');
  }

  const MIN_EDGE = 400;
  const SCALE_STEP = 0.82;
  let maxEdge = 2400;

  try {
    while (maxEdge >= MIN_EDGE) {
      const { cw, ch } = canvasSizeForMaxEdge(w, h, maxEdge);
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context.');
      ctx.drawImage(drawable, 0, 0, cw, ch);

      const blob = await encodeUnderBudget(canvas, maxBytes);
      if (blob.size <= maxBytes) {
        const name = `${baseNameFromFile(file)}.jpg`;
        return new File([blob], name, { type: JPEG_MIME, lastModified: Date.now() });
      }

      maxEdge = Math.floor(maxEdge * SCALE_STEP);
    }

    for (const edge of [320, 256, 192]) {
      const { cw, ch } = canvasSizeForMaxEdge(w, h, edge);
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context.');
      ctx.drawImage(drawable, 0, 0, cw, ch);
      const blob = await encodeUnderBudget(canvas, maxBytes);
      if (blob.size <= maxBytes) {
        const name = `${baseNameFromFile(file)}.jpg`;
        return new File([blob], name, { type: JPEG_MIME, lastModified: Date.now() });
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
