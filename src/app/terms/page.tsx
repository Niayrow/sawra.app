import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument } from '../(legal)/LegalDocument';
import { seoDocToMetadata } from '@/utils/seoMetadata';
import { resolveSeoForView } from '@/utils/seo';
import { LEGAL_UPDATED_LABEL } from '@/utils/legalMeta';

const base = seoDocToMetadata(resolveSeoForView('more', 'legal', 'terms'));

export const metadata: Metadata = {
  ...base,
  alternates: {
    canonical: '/terms',
    languages: { fr: '/terms', 'x-default': '/' },
  },
  openGraph: {
    ...base.openGraph,
    url: 'https://sawra.app/terms',
  },
};

export default function TermsPage() {
  return (
    <LegalDocument title="Conditions d’utilisation" updated={LEGAL_UPDATED_LABEL}>
      <p>Règles d’usage de Sawra (v1.0).</p>

      <h2>1. Service</h2>
      <p>
        Lecteur coranique gratuit (site web et PWA ; applications mobiles en préparation) : streaming,
        hors-ligne local, Bibliothèque, Quiz, Apprendre, Radio, et synchronisation multi-appareils avec
        un compte GoMuslimLife.
      </p>

      <h2>2. Usage</h2>
      <ul>
        <li>Écoute personnelle et familiale.</li>
        <li>Pas d’extraction massive ni de contournement des sources audio.</li>
        <li>Pas d’usage commercial des enregistrements sans accord des ayants droit.</li>
        <li>Pas d’abus technique (surcharge des services, scraping agressif).</li>
        <li>Respect des lois applicables et du caractère sacré du contenu.</li>
      </ul>

      <h2>3. Limites</h2>
      <p>
        Le streaming dépend de mp3quran.net. Le hors-ligne ne couvre que les sourates téléchargées. La
        sync nécessite un compte et une connexion. Certaines options d’interface (navbar) ne
        s’appliquent que sur ordinateur. Service fourni « en l’état ».
      </p>

      <h2>4. Contact</h2>
      <p>
        Vous pouvez proposer une amélioration ou une fonctionnalité depuis Options. Éditeur :{' '}
        <a href="https://sofianeweb.fr">sofianeweb.fr</a> · compte :{' '}
        <a href="https://gomuslimlife.com">GoMuslimLife.com</a>.
      </p>
      <p>
        Voir aussi : <Link href="/privacy">Confidentialité</Link> · <Link href="/sources">Sources</Link>
      </p>
    </LegalDocument>
  );
}
