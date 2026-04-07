/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['next-mdx-remote'],
  async redirects() {
    return [
      { source: '/en/info/flowers-chiang-mai', destination: '/en/info/how-to-order-flower-delivery-chiang-mai', permanent: true },
      { source: '/th/info/flowers-chiang-mai', destination: '/th/info/how-to-order-flower-delivery-chiang-mai', permanent: true },
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
