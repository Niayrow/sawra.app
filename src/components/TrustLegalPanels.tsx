import React from 'react';
import {
  BookOpen, Cloud, Database, ExternalLink, FileText, HardDrive, Scale, Shield, WifiOff,
} from '../icons/motion';

/** Mot important — accent cuivre */
const Em: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[#e2d0ba]">{children}</span>
);

/** Mot super important — cuivre gras */
const Strong: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <strong className="font-bold text-[#e6d5c2]">{children}</strong>
);

const Section: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, children }) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e2d0ba]/10 text-[#e2d0ba]">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <h3 className="text-base font-bold tracking-tight text-[#f6f8fb]">{title}</h3>
    </div>
    <div className="flex flex-col gap-3 border-l border-[#bfa078]/25 pl-4 ml-3.5 text-sm leading-[1.7] text-[#b4c0ce]">
      {children}
    </div>
  </section>
);

const PanelHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <header className="pb-5 border-b border-[#30455c]/55">
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#bfa078]">Informations</p>
    <h2 className="mt-2 text-[1.35rem] font-black tracking-tight text-[#f6f8fb]">{title}</h2>
    <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#aab7c5]">{subtitle}</p>
    <p className="mt-3 text-xs text-[#8295aa]">Dernière mise à jour · 30 juil. 2026</p>
  </header>
);

const LinkOut: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 font-bold text-[#e6d5c2] underline-offset-2 hover:underline"
  >
    {children}
    <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
  </a>
);

export const SourcesPanel: React.FC = () => (
  <article className="flex flex-col gap-8 pb-10">
    <PanelHeader
      title="Sources & licences"
      subtitle="Provenance des enregistrements audio, statut des fichiers et conditions d’usage."
    />

    <Section icon={BookOpen} title="Source audio principale">
      <p>
        Les récitations sont fournies via le catalogue public{' '}
        <LinkOut href="https://www.mp3quran.net">mp3quran.net</LinkOut>
        {' '}(<Em>API v3</Em> et serveurs audio associés).
      </p>
      <p>
        Sawra <Strong>n’héberge pas</Strong> les fichiers MP3 : le lecteur charge l’URL fournie par le catalogue
        (ex. <code className="rounded bg-[#132031]/80 px-1.5 py-0.5 font-mono text-[12px] font-bold text-[#e6d5c2]">serverN.mp3quran.net</code>).
      </p>
    </Section>

    <Section icon={HardDrive} title="Statut des enregistrements">
      <p>
        <Strong>Streaming en ligne</Strong>
        {' — '}Nécessite une <Em>connexion</Em>. Qualité et disponibilité dépendent des serveurs source.
      </p>
      <p>
        <Strong>Téléchargement local</Strong>
        {' — '}Une sourate n’est <Strong>hors-ligne</Strong> que si vous l’avez explicitement{' '}
        <Em>téléchargée</Em>. Le fichier reste dans le <Em>cache</Em> du navigateur / de l’appareil.
      </p>
      <p>
        <Strong>Catalogue & métadonnées</Strong>
        {' — '}Noms de récitateurs, moshaf et listes de sourates viennent de l’API ; un{' '}
        <Em>jeu de secours local</Em> peut s’afficher si le réseau est indisponible.
      </p>
    </Section>

    <Section icon={Scale} title="Licences & usage">
      <p>
        Les enregistrements appartiennent à leurs <Strong>ayants droit</Strong> et sont redistribués selon les
        conditions de <Em>mp3quran.net</Em>. Sawra les utilise pour l’écoute{' '}
        <Strong>personnelle et non commerciale</Strong>.
      </p>
      <p>
        Toute <Strong>redistribution</Strong>, extraction ou <Em>usage commercial</Em> des fichiers audio doit respecter
        les droits des récitateurs et les règles de la source. En cas de doute, consultez
        directement <LinkOut href="https://www.mp3quran.net">mp3quran.net</LinkOut>.
      </p>
      <p>
        Le <Strong>Coran</Strong> en tant que texte sacré n’est pas soumis à un droit d’auteur ; les{' '}
        <Em>enregistrements vocaux</Em> et arrangements techniques, eux, le sont.
      </p>
    </Section>
  </article>
);

export const PrivacyPanel: React.FC = () => (
  <article className="flex flex-col gap-8 pb-10">
    <PanelHeader
      title="Confidentialité"
      subtitle="Ce que Sawra stocke, ce qui reste sur votre appareil, et ce qui part sur le cloud."
    />

    <Section icon={Database} title="Sans compte (stockage local)">
      <p>
        <Em>Favoris</Em>, <Em>signets de versets</Em>, notes, thème du lecteur, volume, vitesse,
        téléchargements audio et reprise locale sont enregistrés dans le navigateur (
        <Strong>localStorage</Strong> / <Strong>Cache Storage</Strong>).{' '}
        L’<Em>historique d’écoute</Em> (temps total, calendrier, streak) n’est disponible{' '}
        <Strong>qu’avec un compte</Strong>. <Strong>Rien n’est envoyé</Strong> à un serveur tant que vous
        n’êtes pas connecté.
      </p>
      <p>
        Ces données restent sur l’appareil jusqu’à ce que vous les effaciez (vider le{' '}
        <Em>cache hors-ligne</Em>, supprimer les données du site, ou réinitialiser le navigateur).
      </p>
    </Section>

    <Section icon={Cloud} title="Avec un compte GoMuslimLife">
      <p>
        Si vous vous connectez, nous synchronisons : <Em>favoris</Em>, <Em>signets et notes</Em>,{' '}
        <Em>reprise de lecture</Em> (y compris par sourate), <Em>historique / streak</Em>, préférences
        du lecteur et sélection de boucle de sourates. <Strong>Pas de publicité</Strong>, pas de revente
        d’historique d’écoute.
      </p>
      <p>
        L’authentification et le stockage cloud passent par <Strong>Supabase</Strong>. Vous pouvez vous
        déconnecter à tout moment depuis l’onglet <Em>Compte</Em>. Vous pouvez aussi{' '}
        <Strong>supprimer votre compte et toutes vos données</Strong> (droit d’effacement) depuis cet
        écran — le compte associé GoMuslimLife est alors fermé définitivement.
      </p>
      <p>
        Les jours d’écoute suivent le <Em>fuseau de l’appareil au moment de l’écoute</Em>. Un voyage
        (changement de fuseau) n’est pas recalculé a posteriori : un saut de calendrier peut interrompre
        le streak — c’est attendu.
      </p>
    </Section>

    <Section icon={Shield} title="Mesures techniques & analytics">
      <p>
        En production, des métriques <Em>anonymes</Em> de performance (
        <Strong>Vercel Analytics</Strong> / Speed Insights) et d’usage produit (
        <Strong>PostHog</Strong>) peuvent être collectées pour améliorer la stabilité —{' '}
        <Strong>sans publicité ciblée</Strong>.
      </p>
      <p>
        Sawra <Strong>ne vend pas vos données</Strong> et n’utilise pas de réseaux publicitaires tiers pour
        monétiser l’écoute.
      </p>
    </Section>

    <Section icon={WifiOff} title="Hors-ligne & conservation">
      <p>
        Les MP3 téléchargés restent tant que le <Em>cache</Em> n’est pas vidé et que le navigateur
        ne les purge pas (espace disque limité). Ce n’est <Strong>pas un stockage illimité</Strong> ni une
        sauvegarde cloud des fichiers audio.
      </p>
    </Section>
  </article>
);

export const TermsPanel: React.FC = () => (
  <article className="flex flex-col gap-8 pb-10">
    <PanelHeader
      title="Conditions d’utilisation"
      subtitle="Règles simples pour utiliser Sawra de façon respectueuse et conforme."
    />

    <Section icon={FileText} title="Service proposé">
      <p>
        Sawra est un lecteur coranique <Strong>gratuit</Strong> (web / <Em>PWA</Em>, applications natives en préparation).
        Il permet d’écouter des récitations en <Em>streaming</Em>, de télécharger des sourates pour
        une écoute <Strong>hors-ligne locale</Strong>, et — avec un compte — de synchroniser favoris,
        signets, historique et reprise.
      </p>
    </Section>

    <Section icon={BookOpen} title="Usage attendu">
      <ul className="m-0 flex list-disc flex-col gap-2 pl-4 marker:text-[#bfa078]">
        <li>Écoute <Strong>personnelle et familiale</Strong> du Coran.</li>
        <li>Pas de contournement des sources audio ni d’<Em>extraction massive</Em> des fichiers.</li>
        <li>Pas d’<Strong>usage commercial</Strong> des enregistrements sans accord des ayants droit.</li>
        <li>Respect des lois applicables et du caractère <Em>sacré</Em> du contenu.</li>
      </ul>
    </Section>

    <Section icon={HardDrive} title="Limites techniques">
      <p>
        La disponibilité du streaming dépend des serveurs tiers (<Em>mp3quran.net</Em>). Le mode
        hors-ligne ne couvre que les sourates que vous avez <Strong>téléchargées</Strong>. La sync multi-appareils
        nécessite un <Strong>compte</Strong> et une <Em>connexion</Em>.
      </p>
      <p>
        Sawra est fourni <Strong>« en l’état »</Strong> : nous faisons de notre mieux pour la qualité, sans
        garantie d’absence d’interruption.
      </p>
    </Section>

    <Section icon={Scale} title="Contact">
      <p>
        Pour une question sur le service ou les données : site éditeur{' '}
        <LinkOut href="https://sofianeweb.fr">sofianeweb.fr</LinkOut>
        . Écosystème compte :{' '}
        <LinkOut href="https://gomuslimlife.com">GoMuslimLife.com</LinkOut>
        .
      </p>
    </Section>
  </article>
);
