/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['sharp'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp: false,
    };
    return config;
  },
};

export default nextConfig;
