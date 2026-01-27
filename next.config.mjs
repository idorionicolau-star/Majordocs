/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa';

const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
};

const nextConfig = withPWA(pwaConfig)({
  // Your Next.js config options here
  reactStrictMode: true,
});

export default nextConfig;
