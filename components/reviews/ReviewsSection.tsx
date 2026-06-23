import { getFeaturedReviewsAsync, getReviewStatsAsync } from '@/lib/reviews';
import { GOOGLE_REVIEW_URL, GOOGLE_PLACE_URL } from '@/lib/reviewsConfig';
import type { Locale } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { StorefrontIcon } from '@/components/icons';

interface ReviewsSectionProps {
  lang: Locale;
  title?: string;
  subtitle?: string;
}

export async function ReviewsSection({
  lang,
  title,
  subtitle,
}: ReviewsSectionProps) {
  const [reviews, stats] = await Promise.all([
    getFeaturedReviewsAsync(3),
    getReviewStatsAsync(),
  ]);
  const t = translations[lang].reviews;

  const displayTitle = title ?? t.title;
  const featuredQuote =
    reviews[0]?.text ||
    "I ordered a bouquet for my mother's birthday and it was delivered within 45 minutes. The flowers were fresher than anything I've seen in the markets. Truly premium service.";
  const quoteTitle = stats.count > 0 ? `"Best flower service in Chiang Mai"` : displayTitle;

  return (
    <section
      className="py-16 sm:py-20 lg:py-24 bg-white"
      aria-labelledby="reviews-section-title"
      data-home-reveal
    >
      <div className="max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="home-reveal-item flex flex-col items-center gap-2 mb-8">
          <img
            src="/icons/google-icon-logo-svgrepo-com.svg"
            alt=""
            className="w-auto"
            width={75}
            height={75}
            style={{ width: 75, height: 75 }}
            aria-hidden
          />
          <div className="flex text-yellow-400 justify-center">
            {[1, 2, 3, 4, 5].map((i) => (
              <StorefrontIcon key={i} name="star" filled size={20} />
            ))}
          </div>
        </div>
        <div className="home-reveal-item">
          <h2
            id="reviews-section-title"
            className="font-[family-name:var(--font-family-display)] text-4xl text-[#1A3C34] mb-6"
          >
            {stats.count > 0 ? quoteTitle : displayTitle}
          </h2>
          <p className="text-xl italic text-stone-500 mb-12">{featuredQuote}</p>
        </div>
        <div className="home-reveal-stagger flex flex-wrap items-center justify-center gap-8 md:gap-16 pt-12 border-t border-stone-100">
          <div className="home-reveal-item flex items-center gap-3 text-[#C5A059]">
            <StorefrontIcon name="verified" size={30} />
            <div className="text-left">
              <p className="font-bold text-sm">{lang === 'th' ? 'การจัดส่งที่ไว้ใจได้' : 'Verified delivery'}</p>
              <p className="text-xs text-stone-400">
                {lang === 'th' ? 'คุณภาพที่คุณวางใจได้' : 'Quality you can trust'}
              </p>
            </div>
          </div>
          <div className="home-reveal-item flex items-center gap-3 text-[#C5A059]">
            <StorefrontIcon name="bolt" size={30} />
            <div className="text-left">
              <p className="font-bold text-sm">Fast Delivery</p>
              <p className="text-xs text-stone-400">Chiang Mai Inner City</p>
            </div>
          </div>
          <div className="home-reveal-item flex items-center gap-3 text-[#C5A059]">
            <StorefrontIcon name="support-agent" size={30} />
            <div className="text-left">
              <p className="font-bold text-sm">Local Support</p>
              <p className="text-xs text-stone-400">English & Thai</p>
            </div>
          </div>
        </div>
        <div className="home-reveal-item flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 bg-[#C5A059] text-[#1A3C34] rounded-full font-semibold hover:opacity-90 transition-opacity"
          >
            {t.leaveReview}
          </a>
          <a
            href={GOOGLE_PLACE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#C5A059] hover:underline underline-offset-4"
          >
            {t.allReviewsOnGoogle}
          </a>
        </div>
      </div>
    </section>
  );
}
