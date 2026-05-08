/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['next-mdx-remote'],
  async headers() {
    // Baseline security headers (keep CSP in Report-Only initially to reduce break risk).
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
      { source: '/:lang(en|th)/guides', destination: '/:lang/info', permanent: true },
      {
        source: '/:lang(en|th)/guides/birthday-flower-gift',
        destination: '/:lang/info/birthday-flower-gift',
        permanent: true,
      },
      {
        source: '/:lang(en|th)/guides/flowers-chiang-mai',
        destination: '/:lang/info/flowers-chiang-mai',
        permanent: true,
      },
      {
        source: '/:lang(en|th)/guides/rose-bouquets-chiang-mai',
        destination: '/:lang/info/rose-bouquets-chiang-mai',
        permanent: true,
      },
      {
        source: '/:lang(en|th)/guides/same-day-flower-delivery-chiang-mai',
        destination: '/:lang/info/same-day-flower-delivery-chiang-mai',
        permanent: true,
      },
      {
        source: '/:lang(en|th)/guides/flower-delivery-to-hospitals-chiang-mai',
        destination: '/:lang/info/flower-delivery-to-hospitals-chiang-mai',
        permanent: true,
      },
      {
        source: '/:lang(en|th)/guides/perfect-bouquet-someone-special',
        destination: '/:lang/info/perfect-bouquet-someone-special',
        permanent: true,
      },
      {
        source: '/:lang(en|th)/info/delivery-policy-chiang-mai',
        destination: '/:lang/info/delivery-policy',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/feeds/google-merchant-feed.tsv', destination: '/feeds/google-merchant-feed' },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ['@sanity/client', 'next-sanity', '@sanity/image-url'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io', pathname: '/images/**' },
    ],
  },
};

module.exports = nextConfig;
