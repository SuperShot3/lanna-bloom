'use client';

import { useState } from 'react';

type Lang = 'th' | 'en';

const COPY: Record<Lang, { title: string; body: string; langGroup: string; thai: string; english: string }> = {
  th: {
    title: 'คำขอนี้ไม่พร้อมใช้งานแล้ว',
    body: 'กรุณาติดต่อผู้ประสานงานเพื่อรับรายละเอียดล่าสุด',
    langGroup: 'เลือกภาษา',
    thai: 'ไทย',
    english: 'English',
  },
  en: {
    title: 'This request is no longer available',
    body: 'Please contact the coordinator for the latest details.',
    langGroup: 'Language',
    thai: 'ไทย',
    english: 'English',
  },
};

export function SupplierTaskUnavailable() {
  const [lang, setLang] = useState<Lang>('th');
  const t = COPY[lang];

  return (
    <div className="supplier-task-shell">
      <main className="supplier-task-card supplier-task-unavailable">
        <div className="supplier-task-toolbar">
          <div className="supplier-task-lang" role="group" aria-label={t.langGroup}>
            <button
              type="button"
              className={`supplier-task-lang-btn ${lang === 'th' ? 'is-active' : ''}`}
              onClick={() => setLang('th')}
              aria-pressed={lang === 'th'}
            >
              {t.thai}
            </button>
            <button
              type="button"
              className={`supplier-task-lang-btn ${lang === 'en' ? 'is-active' : ''}`}
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
            >
              {t.english}
            </button>
          </div>
        </div>
        <h1>{t.title}</h1>
        <p>{t.body}</p>
      </main>
    </div>
  );
}
