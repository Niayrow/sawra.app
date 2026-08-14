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
        Sawra (v1.7) est un lecteur de Coran : site web Next.js, PWA et coque Android/iOS. Cette page
        décrit les données traitées. Version interactive :{' '}
        <Link href="/informations/confidentialite">Confidentialité dans l’app</Link>.
      </p>

      <h2>1. Sans compte (stockage local)</h2>
      <p>
        Favoris, signets, notes, thème, volume, vitesse, téléchargements audio, reprise locale et
        préférences d’interface (ex. navbar flottante / pleine) restent sur l’appareil (localStorage /
        Cache Storage). L’historique d’écoute et le streak ne sont disponibles qu’avec un compte. Rien
        n’est synchronisé tant que vous n’êtes pas connecté.
      </p>

      <h2>2. Avec un compte GoMuslimLife</h2>
      <p>
        Nous synchronisons favoris, signets / notes, reprise (y compris par sourate), historique /
        streak et préférences lecteur via Supabase. Pas de publicité, pas de revente. Vous pouvez
        supprimer votre compte depuis Connexion : confirmation en tapant « supprimer », puis validation
        (droit d’effacement — le compte GoMuslimLife associé est aussi fermé).
      </p>
      <p>
        Les jours d’écoute suivent le fuseau de l’appareil au moment de l’écoute ; un changement de
        fuseau n’est pas recalculé a posteriori.
      </p>

      <h2>3. Hébergement & analytics</h2>
      <p>
        sawra.app est hébergé sur Vercel (Next.js). En production : Vercel Analytics / Speed Insights et
        PostHog (UE) pour la stabilité et l’usage produit, sans publicité ciblée. Sawra ne vend pas vos
        données.
      </p>

      <h2>4. Audio & hors-ligne</h2>
      <p>
        Récitations via <a href="https://www.mp3quran.net">mp3quran.net</a> — Sawra n’héberge pas les MP3.
        Les téléchargements restent locaux tant que le cache n’est pas vidé.
      </p>

      <p>
        Éditeur : <a href="https://sofianeweb.fr">sofianeweb.fr</a> · compte :{' '}
        <a href="https://gomuslimlife.com">GoMuslimLife.com</a>.
      </p>
      <p>
        <Link href="/informations/confidentialite">Ouvrir dans l’app →</Link>
      </p>
    </LegalDocument>
  );
}
