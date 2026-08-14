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
      <p>
        Provenance audio et métadonnées de Sawra (v1.7).{' '}
        <Link href="/informations/sources">Version interactive dans l’app</Link>.
      </p>

      <h2>1. Source audio</h2>
      <p>
        Catalogue public <a href="https://www.mp3quran.net">mp3quran.net</a> (API v3 et serveurs audio).
        Sawra n’héberge pas les MP3 : le lecteur charge les URL du catalogue.
      </p>

      <h2>2. Métadonnées & sync versets</h2>
      <p>
        Noms de récitateurs, moshaf et listes de sourates viennent de l’API mp3quran. Texte / timings
        pour la lecture verset par verset s’appuient aussi sur des sources publiques associées (dont
        api.quran.com lorsque disponible). Un catalogue de secours local peut s’afficher hors réseau.
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
        <Link href="/informations/sources">Ouvrir dans l’app →</Link>
      </p>
    </LegalDocument>
  );
}
