'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { translations, type Locale } from '@/lib/i18n';
import { SelectionTile } from '@/components/checkout/premium/SelectionTile';
import { getWhatsAppOrderUrl, getLineContactUrl } from '@/lib/messenger';
import { trackMessengerClick } from '@/lib/analytics';
import {
  RECIPIENT_OPTIONS,
  STYLE_OPTIONS,
  COLOR_OPTIONS,
  SIZE_OPTIONS,
  VENUE_OPTIONS,
  BUDGET_OPTIONS,
  MAX_COLORS,
  FREE_TEXT_MAX_LEN,
  type ColorOption,
  type WeddingBouquetAnswers,
  type WeddingBouquetResult,
} from '@/lib/weddingBouquetDesigner/types';
import {
  RECIPIENT_KEY,
  STYLE_KEY,
  STYLE_DESC_KEY,
  COLOR_KEY,
  SIZE_KEY,
  SIZE_DESC_KEY,
  VENUE_KEY,
  BUDGET_KEY,
  label,
  buildBouquetDescriptionFallback,
  buildAiImagePromptFallback,
  buildWhatsAppLeadMessage,
} from '@/lib/weddingBouquetDesigner/templates';

type Screen = 'intro' | 'quiz' | 'result';

const TOTAL_STEPS = 7;

type DraftAnswers = {
  recipient?: WeddingBouquetAnswers['recipient'];
  style?: WeddingBouquetAnswers['style'];
  colors: ColorOption[];
  dressColor: ColorOption | null;
  size?: WeddingBouquetAnswers['size'];
  venue?: WeddingBouquetAnswers['venue'];
  flowersLove: string;
  flowersAvoid: string;
  budget?: WeddingBouquetAnswers['budget'];
};

const EMPTY_ANSWERS: DraftAnswers = {
  colors: [],
  dressColor: null,
  flowersLove: '',
  flowersAvoid: '',
};

function isComplete(a: DraftAnswers): a is WeddingBouquetAnswers {
  return Boolean(a.recipient && a.style && a.colors.length > 0 && a.size && a.venue && a.budget);
}

export function WeddingBouquetDesignerPageClient({ lang }: { lang: Locale }) {
  const t = translations[lang].weddingBouquetDesigner as Record<string, string>;
  const catalogHref = `/${lang}/catalog`;

  const [screen, setScreen] = useState<Screen>('intro');
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<DraftAnswers>(EMPTY_ANSWERS);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WeddingBouquetResult | null>(null);
  const [rateLimitMinutes, setRateLimitMinutes] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const canProceed = useMemo(() => {
    switch (stepIndex) {
      case 0:
        return Boolean(answers.recipient);
      case 1:
        return Boolean(answers.style);
      case 2:
        return answers.colors.length > 0;
      case 3:
        return Boolean(answers.size);
      case 4:
        return Boolean(answers.venue);
      case 5:
        return true;
      case 6:
        return Boolean(answers.budget);
      default:
        return false;
    }
  }, [stepIndex, answers]);

  const submit = useCallback(async () => {
    if (!isComplete(answers)) return;
    setScreen('result');
    setLoading(true);
    setResult(null);
    setRateLimitMinutes(null);
    try {
      const res = await fetch('/api/wedding-bouquet-designer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      });
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}) as Record<string, unknown>);
        const minutes = typeof data.retryAfterMinutes === 'number' ? data.retryAfterMinutes : 10;
        setRateLimitMinutes(minutes);
        return;
      }
      const data = await res.json().catch(() => null);
      if (data && typeof data.description === 'string' && typeof data.aiImagePrompt === 'string') {
        setResult({ description: data.description, aiImagePrompt: data.aiImagePrompt });
      } else {
        setResult({
          description: buildBouquetDescriptionFallback(answers, t),
          aiImagePrompt: buildAiImagePromptFallback(answers, t),
        });
      }
    } catch {
      setResult({
        description: buildBouquetDescriptionFallback(answers, t),
        aiImagePrompt: buildAiImagePromptFallback(answers, t),
      });
    } finally {
      setLoading(false);
    }
  }, [answers, t]);

  const goNext = useCallback(() => {
    if (!canProceed) return;
    if (stepIndex === TOTAL_STEPS - 1) {
      void submit();
      return;
    }
    setStepIndex((i) => i + 1);
  }, [canProceed, stepIndex, submit]);

  const goBack = useCallback(() => {
    if (stepIndex === 0) {
      setScreen('intro');
      return;
    }
    setStepIndex((i) => i - 1);
  }, [stepIndex]);

  const restart = useCallback(() => {
    setScreen('intro');
    setStepIndex(0);
    setAnswers(EMPTY_ANSWERS);
    setResult(null);
    setRateLimitMinutes(null);
    setCopied(false);
  }, []);

  const toggleColor = useCallback((c: ColorOption) => {
    setAnswers((prev) => {
      const has = prev.colors.includes(c);
      if (has) return { ...prev, colors: prev.colors.filter((x) => x !== c) };
      if (prev.colors.length >= MAX_COLORS) return prev;
      return { ...prev, colors: [...prev.colors, c] };
    });
  }, []);

  const copyPrompt = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.aiImagePrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the prompt text is still visible to select manually
    }
  }, [result]);

  const whatsAppMessage = useMemo(() => {
    if (!result || !isComplete(answers)) return null;
    return buildWhatsAppLeadMessage(answers, result.description, t, t.ctaWhatsapp);
  }, [answers, result, t]);

  const whatsAppUrl = useMemo(
    () => (whatsAppMessage ? getWhatsAppOrderUrl(whatsAppMessage) : null),
    [whatsAppMessage]
  );

  const onWhatsAppClick = useCallback(() => {
    if (!whatsAppUrl) return;
    trackMessengerClick({
      channel: 'whatsapp',
      page_location: 'wedding_bouquet_designer',
      link_url: whatsAppUrl,
    });
  }, [whatsAppUrl]);

  const onLineClick = useCallback(async () => {
    if (!whatsAppMessage) return;
    try {
      await navigator.clipboard.writeText(whatsAppMessage);
    } catch {
      // ignore — the LINE contact link still opens
    }
    const lineUrl = getLineContactUrl();
    trackMessengerClick({ channel: 'line', page_location: 'wedding_bouquet_designer', link_url: lineUrl });
  }, [whatsAppMessage]);

  return (
    <main className="wbd-page">
      <section className="wbd-hero">
        <h1 className="wbd-h1">{t.h1}</h1>
        <p className="wbd-intro">{t.intro}</p>
      </section>

      <section className="wbd-how">
        <h2 className="wbd-section-title">{t.howItWorksTitle}</h2>
        <div className="wbd-how-grid">
          <div className="wbd-how-step">
            <h3>{t.howItWorksStep1Title}</h3>
            <p>{t.howItWorksStep1Text}</p>
          </div>
          <div className="wbd-how-step">
            <h3>{t.howItWorksStep2Title}</h3>
            <p>{t.howItWorksStep2Text}</p>
          </div>
          <div className="wbd-how-step">
            <h3>{t.howItWorksStep3Title}</h3>
            <p>{t.howItWorksStep3Text}</p>
          </div>
        </div>
      </section>

      <section className="wbd-card">
        {screen === 'intro' && (
          <div className="wbd-intro-screen">
            <button type="button" className="wbd-btn-primary" onClick={() => setScreen('quiz')}>
              {t.startButton}
            </button>
          </div>
        )}

        {screen === 'quiz' && (
          <div>
            <div className="wbd-progress-track" aria-hidden>
              <div
                className="wbd-progress-fill"
                style={{ width: `${((stepIndex + 1) / TOTAL_STEPS) * 100}%` }}
              />
            </div>
            <p className="wbd-step-indicator">
              {t.stepIndicator.replace('{current}', String(stepIndex + 1)).replace('{total}', String(TOTAL_STEPS))}
            </p>

            {stepIndex === 0 && (
              <div>
                <h2 className="wbd-step-title">{t.step1Title}</h2>
                <p className="wbd-step-subtitle">{t.step1Subtitle}</p>
                <div className="wbd-grid">
                  {RECIPIENT_OPTIONS.map((o) => (
                    <SelectionTile
                      key={o}
                      selected={answers.recipient === o}
                      title={label(t, RECIPIENT_KEY[o])}
                      onClick={() => setAnswers((prev) => ({ ...prev, recipient: o }))}
                    />
                  ))}
                </div>
              </div>
            )}

            {stepIndex === 1 && (
              <div>
                <h2 className="wbd-step-title">{t.step2Title}</h2>
                <p className="wbd-step-subtitle">{t.step2Subtitle}</p>
                <div className="wbd-grid">
                  {STYLE_OPTIONS.map((o) => (
                    <SelectionTile
                      key={o}
                      selected={answers.style === o}
                      title={label(t, STYLE_KEY[o])}
                      subtitle={label(t, STYLE_DESC_KEY[o])}
                      onClick={() => setAnswers((prev) => ({ ...prev, style: o }))}
                    />
                  ))}
                </div>
              </div>
            )}

            {stepIndex === 2 && (
              <div>
                <h2 className="wbd-step-title">{t.step3Title}</h2>
                <p className="wbd-step-subtitle">{t.colorHintMax}</p>
                <div className="wbd-grid wbd-grid--compact">
                  {COLOR_OPTIONS.map((o) => (
                    <SelectionTile
                      key={o}
                      compact
                      selected={answers.colors.includes(o)}
                      title={label(t, COLOR_KEY[o])}
                      disabled={!answers.colors.includes(o) && answers.colors.length >= MAX_COLORS}
                      onClick={() => toggleColor(o)}
                    />
                  ))}
                </div>
                <h3 className="wbd-substep-title">{t.dressColorLabel}</h3>
                <p className="wbd-step-subtitle">{t.dressColorHint}</p>
                <div className="wbd-grid wbd-grid--compact">
                  {COLOR_OPTIONS.map((o) => (
                    <SelectionTile
                      key={`dress-${o}`}
                      compact
                      selected={answers.dressColor === o}
                      title={label(t, COLOR_KEY[o])}
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          dressColor: prev.dressColor === o ? null : o,
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {stepIndex === 3 && (
              <div>
                <h2 className="wbd-step-title">{t.step4Title}</h2>
                <p className="wbd-step-subtitle">{t.step4Subtitle}</p>
                <div className="wbd-grid">
                  {SIZE_OPTIONS.map((o) => (
                    <SelectionTile
                      key={o}
                      selected={answers.size === o}
                      title={label(t, SIZE_KEY[o])}
                      subtitle={label(t, SIZE_DESC_KEY[o])}
                      onClick={() => setAnswers((prev) => ({ ...prev, size: o }))}
                    />
                  ))}
                </div>
              </div>
            )}

            {stepIndex === 4 && (
              <div>
                <h2 className="wbd-step-title">{t.step5Title}</h2>
                <p className="wbd-step-subtitle">{t.step5Subtitle}</p>
                <div className="wbd-grid">
                  {VENUE_OPTIONS.map((o) => (
                    <SelectionTile
                      key={o}
                      selected={answers.venue === o}
                      title={label(t, VENUE_KEY[o])}
                      onClick={() => setAnswers((prev) => ({ ...prev, venue: o }))}
                    />
                  ))}
                </div>
              </div>
            )}

            {stepIndex === 5 && (
              <div>
                <h2 className="wbd-step-title">{t.step6Title}</h2>
                <p className="wbd-step-subtitle">{t.step6Subtitle}</p>
                <label className="wbd-field-label" htmlFor="flowersLove">
                  {t.flowersLoveLabel} <span className="wbd-optional">({t.optionalHint})</span>
                </label>
                <input
                  id="flowersLove"
                  type="text"
                  className="wbd-input"
                  maxLength={FREE_TEXT_MAX_LEN}
                  placeholder={t.flowersLovePlaceholder}
                  value={answers.flowersLove}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, flowersLove: e.target.value }))}
                />
                <label className="wbd-field-label" htmlFor="flowersAvoid">
                  {t.flowersAvoidLabel} <span className="wbd-optional">({t.optionalHint})</span>
                </label>
                <input
                  id="flowersAvoid"
                  type="text"
                  className="wbd-input"
                  maxLength={FREE_TEXT_MAX_LEN}
                  placeholder={t.flowersAvoidPlaceholder}
                  value={answers.flowersAvoid}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, flowersAvoid: e.target.value }))}
                />
              </div>
            )}

            {stepIndex === 6 && (
              <div>
                <h2 className="wbd-step-title">{t.step7Title}</h2>
                <p className="wbd-step-subtitle">{t.step7Subtitle}</p>
                <div className="wbd-grid">
                  {BUDGET_OPTIONS.map((o) => (
                    <SelectionTile
                      key={o}
                      selected={answers.budget === o}
                      title={label(t, BUDGET_KEY[o])}
                      onClick={() => setAnswers((prev) => ({ ...prev, budget: o }))}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="wbd-nav">
              <button type="button" className="wbd-btn-secondary" onClick={goBack}>
                {t.backButton}
              </button>
              <button type="button" className="wbd-btn-primary" onClick={goNext} disabled={!canProceed}>
                {stepIndex === TOTAL_STEPS - 1 ? t.startButton : t.nextButton}
              </button>
            </div>
          </div>
        )}

        {screen === 'result' && (
          <div>
            <h2 className="wbd-step-title">{t.resultTitle}</h2>

            {rateLimitMinutes != null && (
              <p className="wbd-error">
                {t.resultRateLimited.replace('{minutes}', String(rateLimitMinutes))}
              </p>
            )}

            {rateLimitMinutes == null && loading && <p className="wbd-loading">{t.resultLoading}</p>}

            {rateLimitMinutes == null && !loading && result && (
              <div>
                <h3 className="wbd-substep-title">{t.descriptionLabel}</h3>
                <p className="wbd-result-text">{result.description}</p>

                <h3 className="wbd-substep-title">{t.aiPromptLabel}</h3>
                <p className="wbd-step-subtitle">{t.aiPromptHint}</p>
                <p className="wbd-result-text wbd-result-prompt">{result.aiImagePrompt}</p>
                <button type="button" className="wbd-btn-secondary" onClick={copyPrompt}>
                  {copied ? t.copyPromptCopied : t.copyPromptButton}
                </button>

                <div className="wbd-cta-block">
                  <a
                    className="wbd-btn-primary wbd-btn-cta"
                    href={whatsAppUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onWhatsAppClick}
                  >
                    {t.ctaWhatsapp}
                  </a>
                  <a
                    className="wbd-line-link"
                    href={getLineContactUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onLineClick}
                  >
                    {t.ctaLine}
                  </a>
                  <p className="wbd-step-subtitle">{t.ctaLineHint}</p>
                </div>
              </div>
            )}

            <button type="button" className="wbd-btn-secondary wbd-restart" onClick={restart}>
              {t.restartButton}
            </button>
          </div>
        )}
      </section>

      <section className="wbd-faq">
        <h2 className="wbd-section-title">{t.faqTitle}</h2>
        {[1, 2, 3, 4, 5].map((i) => (
          <div className="wbd-faq-item" key={i}>
            <h3>{t[`faq${i}Q`]}</h3>
            <p>{t[`faq${i}A`]}</p>
          </div>
        ))}
      </section>

      <section className="wbd-catalog-link">
        <p>
          {t.exploreCatalogText}{' '}
          <Link href={catalogHref}>{t.exploreCatalogLinkLabel}</Link>
        </p>
      </section>

      <style jsx>{`
        .wbd-page {
          max-width: 720px;
          margin: 0 auto;
          padding: var(--space-8) var(--space-4) var(--space-16);
        }
        .wbd-hero {
          text-align: center;
          margin-bottom: var(--space-10);
        }
        .wbd-h1 {
          font-family: var(--font-family-display);
          font-size: 2rem;
          color: var(--text);
          margin-bottom: var(--space-3);
        }
        .wbd-intro {
          color: var(--text-muted);
          font-size: 1rem;
          line-height: 1.6;
        }
        .wbd-section-title {
          font-family: var(--font-family-display);
          font-size: 1.375rem;
          color: var(--text);
          margin-bottom: var(--space-4);
        }
        .wbd-how {
          margin-bottom: var(--space-10);
        }
        .wbd-how-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: var(--space-4);
        }
        .wbd-how-step h3 {
          font-size: 0.95rem;
          color: var(--text);
          margin-bottom: var(--space-2);
        }
        .wbd-how-step p {
          font-size: 0.875rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .wbd-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: var(--space-8);
          margin-bottom: var(--space-12);
        }
        .wbd-intro-screen {
          text-align: center;
          padding: var(--space-6) 0;
        }
        .wbd-progress-track {
          height: 6px;
          border-radius: 999px;
          background: var(--pastel-cream);
          overflow: hidden;
          margin-bottom: var(--space-3);
        }
        .wbd-progress-fill {
          height: 100%;
          background: var(--primary, #1a3c34);
          transition: width 0.2s ease;
        }
        .wbd-step-indicator {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin-bottom: var(--space-6);
        }
        .wbd-step-title {
          font-family: var(--font-family-display);
          font-size: 1.25rem;
          color: var(--text);
          margin-bottom: var(--space-2);
        }
        .wbd-substep-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
          margin: var(--space-6) 0 var(--space-2);
        }
        .wbd-step-subtitle {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: var(--space-4);
        }
        .wbd-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--space-3);
        }
        .wbd-grid--compact {
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        }
        .wbd-field-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text);
          margin: var(--space-4) 0 var(--space-2);
        }
        .wbd-optional {
          font-weight: 400;
          color: var(--text-muted);
        }
        .wbd-input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 0.9375rem;
          color: var(--text);
          background: var(--surface);
        }
        .wbd-nav {
          display: flex;
          justify-content: space-between;
          gap: var(--space-3);
          margin-top: var(--space-8);
        }
        .wbd-btn-primary {
          background: var(--primary, #1a3c34);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          padding: 12px 24px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
        }
        .wbd-btn-primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .wbd-btn-secondary {
          background: var(--surface);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 12px 24px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
        }
        .wbd-loading {
          color: var(--text-muted);
          padding: var(--space-6) 0;
        }
        .wbd-error {
          color: var(--color-destructive, #dc2626);
          background: color-mix(in srgb, var(--color-destructive, #dc2626) 8%, transparent);
          border-radius: var(--radius-sm);
          padding: var(--space-4);
        }
        .wbd-result-text {
          color: var(--text);
          line-height: 1.6;
          background: var(--pastel-cream);
          border-radius: var(--radius-sm);
          padding: var(--space-4);
          white-space: pre-wrap;
        }
        .wbd-result-prompt {
          font-size: 0.875rem;
        }
        .wbd-cta-block {
          margin-top: var(--space-8);
          text-align: center;
        }
        .wbd-btn-cta {
          display: inline-block;
          text-decoration: none;
          margin-bottom: var(--space-3);
        }
        .wbd-line-link {
          display: block;
          color: var(--accent-border, var(--accent));
          font-size: 0.9375rem;
          font-weight: 600;
          text-decoration: none;
          margin-bottom: var(--space-2);
        }
        .wbd-restart {
          display: block;
          margin: var(--space-8) auto 0;
        }
        .wbd-faq {
          margin-bottom: var(--space-10);
        }
        .wbd-faq-item {
          margin-bottom: var(--space-5);
        }
        .wbd-faq-item h3 {
          font-size: 0.9375rem;
          color: var(--text);
          margin-bottom: var(--space-2);
        }
        .wbd-faq-item p {
          font-size: 0.875rem;
          color: var(--text-muted);
          line-height: 1.6;
        }
        .wbd-catalog-link {
          text-align: center;
          font-size: 0.9375rem;
          color: var(--text-muted);
        }
        .wbd-catalog-link a {
          color: var(--accent-border, var(--accent));
          font-weight: 600;
        }
      `}</style>
    </main>
  );
}
