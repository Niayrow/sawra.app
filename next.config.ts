import type { NextConfig } from 'next';

const isExport =
  process.env.NEXT_OUTPUT === 'export' || process.env.npm_lifecycle_event === 'build:native';

const tabRedirect = (value: string, destination: string) => ({
  source: '/',
  has: [{ type: 'query' as const, key: 'tab', value }],
  destination,
  permanent: true as const,
});

const nextConfig: NextConfig = {
  output: isExport ? 'export' : undefined,
  images: { unoptimized: true },
  turbopack: {
    root: process.cwd(),
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_POSTHOG_KEY:
      process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.VITE_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || process.env.VITE_POSTHOG_HOST,
  },
  ...(isExport
    ? {}
    : {
        async redirects() {
          return [
            tabRedirect('listen', '/ecouter'),
            tabRedirect('reciters', '/ecouter'),
            tabRedirect('surahs', '/ecouter'),
            tabRedirect('favorites', '/bibliotheque'),
            tabRedirect('quiz', '/quiz'),
            tabRedirect('learn', '/apprendre'),
            tabRedirect('radio', '/radio'),
            tabRedirect('account', '/compte'),
            tabRedirect('profile', '/compte'),
            tabRedirect('about', '/a-propos'),
            tabRedirect('compare', '/comparer'),
            tabRedirect('downloads', '/telechargements'),
            tabRedirect('moments', '/'),
            { source: '/privacy/', destination: '/privacy', permanent: true },
            { source: '/terms/', destination: '/terms', permanent: true },
            { source: '/sources/', destination: '/sources', permanent: true },
            {
              source: '/',
              has: [
                { type: 'query', key: 'tab', value: 'more' },
                { type: 'query', key: 'panel', value: 'about' },
              ],
              destination: '/a-propos',
              permanent: true,
            },
            {
              source: '/',
              has: [
                { type: 'query', key: 'tab', value: 'more' },
                { type: 'query', key: 'panel', value: 'compare' },
              ],
              destination: '/comparer',
              permanent: true,
            },
            {
              source: '/',
              has: [
                { type: 'query', key: 'tab', value: 'more' },
                { type: 'query', key: 'panel', value: 'downloads' },
              ],
              destination: '/telechargements',
              permanent: true,
            },
            {
              source: '/',
              has: [
                { type: 'query', key: 'tab', value: 'more' },
                { type: 'query', key: 'panel', value: 'priorities' },
              ],
              destination: '/options',
              permanent: true,
            },
            {
              source: '/',
              has: [
                { type: 'query', key: 'tab', value: 'more' },
                { type: 'query', key: 'panel', value: 'legal' },
                { type: 'query', key: 'section', value: 'privacy' },
              ],
              destination: '/informations/confidentialite',
              permanent: true,
            },
            {
              source: '/',
              has: [
                { type: 'query', key: 'tab', value: 'more' },
                { type: 'query', key: 'panel', value: 'legal' },
                { type: 'query', key: 'section', value: 'terms' },
              ],
              destination: '/informations/conditions',
              permanent: true,
            },
            {
              source: '/',
              has: [
                { type: 'query', key: 'tab', value: 'more' },
                { type: 'query', key: 'panel', value: 'legal' },
              ],
              destination: '/informations/sources',
              permanent: true,
            },
          ];
        },
      }),
};

export default nextConfig;
