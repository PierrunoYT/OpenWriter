/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy removed as requested
  reactStrictMode: true,
  devIndicators: {
    position: 'bottom-right'
  },
  // Add CORS headers to API routes if needed
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, Content-Type, Accept, Authorization' },
        ],
      },
    ];
  }
};

module.exports = nextConfig;
