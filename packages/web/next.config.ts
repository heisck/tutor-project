import type { NextConfig } from 'next';

import { loadWebEnv } from './src/env';

loadWebEnv();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ai-tutor-pwa/shared'],
};

export default nextConfig;
