import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { StorefrontIcon, type StorefrontIconName } from '@/components/icons';

export function ExperienceSection({ lang }: { lang: Locale }) {
  const t = translations[lang].experience;

  const steps: { icon: StorefrontIconName; title: string; desc: string }[] = [
    { icon: 'grid-view', title: t.step1Title, desc: t.step1Desc },
    { icon: 'handyman', title: t.step2Title, desc: t.step2Desc },
    { icon: 'local-shipping', title: t.step3Title, desc: t.step3Desc },
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24" data-home-reveal>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="home-reveal-item mb-12 md:mb-16 text-center">
          <h2 className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-4">
            {t.title}
          </h2>
          <p className="text-stone-500 max-w-2xl mx-auto text-center">
            {t.subtitle}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 sm:gap-10 lg:gap-12 home-reveal-stagger">
          {steps.map((step) => (
            <div key={step.icon} className="home-reveal-item text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#1A3C34]/5 flex items-center justify-center mx-auto mb-6 text-[#1A3C34]">
                <StorefrontIcon name={step.icon} size={40} />
              </div>
              <h3 className="font-[family-name:var(--font-family-display)] text-xl mb-3">
                {step.title}
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
