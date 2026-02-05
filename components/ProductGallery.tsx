'use client';

import { useState } from 'react';
import Image from 'next/image';

const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"%3E%3Crect fill="%23f9f5f0" width="600" height="600"/%3E%3C/svg%3E';

export function ProductGallery({
  images,
  name,
  activeIndex,
  onActiveChange,
}: {
  images: string[];
  name: string;
  activeIndex?: number;
  onActiveChange?: (index: number) => void;
}) {
  const [internalActive, setInternalActive] = useState(0);
  const isControlled = activeIndex !== undefined && onActiveChange !== undefined;
  const active = isControlled ? activeIndex : internalActive;
  const setActive = isControlled ? onActiveChange : setInternalActive;
  const list = images?.length ? images : [FALLBACK_IMAGE];
  const current = list[active] ?? list[0] ?? FALLBACK_IMAGE;

  return (
    <div className="gallery">
      <div className="gallery-main">
        <Image
          src={current}
          alt={name}
          width={600}
          height={600}
          className="gallery-image"
          priority
          sizes="(max-width: 600px) 100vw, 50vw"
          unoptimized={current.startsWith('data:')}
        />
      </div>
      {list.length > 1 && (
        <div className="gallery-thumbs">
          {list.map((src, i) => (
            <button
              key={i}
              type="button"
              className={`thumb ${i === active ? 'active' : ''}`}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
            >
              <Image src={src} alt="" width={80} height={80} className="thumb-img" unoptimized={src.startsWith('data:')} />
            </button>
          ))}
        </div>
      )}
      <style jsx>{`
        .gallery {
          width: 100%;
        }
        .gallery-main {
          position: relative;
          aspect-ratio: 1;
          border-radius: var(--radius);
          overflow: hidden;
          background: var(--pastel-cream);
          margin-bottom: 12px;
        }
        .gallery-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .gallery-thumbs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .thumb {
          flex-shrink: 0;
          width: 64px;
          height: 64px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 2px solid transparent;
          padding: 0;
          background: var(--surface);
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .thumb.active {
          border-color: var(--accent);
        }
        .thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>
    </div>
  );
}
