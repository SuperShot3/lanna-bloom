import { translations, type Locale } from '@/lib/i18n';
import { StorefrontIcon, type StorefrontIconName } from '@/components/icons';

export function WhyUsSection({ lang }: { lang: Locale }) {
  const t = translations[lang].homeLanding.whyUs;

  const items: { icon: StorefrontIconName; title: string; desc: string }[] = [
    { icon: 'verified', title: t.securePaymentTitle, desc: t.securePaymentDesc },
    { icon: 'local-florist', title: t.localFloristsTitle, desc: t.localFloristsDesc },
    { icon: 'local-shipping', title: t.deliveryAreasTitle, desc: t.deliveryAreasDesc },
    { icon: 'support-agent', title: t.bilingualTitle, desc: t.bilingualDesc },
    { icon: 'edit-note', title: t.messageCardTitle, desc: t.messageCardDesc },
    { icon: 'sms', title: t.trackingTitle, desc: t.trackingDesc },
  ];

  return (
    <section
      className="py-16 sm:py-20 lg:py-24"
      aria-labelledby="home-why-us-title"
      data-home-reveal
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:gap-16">
          <div className="home-reveal-item lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#C5A059] mb-3">
              {t.eyebrow}
            </p>
            <h2
              id="home-why-us-title"
              className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-4 leading-tight"
            >
              {t.title}
            </h2>
            <p className="text-stone-500 leading-relaxed max-w-md">{t.subtitle}</p>
          </div>

          <div className="home-reveal-stagger grid sm:grid-cols-2 gap-x-10">
            {items.map((item, i) => (
              <div
                key={item.icon}
                className={`home-reveal-item flex gap-4 py-6 border-t border-stone-200 ${i < 2 ? 'sm:border-t-0 sm:pt-0' : ''} ${i === 0 ? 'border-t-0 pt-0' : ''}`.trim()}
              >
                <div className="w-11 h-11 rounded-xl bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] flex-shrink-0">
                  <StorefrontIcon name={item.icon} size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-[#1A3C34] mb-1.5">{item.title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
