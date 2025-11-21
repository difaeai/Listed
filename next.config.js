
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
    
    // Updated way to ignore warnings
    config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
        /require-in-the-middle/,
        /Module not found: Can't resolve '@opentelemetry\/exporter-jaeger'/,
    ];

    return config;
  },
};

module.exports = nextConfig;
