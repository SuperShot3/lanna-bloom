import Image from 'next/image';
import { getPartnersForHomepage } from '@/lib/supabase/partnerQueries';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

const PLACEHOLDER_PARTNERS = [
  { id: '1', shop_name: 'Flora Art Chiang Mai', specialty: 'Nimman Area Specialist' },
  { id: '2', shop_name: 'Lanna Petals', specialty: 'Traditional Design' },
  { id: '3', shop_name: 'The Bloom Bar', specialty: 'Modern Minimalist' },
];

export async function PartnersCarousel({ lang }: { lang: Locale }) {
  const t = translations[lang].partners;
  const partners = await getPartnersForHomepage();

  const items =
    partners.length > 0
      ? partners.map((p) => ({
          id: p.id,
          name: p.shop_name || 'Partner',
          specialty: p.district || 'Chiang Mai',
          imageUrl: p.sample_photo_urls?.[0] ?? null,
        }))
      : PLACEHOLDER_PARTNERS.map((p) => ({
          id: p.id,
          name: p.shop_name,
          specialty: p.specialty,
          imageUrl: null as string | null,
        }));

  return (
    <section id="partners" className="py-16 sm:py-20 lg:py-24 bg-[#1A3C34] text-stone-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 sm:mb-10">
        <h2 className="font-[family-name:var(--font-family-display)] text-4xl mb-4">
          {t.title}
        </h2>
        <p className="text-stone-400">{t.subtitle}</p>
      </div>
      <div className="flex gap-8 px-6 overflow-hidden">
        <div className="flex gap-8 animate-partners-scroll shrink-0">
          {[...items, ...items].map((partner, i) => (
            <div
              key={`${partner.id}-${i}`}
              className="inline-block w-80 bg-white/5 backdrop-blur p-8 rounded-2xl border border-white/10 shrink-0"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-stone-700 overflow-hidden border border-white/20 flex items-center justify-center">
                  {partner.imageUrl ? (
                    <Image
                      src={partner.imageUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-2xl text-stone-400 mt-[7px]">
                      store
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold">{partner.name}</h4>
                  <p className="text-xs text-stone-400">{partner.specialty}</p>
                </div>
              </div>
              <div className="flex gap-1 text-[#C5A059]">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className="material-symbols-outlined text-sm material-symbols-filled"
                  >
                    star
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
