import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-08-14');
  const urls = [
    { path: '/', priority: 1, changeFrequency: 'weekly' as const },
    { path: '/ecouter', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/bibliotheque', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/quiz', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/apprendre', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/radio', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/a-propos', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/comparer', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/privacy', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/terms', priority: 0.4, changeFrequency: 'monthly' as const },
    { path: '/sources', priority: 0.4, changeFrequency: 'monthly' as const },
  ];

  return urls.map((item) => ({
    url: `https://sawra.app${item.path}`,
    lastModified,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));
}
