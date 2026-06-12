'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './ArticleListenPlayer.module.css';

type Props = {
  /** Public URL path (e.g. /content/voice/file.mp3) */
  src: string;
  lang: string;
};

/**
 * Defers loading the audio file until the user chooses to play.
 * The `src` attribute is omitted until the first button click, so the file is not fetched with the page.
 */
export function ArticleListenPlayer({ src, lang }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active || !audioRef.current) return;
    const el = audioRef.current;
    const tryPlay = () => {
      el.play().catch(() => {});
    };
    if (el.readyState >= 2) tryPlay();
    else el.addEventListener('canplay', tryPlay, { once: true });
  }, [active]);

  const title = lang === 'th' ? 'ฟังบทความนี้' : 'Listen to this article';
  const hint =
    lang === 'th'
      ? 'ไฟล์เสียงจะเริ่มโหลดเมื่อคุณกดเล่นเท่านั้น — ไม่โหลดพร้อมหน้าเว็บ'
      : 'Audio only starts loading when you press play — it does not download with the page.';

  return (
    <section className={styles.listenWrap} aria-label={title}>
      <div className={styles.listenCard}>
        <div className={styles.listenHeader}>
          <span className={styles.listenIcon} aria-hidden>
            🎧
          </span>
          <div>
            <p className={styles.listenTitle}>{title}</p>
            <p className={styles.listenHint}>{hint}</p>
          </div>
        </div>
        {!active ? (
          <button type="button" className={styles.listenPlay} onClick={() => setActive(true)}>
            {lang === 'th' ? 'เล่นเสียง' : 'Play audio'}
          </button>
        ) : (
          <audio
            ref={audioRef}
            className={styles.listenAudio}
            src={src}
            controls
            preload="none"
          />
        )}
      </div>
    </section>
  );
}
