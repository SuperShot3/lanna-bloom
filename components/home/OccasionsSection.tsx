import Link from 'next/link';
import { translations, type Locale } from '@/lib/i18n';
import { CATALOG_OCCASION_CHIPS } from '@/lib/catalogCategories';
import { StorefrontIcon, type StorefrontIconName } from '@/components/icons';

const OCCASION_ICONS: Record<string, StorefrontIconName> = {
  romantic: 'favorite',
  birthday: 'star',
  anniversary: 'local-fire-department',
  sympathy: 'water-drop',
  congrats: 'check-circle',
  get_well: 'wb-sunny',
};

export function OccasionsSection({ lang }: { lang: Locale }) {
  const t = translations[lang].homeLanding.occasions;
  const tCatalog = translations[lang].catalog;
  const chips = CATALOG_OCCASION_CHIPS.filter((chip) => chip.value !== '');

  return (
    <section
      className="py-16 sm:py-20 lg:py-24 bg-white"
      aria-labelledby="home-occasions-title"
      data-home-reveal
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:items-center">
          <div className="home-reveal-item">
            <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[#C5A059] mb-3">
              {t.eyebrow}
            </p>
            <h2
              id="home-occasions-title"
              className="font-[family-name:var(--font-family-display)] text-3xl sm:text-4xl text-[#1A3C34] mb-4 leading-tight"
            >
              {t.title}
            </h2>
            <p className="text-stone-500 leading-relaxed max-w-md">{t.subtitle}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 home-reveal-stagger">
            {chips.map((chip) => (
              <Link
                key={chip.value}
                href={`/${lang}/catalog?occasion=${chip.value}`}
                className="home-reveal-item group flex items-center gap-3 rounded-2xl border border-stone-200 bg-[#FDFCF8] px-4 py-4 sm:px-5 sm:py-5 transition-all duration-300 hover:border-[#C5A059]/60 hover:bg-[#C5A059]/[0.06] hover:-translate-y-0.5 active:translate-y-0"
              >
                <div
                  aria-hidden
                  className="w-9 h-9 rounded-xl bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] flex-shrink-0 transition-colors duration-300 group-hover:bg-[#C5A059]/15"
                >
                  <StorefrontIcon name={OCCASION_ICONS[chip.value]} size={18} />
                </div>
                <span className="min-w-0 flex-1 font-medium text-sm sm:text-base text-[#1A3C34] truncate">
                  {tCatalog[chip.labelKey]}
                </span>
                <StorefrontIcon
                  name="arrow-forward"
                  size={16}
                  className="flex-shrink-0 text-stone-300 transition-all duration-300 group-hover:text-[#C5A059] group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
