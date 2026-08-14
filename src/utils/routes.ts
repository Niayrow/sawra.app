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

export type MorePanel = 'downloads' | 'legal' | 'priorities' | 'compare' | 'about';
export type LegalSub = 'sources' | 'privacy' | 'terms';

export type AppLocation = {
  tab: TabId;
  morePanel: MorePanel;
  legalSub: LegalSub;
  /** True when URL used legacy query params (caller should replaceState to clean path). */
  fromLegacyQuery: boolean;
};

export const MORE_PANEL_IDS: MorePanel[] = [
  'downloads',
  'legal',
  'priorities',
  'compare',
  'about',
];
export const LEGAL_SUB_IDS: LegalSub[] = ['sources', 'privacy', 'terms'];

export const isMorePanel = (value: string | null): value is MorePanel =>
  Boolean(value && MORE_PANEL_IDS.includes(value as MorePanel));

export const isLegalSub = (value: string | null): value is LegalSub =>
  Boolean(value && LEGAL_SUB_IDS.includes(value as LegalSub));

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
  '/informations/sources',
  '/informations/confidentialite',
  '/informations/conditions',
] as const;

const normalizePath = (pathname: string): string => {
  if (!pathname || pathname === '/') return '/';
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
};

export const resolveMoreNavigation = (
  raw: string | null,
): { panel: MorePanel; legalSub?: LegalSub } => {
  if (raw === 'downloads') return { panel: 'downloads' };
  if (raw === 'sources' || raw === 'privacy' || raw === 'terms') {
    return { panel: 'legal', legalSub: raw };
  }
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
    case 'sources':
    case 'privacy':
    case 'terms':
    case 'legal':
    case 'downloads':
      return 'more';
    case 'home':
    default:
      return 'home';
  }
};

export const pathForView = (
  tab: TabId,
  morePanel?: MorePanel | null,
  legalSub?: LegalSub | null,
): string => {
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
          return '/options';
        case 'legal':
          if (legalSub === 'privacy') return '/informations/confidentialite';
          if (legalSub === 'terms') return '/informations/conditions';
          return '/informations/sources';
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
      return { tab: 'home', morePanel: 'downloads', legalSub: 'sources', fromLegacyQuery: false };
    case '/ecouter':
    case '/listen':
      return { tab: 'listen', morePanel: 'downloads', legalSub: 'sources', fromLegacyQuery: false };
    case '/bibliotheque':
    case '/favorites':
    case '/library':
      return {
        tab: 'favorites',
        morePanel: 'downloads',
        legalSub: 'sources',
        fromLegacyQuery: false,
      };
    case '/quiz':
      return { tab: 'quiz', morePanel: 'downloads', legalSub: 'sources', fromLegacyQuery: false };
    case '/apprendre':
    case '/learn':
      return { tab: 'learn', morePanel: 'downloads', legalSub: 'sources', fromLegacyQuery: false };
    case '/radio':
      return { tab: 'radio', morePanel: 'downloads', legalSub: 'sources', fromLegacyQuery: false };
    case '/compte':
    case '/account':
      return { tab: 'account', morePanel: 'downloads', legalSub: 'sources', fromLegacyQuery: false };
    case '/a-propos':
    case '/about':
      return { tab: 'more', morePanel: 'about', legalSub: 'sources', fromLegacyQuery: false };
    case '/comparer':
    case '/compare':
      return { tab: 'more', morePanel: 'compare', legalSub: 'sources', fromLegacyQuery: false };
    case '/telechargements':
    case '/downloads':
      return { tab: 'more', morePanel: 'downloads', legalSub: 'sources', fromLegacyQuery: false };
    case '/options':
    case '/priorities':
      return { tab: 'more', morePanel: 'priorities', legalSub: 'sources', fromLegacyQuery: false };
    case '/informations/sources':
      return { tab: 'more', morePanel: 'legal', legalSub: 'sources', fromLegacyQuery: false };
    case '/informations/confidentialite':
      return { tab: 'more', morePanel: 'legal', legalSub: 'privacy', fromLegacyQuery: false };
    case '/informations/conditions':
      return { tab: 'more', morePanel: 'legal', legalSub: 'terms', fromLegacyQuery: false };
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

  if (
    tab === 'compare' ||
    tab === 'about' ||
    tab === 'sources' ||
    tab === 'privacy' ||
    tab === 'terms' ||
    tab === 'downloads' ||
    tab === 'legal'
  ) {
    const resolved = resolveMoreNavigation(tab);
    let panel = resolved.panel;
    if (sectionParam === 'downloads') panel = 'downloads';
    const legalSub =
      panel === 'legal' && isLegalSub(sectionParam)
        ? sectionParam
        : (resolved.legalSub ?? 'sources');
    return { tab: 'more', morePanel: panel, legalSub, fromLegacyQuery: true };
  }

  if (tab === 'account' || tab === 'profile' || panelParam === 'account' || panelParam === 'profile') {
    return {
      tab: 'account',
      morePanel: 'downloads',
      legalSub: 'sources',
      fromLegacyQuery: true,
    };
  }

  if (panelParam) {
    const resolved = resolveMoreNavigation(panelParam);
    let panel = resolved.panel;
    if (sectionParam === 'downloads') panel = 'downloads';
    const legalSub =
      panel === 'legal' && isLegalSub(sectionParam)
        ? sectionParam
        : (resolved.legalSub ?? 'sources');
    return { tab: 'more', morePanel: panel, legalSub, fromLegacyQuery: true };
  }

  if (tab) {
    const mapped = mapLegacyTab(tab);
    if (mapped === 'more') {
      const resolved = resolveMoreNavigation(tab);
      return {
        tab: 'more',
        morePanel: resolved.panel,
        legalSub: resolved.legalSub ?? 'sources',
        fromLegacyQuery: true,
      };
    }
    return {
      tab: mapped,
      morePanel: 'downloads',
      legalSub: 'sources',
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
    // Clean path but leftover ?tab= → still treat as legacy for cleanup
    const hasLegacy =
      new URLSearchParams(search).has('tab') ||
      new URLSearchParams(search).has('panel') ||
      new URLSearchParams(search).has('section');
    if (hasLegacy) return { ...fromPath, fromLegacyQuery: true };
    return fromPath;
  }

  const fromQuery = parseLegacyQuery(search);
  if (fromQuery) return fromQuery;

  // Unknown path on SPA shell → home (Vercel should 404 unknown before this)
  return { tab: 'home', morePanel: 'downloads', legalSub: 'sources', fromLegacyQuery: false };
};

export const getInitialAppLocation = (): AppLocation => {
  if (typeof window === 'undefined') {
    return { tab: 'home', morePanel: 'downloads', legalSub: 'sources', fromLegacyQuery: false };
  }
  return parseLocation(window.location.pathname, window.location.search);
};
