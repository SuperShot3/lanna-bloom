/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['next-mdx-remote'],
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
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
      { protocol: 'https', hostname: 'cdn.sanity.io', pathname: '/images/**' },
    ],
  },
};

module.exports = nextConfig;
