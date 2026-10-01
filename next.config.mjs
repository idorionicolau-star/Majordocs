/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Erros de tipos agora quebram o build (antes eram ignorados e escondiam bugs reais).
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  turbopack: {},
};

// O PWA (service worker) vive em public/firebase-messaging-sw.js e é registado por <PwaRegister />.
// O plugin next-pwa foi removido: não funciona com o Turbopack.
export default nextConfig;
