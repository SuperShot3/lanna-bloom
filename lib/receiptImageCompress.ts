/**
 * Browser-only: resize + JPEG encode so receipt uploads stay under a byte budget.
 * Import only from client components.
 */

const JPEG_MIME = 'image/jpeg';

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

async function decodeToDrawable(file: File): Promise<CanvasImageSource> {
  try {
    if (typeof createImageBitmap === 'function') {
      return await createImageBitmap(file);
    }
  } catch {
    // fall through to Image()
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

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), JPEG_MIME, quality);
  });
}

async function encodeUnderBudget(
  canvas: HTMLCanvasElement,
  maxBytes: number
): Promise<Blob> {
  const qualities = [0.92, 0.85, 0.78, 0.7, 0.62, 0.55, 0.5];
  for (const q of qualities) {
    const blob = await canvasToJpegBlob(canvas, q);
    if (blob && blob.size <= maxBytes) return blob;
  }
  const last = await canvasToJpegBlob(canvas, 0.5);
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
  maxBytes: number
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

  const MIN_EDGE = 960;
  const SCALE_STEP = 0.85;
  let maxEdge = 2048;

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

    throw new Error(
      'Could not reduce image enough; try a closer photo or fewer items in frame.'
    );
  } finally {
    if (drawable instanceof ImageBitmap) {
      drawable.close();
    }
  }
}
