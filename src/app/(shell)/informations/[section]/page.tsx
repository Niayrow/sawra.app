import type { Metadata } from 'next';
import { legalMetadata } from '../../routeMeta';
import type { LegalSub } from '@/utils/seo';

const SECTION_TO_LEGAL: Record<string, LegalSub> = {
  sources: 'sources',
  confidentialite: 'privacy',
  conditions: 'terms',
};

export function generateStaticParams() {
  return [{ section: 'sources' }, { section: 'confidentialite' }, { section: 'conditions' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const legal = SECTION_TO_LEGAL[section] ?? 'sources';
  return legalMetadata(legal);
}

export default async function Page() {
  return null;
}
