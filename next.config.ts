import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
  experimental: {
    // This option tells Next.js to keep 'firebase-admin' as an external package
    // for server-side rendering and API routes, which can help with CJS compatibility.
    // Crucial for preventing "path module not found" or similar errors with firebase-admin.
    serverComponentsExternalPackages: ['firebase-admin'],
  },
};

export default nextConfig;
