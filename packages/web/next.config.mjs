/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Get API URL from environment or default to localhost:4000 (where API dev server runs)
    const apiPort = process.env.API_PORT ?? '4000';
    const apiHost = process.env.API_HOST ?? 'localhost';
    const apiBaseUrl = process.env.API_BASE_URL ?? `http://${apiHost}:${apiPort}`;
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
