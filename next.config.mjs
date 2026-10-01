/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Erros de tipos agora quebram o build (antes eram ignorados e escondiam bugs reais).
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  turbopack: {},
};

import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: true, // Temporarily disabled for Vercel deployment debug
});

export default pwaConfig(nextConfig);
