'use client';

import { LineIcon, WhatsAppIcon } from '@/components/icons';
import { BackToTopButton } from '@/components/BackToTopButton';
import { useFlowerFilterSheetOpen } from '@/contexts/FlowerFilterSheetOpenContext';
import { getLineContactUrl, getWhatsAppContactUrl } from '@/lib/messenger';
import type { Locale } from '@/lib/i18n';

const contactButtons = [
  {
    href: getWhatsAppContactUrl(),
    label: 'Chat with us on WhatsApp',
    tooltip: 'Contact us on WhatsApp',
    Icon: WhatsAppIcon,
    className: `
      bg-[#25D366] text-white
      focus-visible:ring-[#25D366]/30
    `,
  },
  {
    href: getLineContactUrl(),
    label: 'Chat with us on LINE',
    tooltip: 'Contact us on LINE',
    Icon: LineIcon,
    className: `
      bg-[#06C755] text-white
      focus-visible:ring-[#06C755]/30
    `,
  },
];

export function LineFloatingButton({
  lang,
  showContactButtons = true,
}: {
  lang: Locale;
  showContactButtons?: boolean;
}) {
  const { isOpen: flowerFilterSheetOpen } = useFlowerFilterSheetOpen();
  if (flowerFilterSheetOpen) return null;

  return (
    <>
      <BackToTopButton lang={lang} showContactButtons={showContactButtons} />
      <div className="line-floating-contact fixed right-4 z-[111] bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] md:right-6 md:bottom-6">
        <div className="flex flex-col items-end gap-3">
          {showContactButtons &&
            contactButtons.map(({ href, label, tooltip, Icon, className }) => (
          <div key={label} className="group relative">
            {/* Desktop tooltip */}
            <div
              className="
                pointer-events-none absolute bottom-1/2 right-full mr-2 hidden translate-y-1/2 md:block
                translate-x-1 opacity-0 transition
                group-hover:translate-x-0 group-hover:opacity-100
              "
              aria-hidden
            >
              <div className="whitespace-nowrap rounded-md bg-neutral-900/90 px-3 py-2 text-xs font-semibold text-white shadow-lg">
                {tooltip}
              </div>
            </div>

            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className={`
                relative inline-flex items-center justify-center
                rounded-full overflow-hidden
                ring-1 ring-black/10
                shadow-[0_14px_26px_rgba(0,0,0,0.22),0_3px_0_rgba(0,0,0,0.12)]
                after:content-[''] after:absolute after:inset-[2px] after:rounded-full after:pointer-events-none
                after:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22),inset_0_-10px_18px_rgba(0,0,0,0.16)]
                transition-transform transition-shadow duration-200 ease-out
                before:content-[''] before:absolute before:inset-0 before:rounded-full before:bg-white/20
                before:scale-0 before:opacity-0 before:transition before:duration-300
                hover:scale-[1.06] hover:shadow-[0_18px_34px_rgba(0,0,0,0.24),0_3px_0_rgba(0,0,0,0.12)]
                hover:before:scale-[1.8] hover:before:opacity-100
                focus-visible:outline-none focus-visible:ring-4
                active:scale-[0.95] active:translate-y-[1px]
                active:shadow-[0_10px_20px_rgba(0,0,0,0.20),0_1px_0_rgba(0,0,0,0.10)]
                h-12 w-12 sm:h-[52px] sm:w-[52px] md:h-14 md:w-14
                ${className}
              `}
            >
              <span className="relative inline-flex items-center justify-center">
                <Icon className="h-6 w-6" />
              </span>
              <span className="sr-only">{label}</span>
            </a>
          </div>
          ))}
        </div>
      </div>
    </>
  );
}

