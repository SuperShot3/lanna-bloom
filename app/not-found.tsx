import Link from 'next/link';
import { defaultLocale } from '@/lib/i18n';

export default function NotFound() {
  return (
    <>
      <div className="nf-page">
        <span className="nf-bg-petal nf-bp1" aria-hidden>🌸</span>
        <span className="nf-bg-petal nf-bp2" aria-hidden>🌷</span>
        <span className="nf-bg-petal nf-bp3" aria-hidden>🌺</span>
        <span className="nf-bg-petal nf-bp4" aria-hidden>🌸</span>
        <span className="nf-bg-petal nf-bp5" aria-hidden>🌼</span>
        <span className="nf-bg-petal nf-bp6" aria-hidden>🌷</span>

        <nav className="nf-nav">
          <Link href={`/${defaultLocale}`} className="nf-logo">
            Lanna Bloom
          </Link>
          <Link href={`/${defaultLocale}`} className="nf-home-link">
            ← Back to shop
          </Link>
        </nav>

        <div className="nf-container">
          <div className="nf-flower-scene">
            <span className="nf-code" aria-hidden>404</span>

            <div className="nf-flower nf-flower-1">
              <div className="nf-bloom">
                <svg className="nf-petal-ring" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <ellipse cx="30" cy="12" rx="7" ry="13" fill="var(--nf-rose)" opacity="0.9" transform="rotate(0 30 30)"/>
                  <ellipse cx="30" cy="12" rx="7" ry="13" fill="var(--nf-rose)" opacity="0.85" transform="rotate(45 30 30)"/>
                  <ellipse cx="30" cy="12" rx="7" ry="13" fill="var(--nf-rose-soft)" opacity="0.88" transform="rotate(90 30 30)"/>
                  <ellipse cx="30" cy="12" rx="7" ry="13" fill="var(--nf-rose)" opacity="0.82" transform="rotate(135 30 30)"/>
                  <ellipse cx="30" cy="12" rx="7" ry="13" fill="var(--nf-rose-soft)" opacity="0.87" transform="rotate(180 30 30)"/>
                  <ellipse cx="30" cy="12" rx="7" ry="13" fill="var(--nf-rose)" opacity="0.83" transform="rotate(225 30 30)"/>
                  <ellipse cx="30" cy="12" rx="7" ry="13" fill="var(--nf-rose-soft)" opacity="0.9" transform="rotate(270 30 30)"/>
                  <ellipse cx="30" cy="12" rx="7" ry="13" fill="var(--nf-rose)" opacity="0.86" transform="rotate(315 30 30)"/>
                  <circle cx="30" cy="30" r="8" fill="var(--nf-center)"/>
                  <circle cx="30" cy="30" r="4.5" fill="var(--nf-center-dark)"/>
                </svg>
              </div>
              <div className="nf-stem" style={{ position: 'relative' }}>
                <div className="nf-leaf nf-leaf-right" style={{ bottom: '60px' }} />
                <div className="nf-leaf nf-leaf-left" style={{ bottom: '35px' }} />
              </div>
            </div>

            <div className="nf-flower nf-flower-2">
              <div className="nf-bloom">
                <svg className="nf-petal-ring" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <ellipse cx="25" cy="10" rx="6" ry="12" fill="var(--nf-blush)" opacity="0.9" transform="rotate(0 25 25)"/>
                  <ellipse cx="25" cy="10" rx="6" ry="12" fill="var(--nf-blush-dark)" opacity="0.85" transform="rotate(60 25 25)"/>
                  <ellipse cx="25" cy="10" rx="6" ry="12" fill="var(--nf-blush)" opacity="0.9" transform="rotate(120 25 25)"/>
                  <ellipse cx="25" cy="10" rx="6" ry="12" fill="var(--nf-blush-dark)" opacity="0.85" transform="rotate(180 25 25)"/>
                  <ellipse cx="25" cy="10" rx="6" ry="12" fill="var(--nf-blush)" opacity="0.88" transform="rotate(240 25 25)"/>
                  <ellipse cx="25" cy="10" rx="6" ry="12" fill="var(--nf-blush-dark)" opacity="0.85" transform="rotate(300 25 25)"/>
                  <circle cx="25" cy="25" r="7" fill="var(--nf-center)"/>
                  <circle cx="25" cy="25" r="4" fill="var(--nf-center-dark)"/>
                </svg>
                <div className="nf-falling-petal" style={{ background: 'var(--nf-blush)', top: '10px', left: '5px', animationDelay: '2s' }} />
                <div className="nf-falling-petal" style={{ background: 'var(--nf-blush-dark)', top: '8px', left: '28px', animationDelay: '4s' }} />
              </div>
              <div className="nf-stem" style={{ position: 'relative' }}>
                <div className="nf-leaf nf-leaf-right" style={{ bottom: '70px' }} />
              </div>
            </div>

            <div className="nf-flower nf-flower-3">
              <div className="nf-bloom">
                <svg className="nf-petal-ring" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <ellipse cx="25" cy="9" rx="5.5" ry="11" fill="var(--nf-cream)" opacity="0.95" transform="rotate(0 25 25)"/>
                  <ellipse cx="25" cy="9" rx="5.5" ry="11" fill="var(--nf-cream-soft)" opacity="0.9" transform="rotate(51.4 25 25)"/>
                  <ellipse cx="25" cy="9" rx="5.5" ry="11" fill="var(--nf-cream)" opacity="0.93" transform="rotate(102.8 25 25)"/>
                  <ellipse cx="25" cy="9" rx="5.5" ry="11" fill="var(--nf-cream-soft)" opacity="0.9" transform="rotate(154.2 25 25)"/>
                  <ellipse cx="25" cy="9" rx="5.5" ry="11" fill="var(--nf-cream)" opacity="0.92" transform="rotate(205.6 25 25)"/>
                  <ellipse cx="25" cy="9" rx="5.5" ry="11" fill="var(--nf-cream-soft)" opacity="0.9" transform="rotate(257 25 25)"/>
                  <ellipse cx="25" cy="9" rx="5.5" ry="11" fill="var(--nf-cream)" opacity="0.94" transform="rotate(308.4 25 25)"/>
                  <circle cx="25" cy="25" r="6.5" fill="var(--nf-center)"/>
                  <circle cx="25" cy="25" r="4" fill="var(--nf-center-dark)"/>
                </svg>
              </div>
              <div className="nf-stem" style={{ position: 'relative' }}>
                <div className="nf-leaf nf-leaf-left" style={{ bottom: '45px' }} />
              </div>
            </div>

            <div className="nf-flower nf-flower-4">
              <div className="nf-bloom">
                <svg className="nf-petal-ring" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <ellipse cx="30" cy="11" rx="7.5" ry="14" fill="var(--nf-accent-soft)" opacity="0.88" transform="rotate(0 30 30)"/>
                  <ellipse cx="30" cy="11" rx="7.5" ry="14" fill="var(--nf-accent)" opacity="0.82" transform="rotate(45 30 30)"/>
                  <ellipse cx="30" cy="11" rx="7.5" ry="14" fill="var(--nf-accent-soft)" opacity="0.87" transform="rotate(90 30 30)"/>
                  <ellipse cx="30" cy="11" rx="7.5" ry="14" fill="var(--nf-accent)" opacity="0.83" transform="rotate(135 30 30)"/>
                  <ellipse cx="30" cy="11" rx="7.5" ry="14" fill="var(--nf-accent-soft)" opacity="0.86" transform="rotate(180 30 30)"/>
                  <ellipse cx="30" cy="11" rx="7.5" ry="14" fill="var(--nf-accent)" opacity="0.84" transform="rotate(225 30 30)"/>
                  <ellipse cx="30" cy="11" rx="7.5" ry="14" fill="var(--nf-accent-soft)" opacity="0.88" transform="rotate(270 30 30)"/>
                  <ellipse cx="30" cy="11" rx="7.5" ry="14" fill="var(--nf-accent)" opacity="0.82" transform="rotate(315 30 30)"/>
                  <circle cx="30" cy="30" r="8.5" fill="var(--nf-center)"/>
                  <circle cx="30" cy="30" r="5" fill="var(--nf-center-dark)"/>
                </svg>
                <div className="nf-falling-petal" style={{ background: 'var(--nf-accent-soft)', top: '12px', left: '8px', animationDelay: '1s' }} />
              </div>
              <div className="nf-stem" style={{ position: 'relative' }}>
                <div className="nf-leaf nf-leaf-right" style={{ bottom: '50px' }} />
                <div className="nf-leaf nf-leaf-left" style={{ bottom: '80px' }} />
              </div>
            </div>

            <div className="nf-ground" />
          </div>

          <div className="nf-message">
            <h1>Oh no… this page wilted away</h1>
            <p>It seems the page you were looking for has drifted off like petals in the breeze. Let&apos;s get you back to something beautiful.</p>
          </div>

          <Link href={`/${defaultLocale}`} className="nf-btn">
            Browse our bouquets
          </Link>
        </div>
      </div>
    </>
  );
}
