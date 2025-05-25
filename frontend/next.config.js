/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy removed as requested
  reactStrictMode: true,
  devIndicators: {
    position: 'bottom-right'
  },
  // Add security headers and restricted CORS
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          // CORS headers - restrict to specific origins in production
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development' ? '*' : 'https://openwriter.app'
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, Content-Type, Accept, Authorization' },

          // Security headers
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://openrouter.ai; frame-ancestors 'none';"
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }
        ],
      },
    ];
  }
};

module.exports = nextConfig;
