/**
 * SEO documents (titles, descriptions, canonicals) consumed by Next.js generateMetadata.
 */
import { pathForView, type LegalSub, type MorePanel, type TabId } from './routes';

export type SeoBreadcrumb = {
  name: string;
  path: string;
};

export type SeoDoc = {
  title: string;
  description: string;
  path: string;
  canonical: string;
  robots?: 'index' | 'noindex';
  breadcrumbs?: SeoBreadcrumb[];
};

const SITE_ORIGIN = 'https://sawra.app';

const absoluteUrl = (path: string) => {
  if (path.startsWith('http')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_ORIGIN}${normalized}`;
};

const path = (tab: TabId, morePanel?: MorePanel | null, legalSub?: LegalSub | null) =>
  pathForView(tab, morePanel, legalSub);

export const SEO_HOME: SeoDoc = {
  title: 'Sawra — Écouter le Coran en ligne gratuitement | Sans publicité',
  description:
    'Écoutez le Coran en streaming avec les grands récitateurs (Al-Afasy, Soudais, Minshawi…). Bibliothèque, Quiz, Apprendre, hors-ligne et sync multi-appareils. Gratuit, sans pub.',
  path: '/',
  canonical: absoluteUrl('/'),
  breadcrumbs: [{ name: 'Accueil', path: '/' }],
};

type SeoViewKey =
  | 'home'
  | 'listen'
  | 'favorites'
  | 'account'
  | 'about'
  | 'compare'
  | 'downloads'
  | 'legal'
  | 'legal-sources'
  | 'legal-privacy'
  | 'legal-terms'
  | 'priorities'
  | 'quiz'
  | 'learn'
  | 'radio';

const SEO_BY_VIEW: Record<SeoViewKey, SeoDoc> = {
  home: SEO_HOME,
  listen: {
    title: 'Récitateurs du Coran — Écouter en streaming | Sawra',
    description:
      'Parcourez les récitateurs et sourates : Al-Afasy, Soudais, Minshawi et bien d’autres. Écoute gratuite du Coran, sans publicité, sur Sawra.',
    path: path('listen'),
    canonical: absoluteUrl(path('listen')),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Écouter', path: path('listen') },
    ],
  },
  favorites: {
    title: 'Bibliothèque Coran — Signets, historique, voix | Sawra',
    description:
      'Retrouvez vos versets signés, votre historique d’écoute et vos récitateurs favoris. Sync multi-appareils avec un compte Sawra / GoMuslimLife.',
    path: path('favorites'),
    canonical: absoluteUrl(path('favorites')),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Bibliothèque', path: path('favorites') },
    ],
  },
  account: {
    title: 'Compte Sawra — Sync favoris et reprise',
    description:
      'Connectez-vous pour synchroniser favoris, reprise de lecture et préférences entre vos appareils.',
    path: path('account'),
    canonical: absoluteUrl(path('account')),
    robots: 'noindex',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Compte', path: path('account') },
    ],
  },
  about: {
    title: 'À propos de Sawra — Lecteur coranique gratuit v1.6',
    description:
      'Sawra est un lecteur coranique web et PWA : streaming mp3quran.net, Bibliothèque, Quiz, Apprendre, hors-ligne, sync, 100 % gratuit et sans publicité.',
    path: path('more', 'about'),
    canonical: absoluteUrl(path('more', 'about')),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'À propos', path: path('more', 'about') },
    ],
  },
  compare: {
    title: 'Comparer des récitateurs du Coran | Sawra',
    description:
      'Comparez deux récitateurs sur la même sourate et choisissez la voix qui vous convient. Gratuit, sans publicité.',
    path: path('more', 'compare'),
    canonical: absoluteUrl(path('more', 'compare')),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Comparer', path: path('more', 'compare') },
    ],
  },
  downloads: {
    title: 'Sourates téléchargées — Écoute hors-ligne | Sawra',
    description:
      'Accédez aux sourates téléchargées sur cet appareil pour écouter le Coran hors connexion.',
    path: path('more', 'downloads'),
    canonical: absoluteUrl(path('more', 'downloads')),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Téléchargements', path: path('more', 'downloads') },
    ],
  },
  legal: {
    title: 'Sources, confidentialité et conditions — Sawra',
    description:
      'Sources audio (mp3quran.net), politique de confidentialité et conditions d’utilisation de Sawra.',
    path: path('more', 'legal', 'sources'),
    canonical: absoluteUrl(path('more', 'legal', 'sources')),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Informations légales', path: path('more', 'legal', 'sources') },
    ],
  },
  'legal-sources': {
    title: 'Sources & licences audio — Sawra',
    description:
      'Provenance des enregistrements Coran (mp3quran.net), statut des fichiers et conditions d’usage sur Sawra.',
    path: path('more', 'legal', 'sources'),
    canonical: absoluteUrl(path('more', 'legal', 'sources')),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Sources & licences', path: path('more', 'legal', 'sources') },
    ],
  },
  'legal-privacy': {
    title: 'Confidentialité — Sawra | Données et compte',
    description:
      'Politique de confidentialité Sawra : stockage local, sync compte GoMuslimLife, historique, streak, suppression de compte. Gratuit, sans pub.',
    path: path('more', 'legal', 'privacy'),
    canonical: absoluteUrl(path('more', 'legal', 'privacy')),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Confidentialité', path: path('more', 'legal', 'privacy') },
    ],
  },
  'legal-terms': {
    title: 'Conditions d’utilisation — Sawra',
    description:
      'Règles d’usage de Sawra : écoute personnelle, hors-ligne, sync compte, limites techniques. Lecteur coranique gratuit.',
    path: path('more', 'legal', 'terms'),
    canonical: absoluteUrl(path('more', 'legal', 'terms')),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Conditions', path: path('more', 'legal', 'terms') },
    ],
  },
  priorities: {
    title: 'Options Sawra — Navbar flottante ou pleine',
    description:
      'Choisissez le style de la barre de navigation et de lecture sur ordinateur : flottante ou pleine largeur.',
    path: path('more', 'priorities'),
    canonical: absoluteUrl(path('more', 'priorities')),
    robots: 'noindex',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Options', path: path('more', 'priorities') },
    ],
  },
  quiz: {
    title: 'Quiz Coran — Devinez la sourate | Sawra',
    description:
      'Écoutez un verset et trouvez de quelle sourate il vient. Quiz gratuit du Coran, sans publicité, sur Sawra.',
    path: path('quiz'),
    canonical: absoluteUrl(path('quiz')),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Quiz', path: path('quiz') },
    ],
  },
  learn: {
    title: 'Apprendre le Coran — Flou, écoute, révélation | Sawra',
    description:
      'Entraînez-vous verset par verset : écoutez, récitez à voix haute, puis révélez le texte. Apprentissage gratuit du Coran sur Sawra.',
    path: path('learn'),
    canonical: absoluteUrl(path('learn')),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Apprendre', path: path('learn') },
    ],
  },
  radio: {
    title: 'Radio Coran — Stations en continu | Sawra',
    description:
      'Écoutez le Coran en continu avec des stations curatées : Juz Amma, sourates du cœur, nuit paisible et plus. Gratuit, sans publicité.',
    path: path('radio'),
    canonical: absoluteUrl(path('radio')),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Radio', path: path('radio') },
    ],
  },
};

export type { LegalSub };

export const resolveSeoForView = (
  tab: string,
  morePanel?: string | null,
  legalSub?: LegalSub | null,
): SeoDoc => {
  if (tab === 'more' && morePanel === 'legal' && legalSub) {
    const key = `legal-${legalSub}` as SeoViewKey;
    if (SEO_BY_VIEW[key]) return SEO_BY_VIEW[key];
  }
  if (tab === 'more' && morePanel && SEO_BY_VIEW[morePanel as SeoViewKey]) {
    return SEO_BY_VIEW[morePanel as SeoViewKey];
  }
  return SEO_BY_VIEW[tab as SeoViewKey] ?? SEO_HOME;
};
