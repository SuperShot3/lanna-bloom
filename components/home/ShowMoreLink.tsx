import { PremiumCtaLink } from '@/components/home/PremiumCtaLink';
import { TrackedLink } from '@/components/home/TrackedLink';
import { StorefrontIcon } from '@/components/icons';

export function ShowMoreLink({
  href,
  label,
  ctaEvent,
  premium = false,
}: {
  href: string;
  label: string;
  ctaEvent?: string;
  premium?: boolean;
}) {
  return (
    <div className="mt-8 sm:mt-10 flex justify-center">
      {premium ? (
        <PremiumCtaLink href={href} ctaEvent={ctaEvent}>
          {label}
        </PremiumCtaLink>
      ) : (
        <TrackedLink href={href} event={ctaEvent} className="popular-show-more group">
          <span>{label}</span>
          <StorefrontIcon
            name="arrow-forward"
            size={18}
            className="popular-show-more__icon"
          />
        </TrackedLink>
      )}
    </div>
  );
}
