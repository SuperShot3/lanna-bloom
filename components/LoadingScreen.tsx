'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

function checkCriticalFontsLoaded(): boolean {
  if (typeof document === 'undefined') return false;

  try {
    const mulishLoaded = document.fonts.check('16px Mulish');
    const arimaLoaded = document.fonts.check('16px "Arima Madurai"');
    return mulishLoaded && arimaLoaded;
  } catch {
    return false;
  }
}

export function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (!document.body.classList.contains('loading')) {
        document.body.classList.add('loading');
      }
      document.documentElement.classList.add('loading-lock');
    }

    const hideLoader = () => {
      setIsFadingOut(true);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('loading');
        document.body.classList.remove('loading');
        document.documentElement.classList.remove('loading-lock');
      }
      setTimeout(() => {
        setIsLoading(false);
      }, 200);
    };

    const waitForFonts = async () => {
      if (typeof document === 'undefined') {
        hideLoader();
        return;
      }

      if (checkCriticalFontsLoaded()) {
        hideLoader();
        return;
      }

      try {
        const fontPromise = document.fonts.ready;
        const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 800));

        await Promise.race([fontPromise, timeoutPromise]);

        if (checkCriticalFontsLoaded()) {
          hideLoader();
          return;
        }

        hideLoader();
      } catch {
        setTimeout(() => {
          hideLoader();
        }, 800);
      }
    };

    const maxTimeout = setTimeout(() => {
      hideLoader();
    }, 1500);

    waitForFonts();

    return () => {
      clearTimeout(maxTimeout);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('loading');
        document.body.classList.remove('loading');
        document.documentElement.classList.remove('loading-lock');
      }
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div className={`loading-screen ${isFadingOut ? 'loading-screen--fading' : ''}`}>
      <div className="loading-screen-content">
        <div className="loading-screen-logo">
          <Image
            src="/logo_full_master.png"
            alt="Lanna Bloom"
            width={120}
            height={100}
            priority
            unoptimized
          />
        </div>
        <div className="loading-screen-spinner">
          <div className="spinner-dot"></div>
          <div className="spinner-dot"></div>
          <div className="spinner-dot"></div>
        </div>
      </div>
      <style jsx>{`
        .loading-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--bg, #fdfbf9);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 1;
          transition: opacity 0.2s ease-out, visibility 0.2s ease-out;
          visibility: visible;
        }
        .loading-screen--fading {
          opacity: 0;
          visibility: hidden;
        }
        .loading-screen-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
        }
        .loading-screen-logo {
          opacity: 0;
          animation: fadeInUp 0.4s ease-out 0.1s forwards;
        }
        .loading-screen-spinner {
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: center;
        }
        .spinner-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--accent, #c4a77d);
          opacity: 0;
          animation: dotBounce 1.4s ease-in-out infinite;
        }
        .spinner-dot:nth-child(1) {
          animation-delay: 0s;
        }
        .spinner-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .spinner-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes dotBounce {
          0%,
          80%,
          100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          40% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}
