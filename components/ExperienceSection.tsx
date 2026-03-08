import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export function ExperienceSection({ lang }: { lang: Locale }) {
  const t = translations[lang].experience;

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="font-[family-name:var(--font-family-display)] text-4xl text-[#1A3C34] mb-4">
            {t.title}
          </h2>
          <p className="text-stone-500 max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 sm:gap-10">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#1A3C34]/5 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-[#1A3C34]">
                grid_view
              </span>
            </div>
            <h3 className="font-[family-name:var(--font-family-display)] text-xl mb-3">
              {t.step1Title}
            </h3>
            <p className="text-stone-500 text-sm leading-relaxed">{t.step1Desc}</p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#1A3C34]/5 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-[#1A3C34]">
                handyman
              </span>
            </div>
            <h3 className="font-[family-name:var(--font-family-display)] text-xl mb-3">
              {t.step2Title}
            </h3>
            <p className="text-stone-500 text-sm leading-relaxed">{t.step2Desc}</p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#1A3C34]/5 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-[#1A3C34]">
                local_shipping
              </span>
            </div>
            <h3 className="font-[family-name:var(--font-family-display)] text-xl mb-3">
              {t.step3Title}
            </h3>
            <p className="text-stone-500 text-sm leading-relaxed">{t.step3Desc}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
