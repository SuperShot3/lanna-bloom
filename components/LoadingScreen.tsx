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
        // Fallback: assume loaded after a delay
        return false;
      }
    };

    // Wait for fonts to load
    const waitForFonts = async () => {
      if (typeof document === 'undefined') {
        setIsFadingOut(true);
        setTimeout(() => {
          setIsLoading(false);
          if (typeof document !== 'undefined') {
            document.documentElement.classList.remove('loading');
            document.body.classList.remove('loading');
          }
        }, 400);
        return;
      }

      try {
        // Wait for fonts to be ready
        await document.fonts.ready;
        
        // Double check fonts are actually loaded
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          if (checkFontsLoaded() || attempts >= 20) {
            clearInterval(checkInterval);
            // Small delay to ensure everything is rendered
            setTimeout(() => {
              setIsFadingOut(true);
              // Remove loading class and restore body scroll
              if (typeof document !== 'undefined') {
                document.documentElement.classList.remove('loading');
                document.body.classList.remove('loading');
                document.body.style.overflow = '';
              }
              setTimeout(() => {
                setIsLoading(false);
              }, 400);
            }, 300);
          }
        }, 100);
      } catch {
        // Fallback: hide after 1.5 seconds
        setTimeout(() => {
          setIsFadingOut(true);
          if (typeof document !== 'undefined') {
            document.documentElement.classList.remove('loading');
            document.body.classList.remove('loading');
            document.body.style.overflow = '';
          }
          setTimeout(() => {
            setIsLoading(false);
          }, 400);
        }, 1500);
      }
    };

    // Also set a maximum timeout to ensure loader disappears
    const maxTimeout = setTimeout(() => {
      setIsFadingOut(true);
      if (typeof document !== 'undefined') {
        document.body.classList.remove('loading');
        document.body.style.overflow = '';
      }
      setTimeout(() => {
        setIsLoading(false);
      }, 400);
    }, 3000);

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
          transition: opacity 0.4s ease-out, visibility 0.4s ease-out;
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
          animation: fadeInUp 0.6s ease-out 0.2s forwards;
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
