import Image from 'next/image';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

export interface FloristCardProps {
  lang: Locale;
  partnerName?: string;
  partnerImage?: string | null;
  studioName?: string;
  quote?: string;
}

export function FloristCard({
  lang,
  partnerName = 'Local Artisan',
  partnerImage,
  studioName = 'Chiang Mai',
  quote = "We source our flowers daily from local markets to ensure maximum freshness and fragrance in every arrangement.",
}: FloristCardProps) {
  const t = translations[lang].product ?? {};
  const meetFlorist = (t as { meetFlorist?: string }).meetFlorist ?? 'Meet the Florist';

  return (
    <div className="p-6 rounded-2xl bg-stone-50 dark:bg-stone-900/50 border border-stone-100 dark:border-stone-800">
      <div className="flex items-center gap-4 mb-3">
        <div className="w-14 h-14 rounded-full bg-white dark:bg-stone-800 p-1 ring-1 ring-stone-200 dark:ring-stone-700 overflow-hidden flex-shrink-0">
          {partnerImage ? (
            <Image
              src={partnerImage}
              alt=""
              width={56}
              height={56}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-stone-400 text-2xl">
                store
              </span>
            </div>
          )}
        </div>
        <div>
          <h4 className="font-semibold text-sm text-stone-800 dark:text-stone-200">
            {meetFlorist}
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {partnerName}, {studioName}
          </p>
        </div>
      </div>
      <p className="text-xs text-stone-600 dark:text-stone-400 italic">{quote}</p>
    </div>
  );
}
