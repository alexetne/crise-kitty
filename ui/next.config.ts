import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '..'),
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './'),
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://app:5001/:path*',
      },
      {
        source: '/docs/:path*',
        destination: 'http://app:5001/docs/:path*',
      },
      {
        source: '/health',
        destination: 'http://app:5001/health',
      },
    ];
  },
};

export default nextConfig;
