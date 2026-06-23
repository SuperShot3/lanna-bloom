import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { StorefrontIcon, type StorefrontIconName } from '@/components/icons';

export function CareGuideSection({ lang }: { lang: Locale }) {
  const tRaw = (translations[lang] as Record<string, unknown>).careGuide as Record<string, string> | undefined;
  const t = tRaw ?? {
    title: 'Bouquet Care Guide',
    trimStems: 'Trim Stems',
    trimStemsDesc: 'Cut 2cm off the stems at a 45° angle every 2 days for better water absorption.',
    avoidSun: 'Avoid Direct Sun',
    avoidSunDesc: 'Keep in a cool spot away from direct sunlight and drafts to preserve color.',
    freshWater: 'Fresh Water',
    freshWaterDesc: 'Change the water daily and use the provided flower food for longevity.',
  };

  const tips: { icon: StorefrontIconName; title: string; desc: string }[] = [
    { icon: 'water-drop', title: t.trimStems, desc: t.trimStemsDesc },
    { icon: 'wb-sunny', title: t.avoidSun, desc: t.avoidSunDesc },
    { icon: 'local-florist', title: t.freshWater, desc: t.freshWaterDesc },
  ];

  return (
    <div className="mt-12 pt-8 border-t border-stone-200 md:mt-20 md:pt-12">
      <h3 className="font-[family-name:var(--font-family-display)] text-xl text-[#1A3C34] mb-4 md:text-2xl md:mb-6">
        {t.title}
      </h3>
      <div className="grid grid-cols-3 gap-3 sm:gap-5 md:gap-8">
        {tips.map((tip) => (
          <div
            key={tip.icon}
            className="flex min-w-0 flex-col items-center gap-1.5 text-center sm:gap-2 text-[#C5A059]"
          >
            <StorefrontIcon name={tip.icon} size={22} className="sm:!w-6 sm:!h-6" />
            <h5 className="text-[11px] font-semibold leading-tight text-stone-800 sm:text-sm">
              {tip.title}
            </h5>
            <p className="text-[10px] leading-snug text-stone-500 sm:text-xs sm:leading-relaxed">
              {tip.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
