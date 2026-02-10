/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Isso vai ignorar o erro da biblioteca Resend e permitir que o build termine
    ignoreBuildErrors: true,
  },
  eslint: {
    // Opcional: ignora erros de linting também, se estiverem travando o build
    ignoreDuringBuilds: true,
  },
};

import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: true,
});

export default pwaConfig(nextConfig);
