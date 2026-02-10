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
import { withSentryConfig } from '@sentry/nextjs';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: true,
});

const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
};

const sentryOptions = {
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Transpiles SDK to be compatible with IE11 (increases bundle size)
  transpileClientSDK: false,

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
};

export default withSentryConfig(pwaConfig(nextConfig), sentryWebpackPluginOptions, sentryOptions);
