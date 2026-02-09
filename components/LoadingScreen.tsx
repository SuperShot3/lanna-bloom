'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Loading class should already be added by script in head
    // Just ensure overflow is hidden
    if (typeof document !== 'undefined') {
      if (!document.body.classList.contains('loading')) {
        document.body.classList.add('loading');
      }
      document.body.style.overflow = 'hidden';
    }

    // Check if fonts are loaded
    const checkFontsLoaded = () => {
      if (typeof document === 'undefined') return false;
      
      try {
        // Check if both fonts are loaded
        const dmSansLoaded = document.fonts.check('16px DM Sans');
        const cormorantLoaded = document.fonts.check('16px Cormorant Garamond');
        
        return dmSansLoaded && cormorantLoaded;
      } catch {
        return false;
      }
    };

    // Optimized font loading check
    const hideLoader = () => {
      setIsFadingOut(true);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('loading');
        document.body.classList.remove('loading');
        document.body.style.overflow = '';
      }
      // Reduced fade-out time from 400ms to 200ms
      setTimeout(() => {
        setIsLoading(false);
      }, 200);
    };

    // Wait for fonts to load with optimized timing
    const waitForFonts = async () => {
      if (typeof document === 'undefined') {
        // Fast path: no document, hide immediately
        hideLoader();
        return;
      }

      // Fast path: check if fonts are already loaded
      if (checkFontsLoaded()) {
        // Fonts already loaded, hide immediately
        hideLoader();
        return;
      }

      try {
        // Wait for fonts with a shorter timeout (500ms instead of waiting indefinitely)
        const fontPromise = document.fonts.ready;
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 500));
        
        await Promise.race([fontPromise, timeoutPromise]);
        
        // Check once more, then hide (font-display: swap will handle rendering)
        hideLoader();
      } catch {
        // Fallback: hide quickly after 500ms
        setTimeout(() => {
          hideLoader();
        }, 500);
      }
    };

    // Maximum timeout reduced from 3000ms to 1000ms
    const maxTimeout = setTimeout(() => {
      hideLoader();
    }, 1000);

    waitForFonts();

    return () => {
      clearTimeout(maxTimeout);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('loading');
        document.body.classList.remove('loading');
        document.body.style.overflow = '';
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
