import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';

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

  const tips = [
    {
      icon: 'water_drop',
      title: t.trimStems,
      desc: t.trimStemsDesc,
    },
    {
      icon: 'wb_sunny',
      title: t.avoidSun,
      desc: t.avoidSunDesc,
    },
    {
      icon: 'local_florist',
      title: t.freshWater,
      desc: t.freshWaterDesc,
    },
  ];

  return (
    <div className="mt-20 pt-12 border-t border-stone-200 dark:border-stone-800">
      <h3 className="font-[family-name:var(--font-family-display)] text-2xl text-[#1A3C34] dark:text-stone-50 mb-6">
        {t.title}
      </h3>
      <div className="grid md:grid-cols-3 gap-8">
        {tips.map((tip) => (
          <div key={tip.icon} className="space-y-2">
            <span className="material-symbols-outlined text-[#C5A059] text-2xl">
              {tip.icon}
            </span>
            <h5 className="font-semibold text-sm text-stone-800 dark:text-stone-200">
              {tip.title}
            </h5>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              {tip.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
