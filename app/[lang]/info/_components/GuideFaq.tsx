'use client';

import { useState } from 'react';

export type FaqItem = { q: string; a: string };

export function GuideFaq({
  faq,
  title,
}: {
  faq: readonly FaqItem[];
  title: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section
      className="guide-faq-accordion"
      aria-labelledby="guide-faq-accordion-title"
    >
      <div className="guide-faq-accordion-container">
        <h2 id="guide-faq-accordion-title" className="guide-faq-accordion-title">
          {title}
        </h2>
        <div className="guide-faq-accordion-list">
          {faq.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={`guide-faq-accordion-item${isOpen ? ' open' : ''}`}
              >
                <button
                  type="button"
                  className="guide-faq-accordion-question"
                  aria-expanded={isOpen}
                  aria-controls={`guide-faq-answer-${i}`}
                  id={`guide-faq-question-${i}`}
                  onClick={() => toggle(i)}
                >
                  <span className="guide-faq-accordion-question-text">
                    {item.q}
                  </span>
                  <span className="guide-faq-accordion-icon" aria-hidden>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <path
                        d="M3.5 5.25L7 8.75l3.5-3.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
                <div
                  id={`guide-faq-answer-${i}`}
                  className="guide-faq-accordion-answer"
                  role="region"
                  aria-labelledby={`guide-faq-question-${i}`}
                >
                  <div className="guide-faq-accordion-answer-content">
                    {item.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
