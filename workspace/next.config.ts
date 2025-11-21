
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    // This is to fix build-time errors with genkit and its dependencies.
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    
    // Ignore the problematic dependency to resolve the "Critical dependency" warning.
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /require-in-the-middle/,
      })
    );

    return config;
  },
};

export default nextConfig;
