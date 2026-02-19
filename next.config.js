/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['next-mdx-remote'],
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
