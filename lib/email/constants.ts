/**
 * Public URLs and defaults for Lanna Bloom transactional/reminder emails.
 * TikTok: optional; leave empty if unset (see TIKTOK_URL).
 */

export const DEFAULT_WEBSITE_URL = 'https://lannabloom.shop';
export const DEFAULT_INSTAGRAM_URL = 'https://www.instagram.com/lannabloomchiangmai/';
export const DEFAULT_FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61587782069439';
export const DEFAULT_GOOGLE_MAPS_URL = 'https://g.page/r/CclGzPBur8RbEBM';
export const DEFAULT_REVIEW_URL = 'https://g.page/r/CclGzPBur8RbEBM/review';

export const KNOWN_TEMPLATE_VARIABLES = new Set(
  [
    'customer_name',
    'customer_email',
    'order_id',
    'order_number',
    'product_name',
    'product_image',
    'delivery_date',
    'delivery_address',
    'total_price',
    'review_link',
    'important_dates_link',
    'website_url',
    'instagram_url',
    'facebook_url',
    'tiktok_url',
    'google_maps_url',
    'recipient_name',
    'relationship',
    'occasion_type',
    'days_left',
    'recommended_product_name',
    'recommended_product_image',
    'recommended_product_price',
    'confirm_url',
    'choose_another_url',
    'unsubscribe_url',
    'social_footer',
    'brand_header',
    'logo_url',
    'product_showcase',
  ] as const
);
