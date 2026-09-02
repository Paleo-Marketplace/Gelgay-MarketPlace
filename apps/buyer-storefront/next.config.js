/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'media.paleo.market' }
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups'
          }
        ]
      }
    ];
  },
  async rewrites() {
    return [
      {
        source: '/vendor',
        destination: '/vendor/index.html'
      },
      {
        source: '/vendor/:path*',
        destination: '/vendor/index.html'
      },
      {
        source: '/admin',
        destination: '/admin/index.html'
      },
      {
        source: '/admin/:path*',
        destination: '/admin/index.html'
      },
      {
        source: '/courier',
        destination: '/courier/index.html'
      },
      {
        source: '/courier/:path*',
        destination: '/courier/index.html'
      }
    ];
  }
};

export default nextConfig;
