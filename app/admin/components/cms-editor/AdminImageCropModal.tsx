'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';

type HandleId =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w';

type CropResult = {
  file: File;
  previewUrl: string;
};

type Props = {
  open: boolean;
  file: File | null;
  title?: string;
  /** Width / height ratio for the crop frame. Defaults to 1 (square). */
  aspect?: number;
  /** When true, frame keeps the configured aspect on resize. Defaults to true. */
  lockAspect?: boolean;
  /** Output max pixel size for the longer crop edge. Defaults to 1600. */
  outputSize?: number;
  /** Output file mime; default image/png. */
  outputMime?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** Filename for the resulting File. Defaults to the source filename. */
  outputFilename?: string;
  onCancel: () => void;
  onApply: (result: CropResult) => void | Promise<void>;
  /** When provided, shows a "Use original" button that returns the original File untouched. */
  onSkip?: () => void;
};

const MIN_CROP_PX = 32;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 6;

const HANDLE_IDS: HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

const HANDLE_CURSORS: Record<HandleId, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getMimeExtension(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

async function loadImageBitmap(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // We return a loaded image; revoke after the caller has used .naturalWidth
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

type DragState =
  | { mode: 'pan'; startX: number; startY: number; originX: number; originY: number }
  | {
      mode: 'move-frame';
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    }
  | {
      mode: 'resize';
      handle: HandleId;
      startX: number;
      startY: number;
      origin: { x: number; y: number; w: number; h: number };
    };

export function AdminImageCropModal({
  open,
  file,
  title = 'Crop image',
  aspect = 1,
  lockAspect = true,
  outputSize = 1600,
  outputMime = 'image/png',
  outputFilename,
  onCancel,
  onApply,
  onSkip,
}: Props) {
  const headingId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ratio = lockAspect ? Math.max(0.01, aspect) : null;

  const recenter = useCallback(
    (img: HTMLImageElement, stage: { w: number; h: number }) => {
      if (!stage.w || !stage.h) return;
      const containScale = Math.min(stage.w / img.naturalWidth, stage.h / img.naturalHeight);
      const displayW = img.naturalWidth * containScale;
      const displayH = img.naturalHeight * containScale;
      const imgX = (stage.w - displayW) / 2;
      const imgY = (stage.h - displayH) / 2;

      let frameW: number;
      let frameH: number;
      if (ratio) {
        const fitW = Math.min(displayW, displayH * ratio);
        frameW = fitW * 0.92;
        frameH = frameW / ratio;
      } else {
        frameW = displayW * 0.92;
        frameH = displayH * 0.92;
      }
      const frameX = (stage.w - frameW) / 2;
      const frameY = (stage.h - frameH) / 2;

      setTransform({ x: imgX, y: imgY, scale: containScale });
      setCrop({ x: frameX, y: frameY, w: frameW, h: frameH });
    },
    [ratio]
  );

  useEffect(() => {
    if (!open || !file) {
      setImage(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setError(null);
    loadImageBitmap(file)
      .then((img) => {
        if (cancelled) return;
        setImage(img);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not read this image.');
      });

    return () => {
      cancelled = true;
    };
  }, [open, file]);

  useEffect(() => {
    if (!open) return;
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setStageSize((current) => {
          if (Math.abs(current.w - width) < 1 && Math.abs(current.h - height) < 1) {
            return current;
          }
          return { w: width, h: height };
        });
      }
    });
    observer.observe(stage);
    const rect = stage.getBoundingClientRect();
    setStageSize({ w: rect.width, h: rect.height });
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (!image || !stageSize.w || !stageSize.h) return;
    recenter(image, stageSize);
  }, [image, stageSize, recenter]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !applying) onCancel();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, applying, onCancel]);

  const displaySize = useMemo(() => {
    if (!image) return { w: 0, h: 0 };
    return {
      w: image.naturalWidth * transform.scale,
      h: image.naturalHeight * transform.scale,
    };
  }, [image, transform.scale]);

  const startPan = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!image) return;
      event.preventDefault();
      (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
      dragRef.current = {
        mode: 'pan',
        startX: event.clientX,
        startY: event.clientY,
        originX: transform.x,
        originY: transform.y,
      };
    },
    [image, transform.x, transform.y]
  );

  const startMoveFrame = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
      (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
      dragRef.current = {
        mode: 'move-frame',
        startX: event.clientX,
        startY: event.clientY,
        originX: crop.x,
        originY: crop.y,
      };
    },
    [crop.x, crop.y]
  );

  const startResize = useCallback(
    (handle: HandleId) => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
      (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
      dragRef.current = {
        mode: 'resize',
        handle,
        startX: event.clientX,
        startY: event.clientY,
        origin: { x: crop.x, y: crop.y, w: crop.w, h: crop.h },
      };
    },
    [crop.x, crop.y, crop.w, crop.h]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;

      if (drag.mode === 'pan') {
        setTransform((current) => ({
          ...current,
          x: drag.originX + dx,
          y: drag.originY + dy,
        }));
        return;
      }

      if (drag.mode === 'move-frame') {
        setCrop((current) => ({
          ...current,
          x: clamp(drag.originX + dx, 0, Math.max(0, stageSize.w - current.w)),
          y: clamp(drag.originY + dy, 0, Math.max(0, stageSize.h - current.h)),
        }));
        return;
      }

      // resize
      const origin = drag.origin;
      let { x, y, w, h } = origin;
      const handle = drag.handle;

      const hasN = handle.includes('n');
      const hasS = handle.includes('s');
      const hasW = handle.includes('w');
      const hasE = handle.includes('e');

      let newX = x;
      let newY = y;
      let newW = w;
      let newH = h;

      if (hasE) newW = Math.max(MIN_CROP_PX, w + dx);
      if (hasS) newH = Math.max(MIN_CROP_PX, h + dy);
      if (hasW) {
        newW = Math.max(MIN_CROP_PX, w - dx);
        newX = x + (w - newW);
      }
      if (hasN) {
        newH = Math.max(MIN_CROP_PX, h - dy);
        newY = y + (h - newH);
      }

      if (ratio) {
        // For corner handles use the larger axis, for edges drive the locked axis from the active edge.
        const drivenByWidth =
          (hasE || hasW) && !(handle === 'n' || handle === 's');
        if (drivenByWidth) {
          newH = newW / ratio;
          if (hasN) newY = y + (h - newH);
        } else {
          newW = newH * ratio;
          if (hasW) newX = x + (w - newW);
        }
      }

      // Clamp inside the stage.
      if (newX < 0) {
        newW += newX;
        newX = 0;
        if (ratio) newH = newW / ratio;
      }
      if (newY < 0) {
        newH += newY;
        newY = 0;
        if (ratio) newW = newH * ratio;
      }
      if (newX + newW > stageSize.w) {
        newW = stageSize.w - newX;
        if (ratio) newH = newW / ratio;
      }
      if (newY + newH > stageSize.h) {
        newH = stageSize.h - newY;
        if (ratio) newW = newH * ratio;
      }

      if (newW < MIN_CROP_PX || newH < MIN_CROP_PX) return;

      setCrop({ x: newX, y: newY, w: newW, h: newH });
    },
    [ratio, stageSize.h, stageSize.w]
  );

  const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try {
      (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
    } catch {
      // already released
    }
  }, []);

  const adjustZoom = useCallback(
    (nextScale: number, focal?: { x: number; y: number }) => {
      if (!image) return;
      const scale = clamp(nextScale, ZOOM_MIN, ZOOM_MAX);
      setTransform((current) => {
        if (scale === current.scale) return current;
        const cx = focal?.x ?? stageSize.w / 2;
        const cy = focal?.y ?? stageSize.h / 2;
        const ratioChange = scale / current.scale;
        return {
          x: cx - (cx - current.x) * ratioChange,
          y: cy - (cy - current.y) * ratioChange,
          scale,
        };
      });
    },
    [image, stageSize.w, stageSize.h]
  );

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      if (!image) return;
      event.preventDefault();
      const rect = stageRef.current?.getBoundingClientRect();
      const focalX = rect ? event.clientX - rect.left : stageSize.w / 2;
      const focalY = rect ? event.clientY - rect.top : stageSize.h / 2;
      const factor = event.deltaY > 0 ? 0.92 : 1.08;
      adjustZoom(transform.scale * factor, { x: focalX, y: focalY });
    },
    [adjustZoom, image, stageSize.h, stageSize.w, transform.scale]
  );

  async function handleApply() {
    if (!image || !file) return;
    setApplying(true);
    setError(null);
    try {
      const srcX = (crop.x - transform.x) / transform.scale;
      const srcY = (crop.y - transform.y) / transform.scale;
      const srcW = crop.w / transform.scale;
      const srcH = crop.h / transform.scale;

      const clampedX = clamp(srcX, 0, Math.max(0, image.naturalWidth - 1));
      const clampedY = clamp(srcY, 0, Math.max(0, image.naturalHeight - 1));
      const clampedW = clamp(srcW, 1, image.naturalWidth - clampedX);
      const clampedH = clamp(srcH, 1, image.naturalHeight - clampedY);

      const scaleFactor = Math.min(1, outputSize / Math.max(clampedW, clampedH));
      const outW = Math.max(1, Math.round(clampedW * scaleFactor));
      const outH = Math.max(1, Math.round(clampedH * scaleFactor));

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      if (outputMime !== 'image/png') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outW, outH);
      }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, clampedX, clampedY, clampedW, clampedH, 0, 0, outW, outH);

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, outputMime, outputMime === 'image/jpeg' ? 0.95 : undefined)
      );
      if (!blob) throw new Error('Could not export cropped image.');

      const baseName = (outputFilename || file.name.replace(/\.[^.]+$/, '') || 'cropped');
      const ext = getMimeExtension(outputMime);
      const result = new File([blob], `${baseName}.${ext}`, { type: outputMime });
      const previewUrl = URL.createObjectURL(blob);
      await onApply({ file: result, previewUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not crop image.');
    } finally {
      setApplying(false);
    }
  }

  if (!open) return null;

  const stageStyle: CSSProperties = {
    cursor: image ? 'grab' : 'default',
  };
  if (dragRef.current?.mode === 'pan') stageStyle.cursor = 'grabbing';

  const imageStyle: CSSProperties = {
    position: 'absolute',
    left: transform.x,
    top: transform.y,
    width: displaySize.w,
    height: displaySize.h,
    userSelect: 'none',
    pointerEvents: 'none',
    maxWidth: 'none',
  };

  return (
    <div
      className="admin-crop-modal-backdrop"
      role="presentation"
      onClick={() => {
        if (!applying) onCancel();
      }}
    >
      <div
        className="admin-crop-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="admin-crop-modal-header">
          <h2 id={headingId} className="admin-crop-modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="admin-crop-modal-close"
            aria-label="Close crop dialog"
            disabled={applying}
            onClick={onCancel}
          >
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </header>

        <div className="admin-crop-modal-body">
          <div
            ref={stageRef}
            className="admin-crop-stage"
            style={stageStyle}
            onPointerDown={startPan}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onWheel={handleWheel}
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.src} alt="" style={imageStyle} draggable={false} />
            ) : null}

            {image && crop.w > 0 ? (
              <div
                className="admin-crop-frame"
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.w,
                  height: crop.h,
                }}
                onPointerDown={startMoveFrame}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                <div className="admin-crop-grid" aria-hidden />
                {HANDLE_IDS.map((handle) => (
                  <div
                    key={handle}
                    className={`admin-crop-handle admin-crop-handle-${handle}`}
                    style={{ cursor: HANDLE_CURSORS[handle] }}
                    onPointerDown={startResize(handle)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  />
                ))}
              </div>
            ) : null}

            {!image && !error ? (
              <p className="admin-crop-empty">Loading image…</p>
            ) : null}
            {error ? <p className="admin-crop-empty admin-crop-error">{error}</p> : null}
          </div>

          <div className="admin-crop-controls">
            <label className="admin-crop-zoom">
              <span>Zoom</span>
              <input
                type="range"
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={0.01}
                value={transform.scale}
                onChange={(event) => adjustZoom(Number(event.target.value))}
                disabled={!image || applying}
              />
            </label>
            <button
              type="button"
              className="admin-crop-btn admin-crop-btn-ghost"
              disabled={!image || applying}
              onClick={() => image && recenter(image, stageSize)}
            >
              Reset
            </button>
            {ratio ? (
              <span className="admin-crop-aspect-hint">Locked to {aspect === 1 ? '1:1' : `${aspect}:1`}</span>
            ) : null}
          </div>
        </div>

        <footer className="admin-crop-modal-footer">
          {onSkip ? (
            <button
              type="button"
              className="admin-crop-btn admin-crop-btn-ghost"
              disabled={applying}
              onClick={onSkip}
            >
              Use original
            </button>
          ) : null}
          <button
            type="button"
            className="admin-crop-btn admin-crop-btn-outline"
            disabled={applying}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="admin-crop-btn admin-crop-btn-primary"
            disabled={!image || applying}
            onClick={handleApply}
          >
            {applying ? 'Cropping…' : 'Apply crop'}
          </button>
        </footer>
      </div>
    </div>
  );
}

export type { CropResult as AdminImageCropResult };
