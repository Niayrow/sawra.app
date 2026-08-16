import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument } from '../(legal)/LegalDocument';
import { seoDocToMetadata } from '@/utils/seoMetadata';
import { resolveSeoForView } from '@/utils/seo';
import { LEGAL_UPDATED_LABEL } from '@/utils/legalMeta';

const base = seoDocToMetadata(resolveSeoForView('more', 'legal', 'sources'));

export const metadata: Metadata = {
  ...base,
  alternates: {
    canonical: '/sources',
    languages: { fr: '/sources', 'x-default': '/' },
  },
  openGraph: {
    ...base.openGraph,
    url: 'https://sawra.app/sources',
  },
};

export default function SourcesPage() {
  return (
    <LegalDocument title="Sources & licences" updated={LEGAL_UPDATED_LABEL}>
      <p>Provenance des récitations et du texte sur Sawra (v1.0).</p>

      <h2>1. Source audio</h2>
      <p>
        Catalogue public <a href="https://www.mp3quran.net">mp3quran.net</a>. Sawra n’héberge pas les
        fichiers audio : le lecteur lit les adresses fournies par ce catalogue.
      </p>

      <h2>2. Streaming, hors-ligne & texte</h2>
      <p>
        En ligne, une connexion est nécessaire. Hors-ligne : uniquement les sourates que vous avez
        téléchargées sur cet appareil (cache local).
      </p>
      <p>
        Noms de récitateurs et listes de sourates viennent de mp3quran. Texte arabe et timings verset
        par verset s’appuient aussi sur des sources publiques associées (dont api.quran.com lorsque
        disponible). Un catalogue de secours local peut s’afficher hors réseau.
      </p>

      <h2>3. Licences</h2>
      <p>
        Les enregistrements appartiennent à leurs ayants droit. Usage personnel et non commercial via
        Sawra. Toute redistribution ou usage commercial doit respecter les règles de la source et les
        droits des récitateurs.
      </p>
      <p>
        Le texte du Coran n’est pas soumis à un droit d’auteur ; les enregistrements vocaux et
        arrangements techniques, eux, le sont.
      </p>

      <p>
        Voir aussi : <Link href="/privacy">Confidentialité</Link> · <Link href="/terms">Conditions</Link>
      </p>
    </LegalDocument>
  );
}
