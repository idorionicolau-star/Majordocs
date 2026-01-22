
import './globals.css';
import { AppProviders } from '@/firebase/client-provider';
import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-headline',
});

export const metadata: Metadata = {
  title: 'MajorStockX',
  description: 'Sistema de gestão de estoque e produção para materiais de construção.',
  manifest: '/manifest.json',
  viewport:
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#6D28D9' },
    { media: '(prefers-color-scheme: dark)', color: '#8B5CF6' },
  ],
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable}`}
    >
      <body className="font-body antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
