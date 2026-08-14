import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { JsonLd } from './JsonLd';
import { CrawlableNav } from './CrawlableNav';
import { SEO_HOME } from '../utils/seo';
import { seoDocToMetadata } from '../utils/seoMetadata';
import '../index.css';

export const metadata: Metadata = {
  ...seoDocToMetadata(SEO_HOME),
  metadataBase: new URL('https://sawra.app'),
  applicationName: 'Sawra',
  authors: [{ name: 'Sawra' }],
  keywords: [
    'écouter le Coran',
    'Coran audio gratuit',
    'lecteur coranique',
    'streaming Coran',
    'récitateurs Coran',
    'Sawra',
  ],
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    title: 'Sawra',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#07111d',
  },
};

export const viewport = {
  themeColor: '#07111d',
  colorScheme: 'dark' as const,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://mp3quran.net" crossOrigin="" />
        <link rel="dns-prefetch" href="https://mp3quran.net" />
        <link rel="dns-prefetch" href="https://api.quran.com" />
        <link rel="preload" href="/icons/sansfond.webp" as="image" type="image/webp" />
        <JsonLd />
      </head>
      <body className="bg-slate-950">
        <CrawlableNav />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
