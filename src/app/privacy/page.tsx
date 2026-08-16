import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument } from '../(legal)/LegalDocument';
import { seoDocToMetadata } from '@/utils/seoMetadata';
import { resolveSeoForView } from '@/utils/seo';
import { LEGAL_UPDATED_LABEL } from '@/utils/legalMeta';

const base = seoDocToMetadata(resolveSeoForView('more', 'legal', 'privacy'));

export const metadata: Metadata = {
  ...base,
  alternates: {
    canonical: '/privacy',
    languages: { fr: '/privacy', 'x-default': '/' },
  },
  openGraph: {
    ...base.openGraph,
    url: 'https://sawra.app/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="Politique de confidentialité" updated={LEGAL_UPDATED_LABEL}>
      <p>
        Sawra (v1.0) est un lecteur de Coran gratuit (site web et PWA ; applications mobiles en
        préparation). Cette page décrit les données traitées.
      </p>

      <h2>1. Sans compte (stockage local)</h2>
      <p>
        Favoris, signets et notes, thème, volume, vitesse, téléchargements audio, reprise locale et
        préférences d’interface restent sur cet appareil. L’historique d’écoute et le streak ne sont
        disponibles qu’avec un compte. Aucune donnée Sawra n’est synchronisée vers le cloud tant que
        vous n’êtes pas connecté.
      </p>

      <h2>2. Avec un compte GoMuslimLife</h2>
      <p>
        Un même compte sert pour Sawra et{' '}
        <a href="https://gomuslimlife.com">gomuslimlife.com</a>. Sur Sawra, nous synchronisons entre
        vos appareils : favoris, signets / notes, reprise (y compris par sourate), historique /
        streak, préférences lecteur et boucle de sourates, via Supabase. Pas de publicité, pas de
        revente.
      </p>
      <p>
        Vous pouvez supprimer votre compte depuis Compte / Connexion : confirmation en tapant «
        supprimer », puis validation (droit d’effacement — le compte GoMuslimLife associé est aussi
        fermé). Les jours d’écoute suivent le fuseau de l’appareil au moment de l’écoute ; un
        changement de fuseau n’est pas recalculé a posteriori.
      </p>

      <h2>3. Hébergement & mesures d’usage</h2>
      <p>
        sawra.app est hébergé sur Vercel. En production : Vercel Analytics / Speed Insights
        (performance) et PostHog en région UE (pages vues, événements d’usage, erreurs). Si vous êtes
        connecté, l’identifiant compte (et éventuellement e-mail / nom affiché) peut être associé à
        PostHog.
      </p>
      <p>
        Vous pouvez refuser les analytics produit (PostHog) dans Options → Confidentialité, sur cet
        appareil. Les mesures de performance Vercel ne sont pas couvertes par ce réglage. Sawra ne
        vend pas vos données et n’utilise pas de publicité ciblée.
      </p>

      <h2>4. Audio & hors-ligne</h2>
      <p>
        Récitations via <a href="https://www.mp3quran.net">mp3quran.net</a> — Sawra n’héberge pas les
        fichiers audio. Les téléchargements restent locaux tant que le cache n’est pas vidé (pas de
        sauvegarde cloud des MP3).
      </p>

      <p>
        Éditeur : <a href="https://sofianeweb.fr">sofianeweb.fr</a> · compte :{' '}
        <a href="https://gomuslimlife.com">GoMuslimLife.com</a>.
      </p>
      <p>
        Voir aussi : <Link href="/sources">Sources</Link> · <Link href="/terms">Conditions</Link>
      </p>
    </LegalDocument>
  );
}
