import type { Metadata } from 'next';
import { radioMetadata } from '../routeMeta';
import { decodeCustomRadio, customRadioShareUrl } from '@/utils/customRadio';
import {
  buildCustomRadioSocialMeta,
  customRadioOgImageUrl,
} from '@/utils/customRadioShare';
import { SITE_ORIGIN } from '@/utils/seoMetadata';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const token =
    firstParam(sp.r) || firstParam(sp.c) || firstParam(sp.custom) || '';
  const config = token ? decodeCustomRadio(token) : null;

  if (!config) return radioMetadata;

  const { title, description } = buildCustomRadioSocialMeta(config);
  const url = customRadioShareUrl(config, SITE_ORIGIN);
  const ogImage = customRadioOgImageUrl(config, SITE_ORIGIN);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'website',
      siteName: 'Sawra',
      title,
      description,
      url,
      locale: 'fr_FR',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${config.name} — Radio Coran sur Sawra`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function Page() {
  return null;
}
