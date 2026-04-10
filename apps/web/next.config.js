/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      // API versioning: /api/v1/* maps to /api/* for backward compatibility
      { source: '/api/v1/:path*', destination: '/api/:path*' },
    ];
  },
};

module.exports = nextConfig;
