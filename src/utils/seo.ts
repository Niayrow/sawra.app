/**
 * Document SEO helpers for SPA tab changes (title + description meta).
 */
export type SeoDoc = {
  title: string;
  description: string;
};

export const SEO_HOME: SeoDoc = {
  title: 'Sawra — Écouter le Coran en ligne gratuitement | Sans publicité',
  description:
    'Écoutez le Coran en streaming avec les grands récitateurs (Al-Afasy, Soudais, Minshawi…). Lecteur gratuit, sans pub, téléchargement hors-ligne et sync multi-appareils. Essayez Sawra.',
};

const SEO_BY_VIEW: Record<string, SeoDoc> = {
  home: SEO_HOME,
  listen: {
    title: 'Récitateurs du Coran — Écouter en streaming | Sawra',
    description:
      'Parcourez les récitateurs et sourates : Al-Afasy, Soudais, Minshawi et bien d’autres. Écoute gratuite du Coran, sans publicité, sur Sawra.',
  },
  moments: {
    title: 'Moments du Coran — Sélections audio | Sawra',
    description:
      'Découvrez des moments et sélections audio du Coran pour une écoute rapide, gratuite et sans publicité.',
  },
  favorites: {
    title: 'Favoris Coran — Vos récitateurs | Sawra',
    description:
      'Retrouvez vos récitateurs et sourates favoris. Sync multi-appareils disponible avec un compte Sawra / GoMuslimLife.',
  },
  account: {
    title: 'Compte Sawra — Sync favoris et reprise',
    description:
      'Connectez-vous pour synchroniser favoris, reprise de lecture et préférences entre vos appareils.',
  },
  about: {
    title: 'À propos de Sawra — Lecteur coranique gratuit',
    description:
      'Sawra est un lecteur coranique web et PWA : streaming mp3quran.net, hors-ligne, sync, 100 % gratuit et sans publicité.',
  },
  compare: {
    title: 'Comparer des récitateurs du Coran | Sawra',
    description:
      'Comparez deux récitateurs sur la même sourate et choisissez la voix qui vous convient. Gratuit, sans publicité.',
  },
  downloads: {
    title: 'Sourates téléchargées — Écoute hors-ligne | Sawra',
    description:
      'Accédez aux sourates téléchargées sur cet appareil pour écouter le Coran hors connexion.',
  },
  legal: {
    title: 'Sources, confidentialité et conditions — Sawra',
    description:
      'Sources audio (mp3quran.net), politique de confidentialité et conditions d’utilisation de Sawra.',
  },
  priorities: {
    title: 'Options Sawra — Préférences du lecteur',
    description:
      'Réglez les options et priorités de votre lecteur coranique Sawra.',
  },
  quiz: {
    title: 'Quiz Coran — Devinez la sourate | Sawra',
    description:
      'Écoutez un verset et trouvez de quelle sourate il vient. Quiz gratuit du Coran, sans publicité, sur Sawra.',
  },
};

const setMetaContent = (selector: string, content: string, attr = 'content') => {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, content);
};

export const applyDocumentSeo = (doc: SeoDoc) => {
  if (typeof document === 'undefined') return;
  document.title = doc.title;
  setMetaContent('meta[name="description"]', doc.description);
  setMetaContent('meta[property="og:title"]', doc.title);
  setMetaContent('meta[property="og:description"]', doc.description);
  setMetaContent('meta[name="twitter:title"]', doc.title);
  setMetaContent('meta[name="twitter:description"]', doc.description);
};

export const resolveSeoForView = (
  tab: string,
  morePanel?: string | null,
): SeoDoc => {
  if (tab === 'more' && morePanel && SEO_BY_VIEW[morePanel]) {
    return SEO_BY_VIEW[morePanel];
  }
  return SEO_BY_VIEW[tab] ?? SEO_HOME;
};
