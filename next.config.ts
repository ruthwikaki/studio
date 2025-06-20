
import 'dotenv/config'; // Ensures .env file is loaded
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
  webpack: (config, { isServer }) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    if (!isServer) {
      // This is the key change: it prevents server-side modules from being bundled on the client.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "firebase-admin": false, // Tells webpack to replace it with an empty module on the client
        fs: false, // and its dependencies that use node built-ins
        net: false,
        tls: false,
        child_process: false,
      };
    }

    return config;
  },
};

export default nextConfig;
