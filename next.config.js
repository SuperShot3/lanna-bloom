/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['next-mdx-remote', 'heic2any'],
  async headers() {
    // Baseline security headers (keep CSP in Report-Only initially to reduce break risk).
    // Report-Only: does not block, but surfaces violations in DevTools / Tag Assistant.
    // default-src 'self' applies to frames unless frame-src is set — without frame-src,
    // GTM noscript iframe + Google Maps embed would violate CSP when this is enforced elsewhere.
    const cspReportOnly = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' https: data: blob:",
      "font-src 'self' https: data:",
      "style-src 'self' 'unsafe-inline' https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https://www.googletagmanager.com https://www.google.com https://www.gstatic.com https://tagassistant.google.com",
      "worker-src 'self' blob: https://www.googletagmanager.com",
      "form-action 'self' https:",
      'upgrade-insecure-requests',
    ].join('; ');

    const common = [
      { key: 'X-DNS-Prefetch-Control', value: 'off' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value:
          'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
      },
      { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
    ];

    // Only send HSTS in production over HTTPS.
    const hsts =
      process.env.NODE_ENV === 'production'
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
        : [];

    return [
      {
        source: '/(.*)',
        headers: [...common, ...hsts],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/:lang(en|th|ru)/guides', destination: '/:lang/info', permanent: true },
      {
        source: '/:lang(en|th|ru)/guides/birthday-flower-gift',
        destination: '/:lang/info/birthday-flower-gift',
        permanent: true,
      },
      {
        source: '/:lang(en|th|ru|zh-sg|zh-hk)/guides/flowers-chiang-mai',
        destination: '/:lang',
        permanent: true,
      },
      {
        source: '/:lang(en|th|ru|zh-sg|zh-hk)/info/flowers-chiang-mai',
        destination: '/:lang',
        permanent: true,
      },
      {
        source: '/:lang(en|th|ru|zh-sg|zh-hk)/guides/rose-bouquets-chiang-mai',
        destination: '/:lang/collections/roses-chiang-mai',
        permanent: true,
      },
      {
        source: '/:lang(en|th|ru|zh-sg|zh-hk)/info/rose-bouquets-chiang-mai',
        destination: '/:lang/collections/roses-chiang-mai',
        permanent: true,
      },
      {
        source: '/:lang(en|th|ru)/guides/same-day-flower-delivery-chiang-mai',
        destination: '/:lang/info/same-day-flower-delivery-chiang-mai',
        permanent: true,
      },
      {
        source: '/:lang(en|th|ru)/guides/flower-delivery-to-hospitals-chiang-mai',
        destination: '/:lang/info/flower-delivery-to-hospitals-chiang-mai',
        permanent: true,
      },
      {
        source: '/:lang(en|th|ru)/guides/perfect-bouquet-someone-special',
        destination: '/:lang/info/perfect-bouquet-someone-special',
        permanent: true,
      },
      {
        source: '/:lang(en|th|ru)/info/delivery-policy-chiang-mai',
        destination: '/:lang/info/delivery-policy',
        permanent: true,
      },
      {
        source: '/:lang(en|th|ru)/info/how-to-order-flower-delivery-chiang-mai',
        destination: '/:lang',
        permanent: true,
      },
      {
        source: '/zh-sg/info/how-to-order-flower-delivery-chiang-mai',
        destination: '/zh-sg',
        permanent: true,
      },
      {
        source: '/zh-hk/info/how-to-order-flower-delivery-chiang-mai',
        destination: '/zh-hk',
        permanent: true,
      },
      {
        source: '/collections/white-roses-chiang-mai',
        destination: '/en/collections/roses-chiang-mai?color=white',
        permanent: true,
      },
      {
        source: '/collections/pink-roses-chiang-mai',
        destination: '/en/collections/roses-chiang-mai?color=pink',
        permanent: true,
      },
      {
        source: '/collections/red-roses-chiang-mai',
        destination: '/en/collections/roses-chiang-mai?color=red',
        permanent: true,
      },
      {
        source: '/:lang(en|th|ru)/collections/white-roses-chiang-mai',
        destination: '/:lang/collections/roses-chiang-mai?color=white',
        permanent: true,
      },
      {
        source: '/:lang(en|th|ru)/collections/pink-roses-chiang-mai',
        destination: '/:lang/collections/roses-chiang-mai?color=pink',
        permanent: true,
      },
      {
        source: '/:lang(en|th|ru)/collections/red-roses-chiang-mai',
        destination: '/:lang/collections/roses-chiang-mai?color=red',
        permanent: true,
      },
      {
        source: '/zh-sg/collections/white-roses-chiang-mai',
        destination: '/zh-sg/collections/roses-chiang-mai?color=white',
        permanent: true,
      },
      {
        source: '/zh-sg/collections/pink-roses-chiang-mai',
        destination: '/zh-sg/collections/roses-chiang-mai?color=pink',
        permanent: true,
      },
      {
        source: '/zh-sg/collections/red-roses-chiang-mai',
        destination: '/zh-sg/collections/roses-chiang-mai?color=red',
        permanent: true,
      },
      {
        source: '/zh-hk/collections/white-roses-chiang-mai',
        destination: '/zh-hk/collections/roses-chiang-mai?color=white',
        permanent: true,
      },
      {
        source: '/zh-hk/collections/pink-roses-chiang-mai',
        destination: '/zh-hk/collections/roses-chiang-mai?color=pink',
        permanent: true,
      },
      {
        source: '/zh-hk/collections/red-roses-chiang-mai',
        destination: '/zh-hk/collections/roses-chiang-mai?color=red',
        permanent: true,
      },
      {
        source: '/:lang(en|th|ru)/partner',
        destination: '/:lang',
        permanent: false,
      },
      {
        source: '/:lang(en|th|ru)/partner/login',
        destination: '/:lang/partner/apply',
        permanent: false,
      },
      {
        source: '/:lang(en|th|ru)/partner/login/:path*',
        destination: '/:lang/partner/apply',
        permanent: false,
      },
      {
        source: '/:lang(en|th|ru)/partner/register',
        destination: '/:lang/partner/apply',
        permanent: false,
      },
      {
        source: '/:lang(en|th|ru)/partner/register/:path*',
        destination: '/:lang/partner/apply',
        permanent: false,
      },
      {
        source: '/:lang(en|th|ru)/partner/dashboard/:path*',
        destination: '/:lang',
        permanent: false,
      },
      {
        source: '/:lang(en|th|ru)/partner/products/:path*',
        destination: '/:lang',
        permanent: false,
      },
      {
        source: '/:lang(en|th|ru)/partner/shop/:path*',
        destination: '/:lang',
        permanent: false,
      },
      {
        source: '/:lang(en|th|ru)/partner/how-it-works',
        destination: '/:lang/partner/apply',
        permanent: false,
      },
      { source: '/studio', destination: '/admin', permanent: false },
      { source: '/studio/:path*', destination: '/admin', permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: '/feeds/google.txt', destination: '/feeds/google-merchant-feed' },
      { source: '/feeds/google-merchant-feed.tsv', destination: '/feeds/google-merchant-feed' },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 2592000,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [48, 64, 80, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      // Always allow Supabase Storage CDN (catalog bucket). Do not rely only on build-time
      // SUPABASE_URL — Vercel builds may not have server env vars when next.config.js loads.
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      ...(function supabaseStorageRemotePatterns() {
        const raw = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        try {
          const host = new URL(raw).hostname;
          if (!host || host.endsWith('.supabase.co')) return [];
          return [{ protocol: 'https', hostname: host, pathname: '/storage/v1/object/public/**' }];
        } catch {
          return [];
        }
      })(),
    ],
  },
};

module.exports = nextConfig;
