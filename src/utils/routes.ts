/**
 * Path-based SPA routing (French ASCII slugs).
 * Legacy `?tab=` / `?panel=` / `?section=` query URLs are still parsed for redirects.
 */

export const TAB_IDS = [
  'home',
  'listen',
  'favorites',
  'account',
  'more',
  'quiz',
  'learn',
  'radio',
] as const;
export type TabId = (typeof TAB_IDS)[number];

export type MorePanel = 'downloads' | 'priorities' | 'compare' | 'about';

export type AppLocation = {
  tab: TabId;
  morePanel: MorePanel;
  /** True when URL used legacy query params (caller should replaceState to clean path). */
  fromLegacyQuery: boolean;
};

export const MORE_PANEL_IDS: MorePanel[] = [
  'downloads',
  'priorities',
  'compare',
  'about',
];

export const isMorePanel = (value: string | null): value is MorePanel =>
  Boolean(value && MORE_PANEL_IDS.includes(value as MorePanel));

/** Standalone legal pages (outside the SPA shell). */
export const LEGAL_PATHS = ['/sources', '/privacy', '/terms'] as const;
export type LegalPath = (typeof LEGAL_PATHS)[number];

export const isLegalPath = (value: string): value is LegalPath =>
  (LEGAL_PATHS as readonly string[]).includes(value);

export const isSpaPath = (pathname: string): boolean => {
  const path = pathname.replace(/\/+$/, '') || '/';
  return (SPA_PATHS as readonly string[]).includes(path);
};

/** Known SPA pathnames (normalized, no trailing slash except root). */
export const SPA_PATHS = [
  '/',
  '/ecouter',
  '/bibliotheque',
  '/quiz',
  '/apprendre',
  '/radio',
  '/compte',
  '/a-propos',
  '/comparer',
  '/telechargements',
  '/options',
] as const;

const normalizePath = (pathname: string): string => {
  if (!pathname || pathname === '/') return '/';
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
};

export const resolveMoreNavigation = (raw: string | null): { panel: MorePanel } => {
  if (raw === 'downloads') return { panel: 'downloads' };
  if (isMorePanel(raw)) return { panel: raw };
  return { panel: 'downloads' };
};

export const mapLegacyTab = (tab: string | null): TabId => {
  switch (tab) {
    case 'listen':
    case 'reciters':
    case 'surahs':
      return 'listen';
    case 'moments':
    case 'ayah':
    case 'everyayah':
      return 'home';
    case 'quiz':
      return 'quiz';
    case 'learn':
      return 'learn';
    case 'radio':
      return 'radio';
    case 'favorites':
      return 'favorites';
    case 'account':
    case 'profile':
      return 'account';
    case 'more':
    case 'compare':
    case 'about':
    case 'downloads':
      return 'more';
    case 'home':
    default:
      return 'home';
  }
};

/** Legacy legal query/path → standalone page. */
export const legacyLegalHref = (raw: string | null | undefined): LegalPath | null => {
  switch (raw) {
    case 'privacy':
    case 'confidentialite':
      return '/privacy';
    case 'terms':
    case 'conditions':
      return '/terms';
    case 'sources':
    case 'legal':
      return '/sources';
    default:
      return null;
  }
};

export const pathForView = (tab: TabId, morePanel?: MorePanel | null): string => {
  switch (tab) {
    case 'listen':
      return '/ecouter';
    case 'favorites':
      return '/bibliotheque';
    case 'quiz':
      return '/quiz';
    case 'learn':
      return '/apprendre';
    case 'radio':
      return '/radio';
    case 'account':
      return '/compte';
    case 'more':
      switch (morePanel) {
        case 'about':
          return '/a-propos';
        case 'compare':
          return '/comparer';
        case 'downloads':
          return '/telechargements';
        case 'priorities':
        default:
          return '/options';
      }
    case 'home':
    default:
      return '/';
  }
};

const parsePathname = (pathname: string): AppLocation | null => {
  const path = normalizePath(pathname);
  switch (path) {
    case '/':
    case '/home':
      return { tab: 'home', morePanel: 'downloads', fromLegacyQuery: false };
    case '/ecouter':
    case '/listen':
      return { tab: 'listen', morePanel: 'downloads', fromLegacyQuery: false };
    case '/bibliotheque':
    case '/favorites':
    case '/library':
      return { tab: 'favorites', morePanel: 'downloads', fromLegacyQuery: false };
    case '/quiz':
      return { tab: 'quiz', morePanel: 'downloads', fromLegacyQuery: false };
    case '/apprendre':
    case '/learn':
      return { tab: 'learn', morePanel: 'downloads', fromLegacyQuery: false };
    case '/radio':
      return { tab: 'radio', morePanel: 'downloads', fromLegacyQuery: false };
    case '/compte':
    case '/account':
      return { tab: 'account', morePanel: 'downloads', fromLegacyQuery: false };
    case '/a-propos':
    case '/about':
      return { tab: 'more', morePanel: 'about', fromLegacyQuery: false };
    case '/comparer':
    case '/compare':
      return { tab: 'more', morePanel: 'compare', fromLegacyQuery: false };
    case '/telechargements':
    case '/downloads':
      return { tab: 'more', morePanel: 'downloads', fromLegacyQuery: false };
    case '/options':
    case '/priorities':
      return { tab: 'more', morePanel: 'priorities', fromLegacyQuery: false };
    default:
      return null;
  }
};

const parseLegacyQuery = (search: string): AppLocation | null => {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  const panelParam = params.get('panel');
  const sectionParam = params.get('section');

  if (!tab && !panelParam && !sectionParam) return null;

  // Legal legacy → leave to Next redirects / caller; treat as home cleanup
  if (
    legacyLegalHref(tab) ||
    legacyLegalHref(sectionParam) ||
    panelParam === 'legal' ||
    tab === 'legal' ||
    tab === 'sources' ||
    tab === 'privacy' ||
    tab === 'terms'
  ) {
    return { tab: 'home', morePanel: 'downloads', fromLegacyQuery: true };
  }

  if (tab === 'compare' || tab === 'about' || tab === 'downloads') {
    const resolved = resolveMoreNavigation(tab);
    let panel = resolved.panel;
    if (sectionParam === 'downloads') panel = 'downloads';
    return { tab: 'more', morePanel: panel, fromLegacyQuery: true };
  }

  if (tab === 'account' || tab === 'profile' || panelParam === 'account' || panelParam === 'profile') {
    return {
      tab: 'account',
      morePanel: 'downloads',
      fromLegacyQuery: true,
    };
  }

  if (panelParam) {
    const resolved = resolveMoreNavigation(panelParam);
    let panel = resolved.panel;
    if (sectionParam === 'downloads') panel = 'downloads';
    return { tab: 'more', morePanel: panel, fromLegacyQuery: true };
  }

  if (tab) {
    const mapped = mapLegacyTab(tab);
    if (mapped === 'more') {
      const resolved = resolveMoreNavigation(tab);
      return {
        tab: 'more',
        morePanel: resolved.panel,
        fromLegacyQuery: true,
      };
    }
    return {
      tab: mapped,
      morePanel: 'downloads',
      fromLegacyQuery: true,
    };
  }

  return null;
};

export const parseLocation = (
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '/',
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): AppLocation => {
  const fromPath = parsePathname(pathname);
  if (fromPath) {
    const hasLegacy =
      new URLSearchParams(search).has('tab') ||
      new URLSearchParams(search).has('panel') ||
      new URLSearchParams(search).has('section');
    if (hasLegacy) return { ...fromPath, fromLegacyQuery: true };
    return fromPath;
  }

  const fromQuery = parseLegacyQuery(search);
  if (fromQuery) return fromQuery;

  return { tab: 'home', morePanel: 'downloads', fromLegacyQuery: false };
};

export const getInitialAppLocation = (): AppLocation => {
  if (typeof window === 'undefined') {
    return { tab: 'home', morePanel: 'downloads', fromLegacyQuery: false };
  }
  return parseLocation(window.location.pathname, window.location.search);
};
