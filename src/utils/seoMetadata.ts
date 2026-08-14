import type { Metadata } from 'next';
import type { SeoDoc } from './seo';

export const SITE_ORIGIN = 'https://sawra.app';
export const OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

export const seoDocToMetadata = (doc: SeoDoc): Metadata => ({
  title: doc.title,
  description: doc.description,
  robots:
    doc.robots === 'noindex'
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
  alternates: {
    canonical: doc.canonical,
    languages: { fr: doc.canonical, 'x-default': `${SITE_ORIGIN}/` },
  },
  openGraph: {
    type: 'website',
    siteName: 'Sawra',
    title: doc.title,
    description: doc.description,
    url: doc.canonical,
    locale: 'fr_FR',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Sawra — écouter le Coran en ligne, gratuit et sans publicité',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: doc.title,
    description: doc.description,
    images: [OG_IMAGE],
  },
});
