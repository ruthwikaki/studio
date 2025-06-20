
/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', // Consider this if deploying to a container and problems persist
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Ensure no experimental flags are causing issues, keep it minimal
};

module.exports = nextConfig;
