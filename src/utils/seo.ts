/**
 * Document SEO helpers for SPA tab changes (title, description, canonical, og:url, robots, breadcrumbs).
 */
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
    path: '/?tab=listen',
    canonical: absoluteUrl('/?tab=listen'),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Écouter', path: '/?tab=listen' },
    ],
  },
  favorites: {
    title: 'Bibliothèque Coran — Signets, historique, voix | Sawra',
    description:
      'Retrouvez vos versets signés, votre historique d’écoute et vos récitateurs favoris. Sync multi-appareils avec un compte Sawra / GoMuslimLife.',
    path: '/?tab=favorites',
    canonical: absoluteUrl('/?tab=favorites'),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Bibliothèque', path: '/?tab=favorites' },
    ],
  },
  account: {
    title: 'Compte Sawra — Sync favoris et reprise',
    description:
      'Connectez-vous pour synchroniser favoris, reprise de lecture et préférences entre vos appareils.',
    path: '/?tab=account',
    canonical: absoluteUrl('/?tab=account'),
    robots: 'noindex',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Compte', path: '/?tab=account' },
    ],
  },
  about: {
    title: 'À propos de Sawra — Lecteur coranique gratuit v1.6',
    description:
      'Sawra est un lecteur coranique web et PWA : streaming mp3quran.net, Bibliothèque, Quiz, Apprendre, hors-ligne, sync, 100 % gratuit et sans publicité.',
    path: '/?tab=more&panel=about',
    canonical: absoluteUrl('/?tab=more&panel=about'),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'À propos', path: '/?tab=more&panel=about' },
    ],
  },
  compare: {
    title: 'Comparer des récitateurs du Coran | Sawra',
    description:
      'Comparez deux récitateurs sur la même sourate et choisissez la voix qui vous convient. Gratuit, sans publicité.',
    path: '/?tab=more&panel=compare',
    canonical: absoluteUrl('/?tab=more&panel=compare'),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Comparer', path: '/?tab=more&panel=compare' },
    ],
  },
  downloads: {
    title: 'Sourates téléchargées — Écoute hors-ligne | Sawra',
    description:
      'Accédez aux sourates téléchargées sur cet appareil pour écouter le Coran hors connexion.',
    path: '/?tab=more&panel=downloads',
    canonical: absoluteUrl('/?tab=more&panel=downloads'),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Téléchargements', path: '/?tab=more&panel=downloads' },
    ],
  },
  legal: {
    title: 'Sources, confidentialité et conditions — Sawra',
    description:
      'Sources audio (mp3quran.net), politique de confidentialité et conditions d’utilisation de Sawra.',
    path: '/?tab=more&panel=legal&section=sources',
    canonical: absoluteUrl('/?tab=more&panel=legal&section=sources'),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Informations légales', path: '/?tab=more&panel=legal&section=sources' },
    ],
  },
  'legal-sources': {
    title: 'Sources & licences audio — Sawra',
    description:
      'Provenance des enregistrements Coran (mp3quran.net), statut des fichiers et conditions d’usage sur Sawra.',
    path: '/?tab=more&panel=legal&section=sources',
    canonical: absoluteUrl('/?tab=more&panel=legal&section=sources'),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Sources & licences', path: '/?tab=more&panel=legal&section=sources' },
    ],
  },
  'legal-privacy': {
    title: 'Confidentialité — Sawra | Données et compte',
    description:
      'Politique de confidentialité Sawra : stockage local, sync compte GoMuslimLife, historique, streak, suppression de compte. Gratuit, sans pub.',
    path: '/?tab=more&panel=legal&section=privacy',
    canonical: absoluteUrl('/?tab=more&panel=legal&section=privacy'),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Confidentialité', path: '/?tab=more&panel=legal&section=privacy' },
    ],
  },
  'legal-terms': {
    title: 'Conditions d’utilisation — Sawra',
    description:
      'Règles d’usage de Sawra : écoute personnelle, hors-ligne, sync compte, limites techniques. Lecteur coranique gratuit.',
    path: '/?tab=more&panel=legal&section=terms',
    canonical: absoluteUrl('/?tab=more&panel=legal&section=terms'),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Conditions', path: '/?tab=more&panel=legal&section=terms' },
    ],
  },
  priorities: {
    title: 'Options Sawra — Préférences du lecteur',
    description:
      'Réglez les options et priorités de votre lecteur coranique Sawra.',
    path: '/?tab=more&panel=priorities',
    canonical: absoluteUrl('/?tab=more&panel=priorities'),
    robots: 'noindex',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Options', path: '/?tab=more&panel=priorities' },
    ],
  },
  quiz: {
    title: 'Quiz Coran — Devinez la sourate | Sawra',
    description:
      'Écoutez un verset et trouvez de quelle sourate il vient. Quiz gratuit du Coran, sans publicité, sur Sawra.',
    path: '/?tab=quiz',
    canonical: absoluteUrl('/?tab=quiz'),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Quiz', path: '/?tab=quiz' },
    ],
  },
  learn: {
    title: 'Apprendre le Coran — Flou, écoute, révélation | Sawra',
    description:
      'Entraînez-vous verset par verset : écoutez, récitez à voix haute, puis révélez le texte. Apprentissage gratuit du Coran sur Sawra.',
    path: '/?tab=learn',
    canonical: absoluteUrl('/?tab=learn'),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Apprendre', path: '/?tab=learn' },
    ],
  },
  radio: {
    title: 'Radio Coran — Stations en continu | Sawra',
    description:
      'Écoutez le Coran en continu avec des stations curatées : Juz Amma, sourates du cœur, nuit paisible et plus. Gratuit, sans publicité.',
    path: '/?tab=radio',
    canonical: absoluteUrl('/?tab=radio'),
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Radio', path: '/?tab=radio' },
    ],
  },
};

const BREADCRUMB_SCRIPT_ID = 'sawra-breadcrumb-jsonld';

const setMetaContent = (selector: string, content: string, attr = 'content') => {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, content);
};

const ensureLink = (rel: string, href: string) => {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
};

const applyRobotsMeta = (robots: 'index' | 'noindex') => {
  const content =
    robots === 'noindex'
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  setMetaContent('meta[name="robots"]', content);
  setMetaContent('meta[name="googlebot"]', content);
};

const applyBreadcrumbJsonLd = (breadcrumbs?: SeoBreadcrumb[]) => {
  const existing = document.getElementById(BREADCRUMB_SCRIPT_ID) as HTMLScriptElement | null;
  if (!breadcrumbs?.length) {
    existing?.remove();
    return;
  }

  const script = existing ?? document.createElement('script');
  script.id = BREADCRUMB_SCRIPT_ID;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  });

  if (!existing) document.head.appendChild(script);
};

export const applyDocumentSeo = (doc: SeoDoc) => {
  if (typeof document === 'undefined') return;

  document.title = doc.title;
  setMetaContent('meta[name="description"]', doc.description);
  setMetaContent('meta[property="og:title"]', doc.title);
  setMetaContent('meta[property="og:description"]', doc.description);
  setMetaContent('meta[property="og:url"]', doc.canonical);
  setMetaContent('meta[name="twitter:title"]', doc.title);
  setMetaContent('meta[name="twitter:description"]', doc.description);

  ensureLink('canonical', doc.canonical);
  applyRobotsMeta(doc.robots ?? 'index');
  applyBreadcrumbJsonLd(doc.breadcrumbs);
};

export type LegalSub = 'sources' | 'privacy' | 'terms';

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
