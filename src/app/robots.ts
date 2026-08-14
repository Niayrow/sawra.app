import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/offline.html', '/compte', '/options'],
      },
    ],
    sitemap: 'https://sawra.app/sitemap.xml',
  };
}
