import React, { useEffect, useState, useMemo, lazy, Suspense, useDeferredValue, useCallback, useRef } from 'react';
import { useAudio, AudioProvider } from './context/AudioContext';
import { AuthProvider } from './context/AuthContext';
import { ReciterCard } from './components/ReciterCard';
import { AyahSyncBadge, useTimingCatalogReady } from './components/AyahSyncBadge';
import { Navbar } from './components/Navbar';
import { 
  Search, Heart, AlertTriangle, Headphones, Play, ArrowRight,
  Bookmark, Download, ExternalLink, ChevronDown, History, Share, User, BookOpen,
  Sparkles,
} from './icons/motion';
import type { AppIcon } from './icons/motion';
import type { Moshaf, Reciter, Surah } from './types';
import { ReciterPortrait } from './components/ReciterPortrait';
import { hasLocalReciterImage } from './utils/images';
import { getReciterCategory, type ReciterCategoryId } from './data/reciterCategories';
import { ReciterCategoryGrid, ReciterCategoryModal } from './components/ReciterCategoryModal';
import { ListenReciterHeader } from './components/ListenReciterHeader';
import { BatchDownloadToast } from './components/BatchDownloadToast';
import { NavDesktopStyleToggle } from './components/NavDesktopStyleToggle';
import { DownloadedSurahsPage } from './components/DownloadedSurahsPage';
import { CloudSync } from './components/CloudSync';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { AuthPromptModal } from './components/AuthPromptModal';
import { useAuth } from './context/AuthContext';
import { getAudioUrl } from './utils/audioUrl';
import { reciterHasAyahTiming } from './utils/ayahTiming';
import { useReciterNavFusion } from './hooks/useReciterNavFusion';
import { pushRecentReciterId, readRecentReciterIds } from './utils/recentReciters';
import {
  loadNavDesktopStyle,
  saveNavDesktopStyle,
  type NavDesktopStyle,
} from './utils/navDesktopStyle';
import { applyDocumentSeo, resolveSeoForView } from './utils/seo';

const SurahList = lazy(() => import('./components/SurahList').then((module) => ({ default: module.SurahList })));
const GlobalPlayerV2 = lazy(() => import('./components/GlobalPlayerV2').then((module) => ({ default: module.GlobalPlayerV2 })));
// Legacy player kept for reference: ./components/GlobalPlayer
const AboutPanel = lazy(() => import('./components/AboutPanel').then((module) => ({ default: module.AboutPanel })));
const ReciterCompare = lazy(() => import('./components/ReciterCompare').then((module) => ({ default: module.ReciterCompare })));
const AccountPanel = lazy(() => import('./components/AccountPanel').then((module) => ({ default: module.AccountPanel })));
const SourcesPanel = lazy(() => import('./components/TrustLegalPanels').then((module) => ({ default: module.SourcesPanel })));
const PrivacyPanel = lazy(() => import('./components/TrustLegalPanels').then((module) => ({ default: module.PrivacyPanel })));
const TermsPanel = lazy(() => import('./components/TrustLegalPanels').then((module) => ({ default: module.TermsPanel })));
const QuizPage = lazy(() => import('./components/QuizPage').then((module) => ({ default: module.QuizPage })));
const LearnPage = lazy(() => import('./components/LearnPage').then((module) => ({ default: module.LearnPage })));
const TAB_IDS = ['home', 'listen', 'moments', 'favorites', 'account', 'more', 'quiz', 'learn'] as const;
type TabId = typeof TAB_IDS[number];
type MorePanel = 'downloads' | 'legal' | 'priorities' | 'compare' | 'about' | 'moments';
type LegalSub = 'sources' | 'privacy' | 'terms';
type ListenStep = 'reciters' | 'surahs';

const PRODUCT_PRIORITIES: Array<{
  id: string;
  title: string;
  summary: string;
  detail: string;
  icon: AppIcon;
}> = [
  {
    id: 'library',
    title: 'Bibliothèque personnelle',
    summary: 'Étendre les favoris vers des signets de sourates, historique et reprise ciblée.',
    detail: 'Une couche personnelle améliore fortement la fidélisation et les reprises quotidiennes.',
    icon: Bookmark,
  },
  {
    id: 'native',
    title: 'Apps natives & liste d’attente',
    summary: 'Préparer App Store / Google Play tout en renforçant l’installation PWA « écran d’accueil ».',
    detail: 'La PWA fonctionne déjà ; les stores arriveront ensuite avec une inscription claire.',
    icon: Share,
  },
];

const MORE_PANEL_IDS: MorePanel[] = ['downloads', 'legal', 'priorities', 'compare', 'about', 'moments'];
const LEGAL_SUB_IDS: LegalSub[] = ['sources', 'privacy', 'terms'];

const isMorePanel = (value: string | null): value is MorePanel =>
  Boolean(value && MORE_PANEL_IDS.includes(value as MorePanel));

const isLegalSub = (value: string | null): value is LegalSub =>
  Boolean(value && LEGAL_SUB_IDS.includes(value as LegalSub));

/** Normalize legacy panel query values (downloads, sources, …) into top-level + sub. */
const resolveMoreNavigation = (
  raw: string | null
): { panel: MorePanel; legalSub?: LegalSub } => {
  if (raw === 'downloads') return { panel: 'downloads' };
  if (raw === 'sources' || raw === 'privacy' || raw === 'terms') {
    return { panel: 'legal', legalSub: raw };
  }
  if (isMorePanel(raw)) return { panel: raw };
  return { panel: 'downloads' };
};

const mapLegacyTab = (tab: string | null): TabId => {
  switch (tab) {
    case 'listen':
    case 'reciters':
    case 'surahs':
      return 'listen';
    case 'moments':
      return 'moments';
    case 'ayah':
    case 'everyayah':
      return 'home';
    case 'quiz':
      return 'quiz';
    case 'learn':
      return 'learn';
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

const getInitialTab = (): TabId => {
  if (typeof window === 'undefined') return 'home';
  const tab = new URLSearchParams(window.location.search).get('tab');
  return mapLegacyTab(tab);
};

const getInitialMorePanel = (): MorePanel => {
  if (typeof window === 'undefined') return 'downloads';
  const params = new URLSearchParams(window.location.search);
  const section = params.get('section');
  if (section === 'downloads') return 'downloads';
  const fromPanel = resolveMoreNavigation(params.get('panel'));
  if (params.get('panel') === 'account' || params.get('panel') === 'profile') {
    return 'downloads';
  }
  if (params.get('panel')) return fromPanel.panel;
  const tab = params.get('tab');
  if (tab === 'account' || tab === 'profile') return 'downloads';
  return resolveMoreNavigation(tab).panel;
};

const getInitialLegalSub = (): LegalSub => {
  if (typeof window === 'undefined') return 'sources';
  const params = new URLSearchParams(window.location.search);
  const section = params.get('section');
  if (isLegalSub(section)) return section;
  const raw = params.get('panel') || params.get('tab');
  return resolveMoreNavigation(raw).legalSub ?? 'sources';
};

const FEATURED_RECITER_IDS = [123, 54, 20, 86, 102, 92, 30, 31];
const GOMUSLIMLIFE_URL = 'https://gomuslimlife.com';
const MAKKAH_MOMENTS = [
  {
    id: 'shuraim-marking-recitation',
    title: 'Récitation marquante de Sheikh Shuraim',
    reciter: 'Sheikh Shuraim',
    youtubeUrl: 'https://www.youtube.com/watch?v=tXG1nFz-ozE',
    embedUrl: 'https://www.youtube-nocookie.com/embed/tXG1nFz-ozE',
  },
  {
    id: 'ahmad-bin-taleb-marking-recitation',
    title: 'Récitation marquante de Sheikh Ahmad bin Taleb',
    reciter: 'Sheikh Ahmad bin Taleb',
    youtubeUrl: 'https://www.youtube.com/watch?v=QcjIp5cl5Fo',
    embedUrl: 'https://www.youtube-nocookie.com/embed/QcjIp5cl5Fo',
  },
  {
    id: 'abdul-razzaq-boukar-marking-recitation',
    title: 'Récitation marquante de Sheikh Abdul Razzaq Boukar',
    reciter: 'Sheikh Abdul Razzaq Boukar',
    youtubeUrl: 'https://www.youtube.com/watch?v=ofWia2Vm6Fc',
    embedUrl: 'https://www.youtube-nocookie.com/embed/ofWia2Vm6Fc',
  },
  {
    id: 'yasser-al-dossary-marking-recitation',
    title: 'Récitation marquante de Sheikh Yasser Al-Dossary',
    reciter: 'Sheikh Yasser Al-Dossary',
    youtubeUrl: 'https://www.youtube.com/watch?v=WUaCahSbDMI',
    embedUrl: 'https://www.youtube-nocookie.com/embed/WUaCahSbDMI',
  },
] as const;

// Dictionary of phonetic synonyms & aliases for the most famous reciters
const RECITER_ALIASES: Record<number, string[]> = {
  123: ["alafasy", "al afasy", "al-afasy", "alafasi", "afasy", "afasi", "mishary", "mshary", "mishari", "rashid", "mishari rashid alafasy"],
  54: ["sudais", "soudais", "soudays", "sudays", "abdul rahman", "soudaiss", "sudaiss"],
  102: ["muaiqly", "al muaiqly", "al-muaiqly", "mueaqly", "maher", "mahir", "mouaiqly", "meaqli"],
  31: ["shuraim", "shurim", "shuraym", "cherim", "saoud", "saud al shuraim"],
  30: ["ghamidi", "ghmidi", "ghamdi", "saad", "saad el ghamidi"],
  5: ["ajami", "ajmy", "el ajami", "ahmed ajami"],
  118: ["husary", "hussary", "al hussary", "mahmoud khalil"],
  112: ["minshawi", "menshawi", "menshavi", "mohamed siddiq", "manchaoui"],
  106: ["tablawi", "tablawy", "mohamed tablawi", "mohamed el tablawi"],
  74: ["hudhaify", "hudaify", "houdayfi", "ali hudhaify"],
  86: ["qattami", "qatami", "nasser qattami", "naser al qattami"],
  92: ["doussari", "dosari", "yasser dossari", "yasser al doussari"],
  226: ["ghamdi", "khalid ghamdi", "khaled al ghamdi"],
  60: ["basfer", "abdellah basfer", "abdullah basfar"],
  62: ["juhany", "johany", "jouhany", "abdullah awad", "awad al juhany", "al johani"],
  253: ["islam sobhi", "islam sobhy", "islam subhi", "sobhi", "sobhy"],
  160: ["kalbani", "khalbany", "adel kalbani", "adel al kalbani", "adel al-khalbany"],
  21: ["qahtani", "kahtani", "khalid qahtani", "khaled al qahtani", "al qahtani"],
  16: ["kouchi", "koshi", "laayoun", "layoun", "aloyoun", "el kouchi", "aloyoon"],
  44: ["hachem", "hashem", "salah"],
  94: ["yasser", "faylakawi", "fylakawi"],
  2: ["jebrine", "jebreen", "ibrahime jebrine"],
  3: ["hudhaify", "hudaify", "al hudhaify", "ali jaber"],
};

const SEARCH_STOP_WORDS = new Set(['al', 'el', 'a', 'an', 'bin', 'ben', 'ibn', 'abu']);

// Advanced string normalizer that handles French diacritics, hyphens, and whitespace
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Strip diacritics
    .replace(/[^a-z0-9]/g, " ")     // Replace dashes and punctuation with spaces
    .replace(/\s+/g, " ")           // Collapse duplicate spaces
    .trim();
};

const compactString = (str: string) => str.replace(/\s/g, '');

const getSearchTokens = (value: string) => (
  normalizeString(value)
    .split(' ')
    .filter((token) => token && !SEARCH_STOP_WORDS.has(token))
);

const uniqueSearchCandidates = (reciter: Reciter) => {
  const normalizedCandidates = [
    reciter.name,
    ...(RECITER_ALIASES[reciter.id] || [])
  ].map(normalizeString).filter(Boolean);

  return Array.from(new Set(normalizedCandidates));
};

const isSubsequence = (needle: string, haystack: string) => {
  if (!needle) return true;
  let index = 0;
  for (const char of haystack) {
    if (char === needle[index]) index += 1;
    if (index === needle.length) return true;
  }
  return false;
};

const levenshteinDistance = (source: string, target: string, maxDistance = 4) => {
  if (source === target) return 0;
  if (Math.abs(source.length - target.length) > maxDistance) return maxDistance + 1;

  let previous = Array.from({ length: target.length + 1 }, (_, index) => index);
  let current = new Array<number>(target.length + 1);

  for (let i = 1; i <= source.length; i += 1) {
    current[0] = i;
    let rowMin = current[0];

    for (let j = 1; j <= target.length; j += 1) {
      const substitutionCost = source[i - 1] === target[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost
      );
      rowMin = Math.min(rowMin, current[j]);
    }

    if (rowMin > maxDistance) return maxDistance + 1;
    [previous, current] = [current, previous];
  }

  return previous[target.length];
};

const getBigramScore = (query: string, target: string) => {
  if (query.length < 2 || target.length < 2) return 0;

  const targetBigrams = new Map<string, number>();
  for (let index = 0; index < target.length - 1; index += 1) {
    const bigram = target.slice(index, index + 2);
    targetBigrams.set(bigram, (targetBigrams.get(bigram) || 0) + 1);
  }

  let overlap = 0;
  for (let index = 0; index < query.length - 1; index += 1) {
    const bigram = query.slice(index, index + 2);
    const count = targetBigrams.get(bigram) || 0;
    if (count > 0) {
      overlap += 1;
      targetBigrams.set(bigram, count - 1);
    }
  }

  return (2 * overlap) / (query.length + target.length - 2);
};

const getTokenScore = (queryToken: string, targetToken: string) => {
  if (!queryToken || !targetToken) return 0;
  if (queryToken === targetToken) return 180;
  if (targetToken.startsWith(queryToken)) return 150;
  if (targetToken.includes(queryToken)) return 122;
  if (queryToken.length >= 3 && isSubsequence(queryToken, targetToken)) return 96;

  const maxDistance = queryToken.length <= 4 ? 1 : queryToken.length <= 7 ? 2 : 3;
  const distance = levenshteinDistance(queryToken, targetToken, maxDistance);
  if (distance <= maxDistance) {
    return Math.max(72, 128 - distance * 24);
  }

  const bigramScore = getBigramScore(queryToken, targetToken);
  if (bigramScore >= 0.58) return Math.round(70 + bigramScore * 35);

  return 0;
};

const getCandidateScore = (candidate: string, queryNormalized: string) => {
  const candidateCompact = compactString(candidate);
  const queryCompact = compactString(queryNormalized);

  if (!queryCompact) return 0;
  if (candidate === queryNormalized) return 1200;
  if (candidateCompact === queryCompact) return 1140;
  if (candidate.startsWith(queryNormalized)) return 1020;
  if (candidateCompact.startsWith(queryCompact)) return 990;
  if (candidate.includes(queryNormalized)) return 900;
  if (candidateCompact.includes(queryCompact)) return 860;

  const queryTokens = getSearchTokens(queryNormalized);
  const candidateTokens = getSearchTokens(candidate);
  if (queryTokens.length === 0 || candidateTokens.length === 0) return 0;

  const initials = candidateTokens.map((token) => token[0]).join('');
  if (queryCompact.length >= 2 && initials.startsWith(queryCompact)) return 760;
  if (queryCompact.length >= 3 && isSubsequence(queryCompact, candidateCompact)) return 280;

  const tokenScores = queryTokens.map((queryToken) => (
    Math.max(...candidateTokens.map((candidateToken) => getTokenScore(queryToken, candidateToken)))
  ));
  const matchedTokens = tokenScores.filter((score) => score >= 72).length;
  const allTokensMatched = matchedTokens === queryTokens.length;

  if (allTokensMatched) {
    const averageTokenScore = tokenScores.reduce((sum, score) => sum + score, 0) / tokenScores.length;
    return Math.round(430 + averageTokenScore * 1.55);
  }

  if (matchedTokens > 0 && queryTokens.length > 1) {
    const matchRatio = matchedTokens / queryTokens.length;
    return Math.round(230 + matchRatio * 160 + Math.max(...tokenScores) * 0.45);
  }

  if (queryCompact.length >= 4) {
    const maxDistance = queryCompact.length <= 6 ? 2 : 3;
    const distance = levenshteinDistance(queryCompact, candidateCompact, maxDistance);
    if (distance <= maxDistance) return 420 - distance * 45;

    const bigramScore = getBigramScore(queryCompact, candidateCompact);
    if (bigramScore >= 0.5) return Math.round(220 + bigramScore * 220);
  }

  return 0;
};

const getSearchThreshold = (queryNormalized: string) => {
  const queryLength = compactString(queryNormalized).length;
  if (queryLength <= 2) return 120;
  if (queryLength === 3) return 260;
  return 540;
};

// Predictive search: accents/case-insensitive, alias-aware, typo-tolerant and stable.
const getSearchScore = (reciter: Reciter, queryNormalized: string): number => {
  if (!queryNormalized) return 0;

  const bestCandidateScore = Math.max(
    ...uniqueSearchCandidates(reciter).map((candidate) => getCandidateScore(candidate, queryNormalized))
  );
  const famousBoost = FEATURED_RECITER_IDS.includes(reciter.id) ? 18 : 0;

  return bestCandidateScore >= getSearchThreshold(queryNormalized) ? bestCandidateScore + famousBoost : 0;
};

const RecitersLoadingSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3 min-h-[320px]" aria-hidden="true">
    {[0, 1, 2, 3, 4].map((item) => (
      <div key={item} className="shimmer-loader h-[88px] rounded-2xl border border-slate-900" />
    ))}
  </div>
);

interface ProductPriorityCardProps {
  title: string;
  summary: string;
  detail: string;
  icon: AppIcon;
}

const ProductPriorityCard: React.FC<ProductPriorityCardProps> = ({ title, summary, detail, icon: Icon }) => (
  <div className="brand-card rounded-2xl p-4">
    <div className="flex items-start gap-3">
      <span className="brand-chip mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div>
        <h3 className="text-sm font-black text-[#f6f8fb]">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#d0d9e3]">{summary}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-[#95a7ba]">{detail}</p>
      </div>
    </div>
  </div>
);

interface HomeFeaturedReciterProps {
  reciter: Reciter;
  isSelected: boolean;
  onSelect: () => void;
  priority?: boolean;
}

const HomeFeaturedReciter: React.FC<HomeFeaturedReciterProps> = ({
  reciter,
  isSelected,
  onSelect,
  priority = false,
}) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`shrink-0 w-[7.25rem] flex flex-col items-center gap-2.5 rounded-2xl p-2 text-center transition-all tap-feedback ${
        isSelected
          ? 'bg-[#e2d0ba]/10 ring-1 ring-[#e2d0ba]/35'
          : 'hover:bg-[#162538]/70'
      }`}
    >
      <span className={`relative h-[4.75rem] w-[4.75rem] overflow-hidden rounded-[1.35rem] border-2 bg-[#111d2d] shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${
        isSelected ? 'border-[#e2d0ba] shadow-[0_0_22px_rgba(191,160,120,0.38)]' : 'border-[#46607b]/70'
      }`}>
        <ReciterPortrait
          reciter={reciter}
          alt=""
          width={76}
          height={76}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'low'}
        />
      </span>
      <span className="flex w-full flex-col items-center gap-1 text-[11px] font-semibold leading-tight">
        <span className={`line-clamp-2 w-full reciter-name-gradient${isSelected ? ' is-selected' : ''}`}>
          {reciter.name}
        </span>
        <AyahSyncBadge reciter={reciter} compact />
      </span>
    </button>
  );
};

const MakkahMomentCard: React.FC<((typeof MAKKAH_MOMENTS)[number] & { featured?: boolean })> = ({
  title,
  reciter,
  youtubeUrl,
  embedUrl,
  featured = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className={`overflow-hidden rounded-[1.6rem] border border-[#30455c]/55 bg-[linear-gradient(180deg,rgba(17,29,45,0.92),rgba(10,18,29,0.96))] ${
      featured ? 'shadow-[0_24px_60px_-30px_rgba(0,0,0,0.55)]' : ''
    }`}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="block w-full text-left"
        aria-expanded={expanded}
      >
        <div className={`border-b border-[#30455c]/45 px-4 py-4 sm:px-5 ${featured ? 'sm:px-6 sm:py-5' : ''}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8ea1b3]">
                {featured ? 'À la une' : 'Moment marquant'}
              </p>
              <h3 className={`mt-1 font-black text-[#f6f8fb] ${featured ? 'text-lg sm:text-[1.35rem]' : 'text-base'}`}>
                {title}
              </h3>
              <p className={`mt-1 font-semibold text-[#e6d5c2] ${featured ? 'text-sm' : 'text-xs'}`}>{reciter}</p>
              {featured && (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#b4c0ce]">
                  Une récitation mise en avant pour ouvrir la sélection.
                </p>
              )}
            </div>
            <span className="flex flex-col items-center gap-2 shrink-0">
              <span className={`flex items-center justify-center rounded-2xl bg-[#20334a] text-[#e2d0ba] ${featured ? 'h-12 w-12' : 'h-11 w-11'}`}>
                <Play className={`ml-0.5 fill-current ${featured ? 'h-5 w-5' : 'h-4.5 w-4.5'}`} />
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#d0d9e3]">
                {expanded ? 'Réduire' : 'Ouvrir'}
                <ChevronDown className={`h-3.5 w-3.5 text-[#e2d0ba] transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </span>
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className={`px-4 py-4 sm:px-5 ${featured ? 'sm:px-6 sm:pb-6' : ''}`}>
          <div className="overflow-hidden rounded-[1.2rem] border border-[#30455c]/45 bg-[#0a1420]">
            <div className="aspect-video w-full">
              <iframe
                src={embedUrl}
                title={title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>

          <div className="mt-3 rounded-[1.2rem] border border-[#30455c]/45 bg-[#0f1928]/80 p-3.5 sm:p-4">
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-black text-[#f6f8fb]">{title}</h4>
              <p className="text-xs font-semibold text-[#e6d5c2]">{reciter}</p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="brand-button-secondary inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-bold transition-colors tap-feedback"
              >
                Réduire
              </button>
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="brand-button-primary inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-bold transition-colors"
              >
                Ouvrir sur YouTube
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

/** One-line memo that scrolls when it overflows (mobile). */
const MemoMarquee: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLParagraphElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const measure = () => {
      // Desktop wraps normally — no marquee needed.
      if (window.matchMedia('(min-width: 640px)').matches) {
        container.style.removeProperty('--memo-marquee-distance');
        setOverflowing(false);
        return;
      }
      const distance = Math.max(0, track.scrollWidth - container.clientWidth);
      container.style.setProperty('--memo-marquee-distance', `${distance}px`);
      setOverflowing(distance > 4);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div ref={containerRef} className="memo-marquee min-w-0 flex-1 overflow-hidden sm:overflow-visible">
      <p
        ref={trackRef}
        className={`memo-marquee__track text-[11px] leading-none text-[#b4c0ce] sm:text-[12px] sm:leading-snug ${
          overflowing ? 'is-overflowing' : ''
        }`}
      >
        {children}
      </p>
    </div>
  );
};

const EXPLORE_CLOUD_COUNT = 3;
const EXPLORE_CLOUD_ROTATE_MS = 4000;

/** Anchors where each bubble escapes from the button: x = % of button width. */
const EXPLORE_BUBBLE_ANCHORS = [
  { x: 16, rise: 92, drift: -10, delay: 0 },
  { x: 50, rise: 122, drift: 6, delay: 0.14 },
  { x: 82, rise: 86, drift: 14, delay: 0.28 },
];

/** Tiny bubbles trailing behind, sized/placed to feel like they pop off the surface. */
const EXPLORE_BUBBLE_SPECKS = [
  { x: 24, size: 7, rise: 44, delay: 0.1 },
  { x: 38, size: 4, rise: 60, delay: 0.5 },
  { x: 62, size: 6, rise: 52, delay: 0.28 },
  { x: 74, size: 4, rise: 66, delay: 0.62 },
  { x: 90, size: 5, rise: 40, delay: 0.42 },
];

/** Quiz Coran — hover chips (guess motifs) rising like Explorer voices. */
const QUIZ_BUBBLE_ANCHORS = [
  { x: 18, rise: 88, drift: -8, delay: 0 },
  { x: 52, rise: 118, drift: 4, delay: 0.16 },
  { x: 84, rise: 84, drift: 12, delay: 0.3 },
];

const QUIZ_BUBBLE_SPECKS = [
  { x: 22, size: 6, rise: 42, delay: 0.08 },
  { x: 40, size: 4, rise: 58, delay: 0.46 },
  { x: 58, size: 5, rise: 50, delay: 0.24 },
  { x: 72, size: 4, rise: 64, delay: 0.58 },
  { x: 88, size: 5, rise: 38, delay: 0.38 },
];

const QUIZ_BUBBLE_CHIPS = [
  { mark: '?', label: 'Quelle sourate ?' },
  { mark: '✦', label: 'Écoute le verset' },
  { mark: '36', label: 'Yâ-Sîn ?' },
];

const HomeQuizCta: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const [cloudOpen, setCloudOpen] = useState(false);
  const [cloudKey, setCloudKey] = useState(0);

  const openCloud = () => {
    if (!window.matchMedia('(hover: hover)').matches) return;
    setCloudOpen(true);
    setCloudKey((k) => k + 1);
  };

  return (
    <div
      className="home-hero__quiz-wrap"
      onMouseEnter={openCloud}
      onMouseLeave={() => setCloudOpen(false)}
      onFocusCapture={openCloud}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setCloudOpen(false);
        }
      }}
    >
      <div
        className={`quiz-bubbles ${cloudOpen ? 'is-visible' : ''}`}
        aria-hidden={!cloudOpen}
      >
        {cloudOpen && (
          <div key={cloudKey} className="quiz-bubbles__stage">
            {QUIZ_BUBBLE_SPECKS.map((speck) => (
              <span
                key={`quiz-speck-${speck.x}-${speck.size}`}
                className="quiz-bubbles__speck"
                style={
                  {
                    '--bubble-x': `${speck.x}%`,
                    '--bubble-size': `${speck.size}px`,
                    '--bubble-rise': `${speck.rise}px`,
                    '--bubble-delay': `${speck.delay}s`,
                  } as React.CSSProperties
                }
              />
            ))}

            {QUIZ_BUBBLE_CHIPS.map((chip, index) => {
              const anchor = QUIZ_BUBBLE_ANCHORS[index % QUIZ_BUBBLE_ANCHORS.length];
              return (
                <span
                  key={chip.label}
                  className="quiz-bubbles__bubble"
                  style={
                    {
                      '--bubble-x': `${anchor.x}%`,
                      '--bubble-rise': `${anchor.rise}px`,
                      '--bubble-drift': `${anchor.drift}px`,
                      '--bubble-delay': `${anchor.delay}s`,
                    } as React.CSSProperties
                  }
                >
                  <span className="quiz-bubbles__mark">{chip.mark}</span>
                  <span className="quiz-bubbles__name">{chip.label}</span>
                  <span className="quiz-bubbles__shine" aria-hidden />
                </span>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="home-hero__quiz tap-feedback"
      >
        <span className="home-hero__quiz-badge">Nouveau</span>
        <span className="home-hero__quiz-sheen" aria-hidden />
        <span className="home-hero__quiz-icon" aria-hidden>
          <Sparkles className="h-4.5 w-4.5" />
        </span>
        <span className="home-hero__quiz-text">
          <span className="home-hero__quiz-title">Quiz Coran</span>
          <span className="home-hero__quiz-meta">Devinez la sourate du verset</span>
        </span>
        <span className="home-hero__quiz-chevron" aria-hidden>
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </button>
    </div>
  );
};

function pickExploreCloudReciters(pool: Reciter[], count: number, avoidIds: number[] = []): Reciter[] {
  if (pool.length === 0) return [];
  const avoid = new Set(avoidIds);
  const preferred = pool.filter((r) => !avoid.has(r.id));
  const source = preferred.length >= count ? preferred : pool;
  const shuffled = [...source];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

const HomeExploreFusionButton: React.FC<{
  enabled: boolean;
  reciters: Reciter[];
  onExplore: () => void;
  onFusionProgressChange: (progress: number) => void;
  onFusionSpacerChange?: (spacerPx: number) => void;
}> = ({ enabled, reciters, onExplore, onFusionProgressChange, onFusionSpacerChange }) => {
  const { progress, spacerPx, setHeaderRef, setSentinelRef } = useReciterNavFusion(enabled);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [cloudReciters, setCloudReciters] = useState<Reciter[]>([]);
  const cloudKeyRef = useRef(0);
  const [cloudKey, setCloudKey] = useState(0);

  const portraitPool = useMemo(() => {
    if (!reciters.length) return [];
    const withLocal = reciters.filter((r) => hasLocalReciterImage(r.id));
    return withLocal.length >= EXPLORE_CLOUD_COUNT ? withLocal : reciters;
  }, [reciters]);

  const refreshCloud = useCallback(() => {
    setCloudReciters((prev) => {
      const next = pickExploreCloudReciters(
        portraitPool,
        EXPLORE_CLOUD_COUNT,
        prev.map((r) => r.id),
      );
      return next;
    });
    cloudKeyRef.current += 1;
    setCloudKey(cloudKeyRef.current);
  }, [portraitPool]);

  React.useEffect(() => {
    onFusionProgressChange(progress);
  }, [progress, onFusionProgressChange]);

  React.useEffect(() => {
    if (!enabled) onFusionProgressChange(0);
  }, [enabled, onFusionProgressChange]);

  React.useEffect(() => {
    onFusionSpacerChange?.(enabled ? spacerPx : 0);
  }, [enabled, onFusionSpacerChange, spacerPx]);

  React.useEffect(() => {
    if (!cloudOpen || portraitPool.length === 0) return;
    const id = window.setInterval(refreshCloud, EXPLORE_CLOUD_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [cloudOpen, portraitPool.length, refreshCloud]);

  const mergeStyle = {
    ['--fusion-p' as string]: String(progress),
  } as React.CSSProperties;

  const showCloud = cloudOpen && cloudReciters.length > 0 && progress < 0.35;

  return (
    <>
      <div
        ref={setSentinelRef}
        className="home-explore-fusion-sentinel hidden md:block col-span-full h-0 w-full overflow-hidden"
        aria-hidden
      />
      <div
        ref={(node) => setHeaderRef(node)}
        className={`home-hero__explore-wrap home-explore-fusion min-w-0 md:sticky md:top-24 md:z-20 md:self-start ${
          enabled && progress > 0.01 ? 'is-fusing' : ''
        }`}
        style={enabled ? mergeStyle : undefined}
        onMouseEnter={() => {
          if (window.matchMedia('(hover: hover)').matches) {
            setCloudOpen(true);
            refreshCloud();
          }
        }}
        onMouseLeave={() => setCloudOpen(false)}
        onFocusCapture={() => {
          if (window.matchMedia('(hover: hover)').matches) {
            setCloudOpen(true);
            if (cloudReciters.length === 0) refreshCloud();
          }
        }}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setCloudOpen(false);
          }
        }}
      >
          <div
            className={`explore-bubbles ${showCloud ? 'is-visible' : ''}`}
            aria-hidden={!showCloud}
          >
            {showCloud && (
              <div key={cloudKey} className="explore-bubbles__stage">
                {EXPLORE_BUBBLE_SPECKS.map((speck) => (
                  <span
                    key={`speck-${speck.x}-${speck.size}`}
                    className="explore-bubbles__speck"
                    style={
                      {
                        '--bubble-x': `${speck.x}%`,
                        '--bubble-size': `${speck.size}px`,
                        '--bubble-rise': `${speck.rise}px`,
                        '--bubble-delay': `${speck.delay}s`,
                      } as React.CSSProperties
                    }
                  />
                ))}

                {cloudReciters.map((reciter, index) => {
                  const anchor = EXPLORE_BUBBLE_ANCHORS[index % EXPLORE_BUBBLE_ANCHORS.length];
                  return (
                    <span
                      key={reciter.id}
                      className="explore-bubbles__bubble"
                      style={
                        {
                          '--bubble-x': `${anchor.x}%`,
                          '--bubble-rise': `${anchor.rise}px`,
                          '--bubble-drift': `${anchor.drift}px`,
                          '--bubble-delay': `${anchor.delay}s`,
                        } as React.CSSProperties
                      }
                    >
                      <span className="explore-bubbles__avatar">
                        <ReciterPortrait
                          reciter={reciter}
                          alt=""
                          width={44}
                          height={44}
                          loading="lazy"
                          className="h-full w-full"
                        />
                      </span>
                      <span className="explore-bubbles__name">{reciter.name}</span>
                      <span className="explore-bubbles__shine" aria-hidden />
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onExplore}
            className="home-explore-fusion-card hero-explore-btn tap-feedback"
            tabIndex={progress >= 0.92 ? -1 : 0}
            aria-label="Explorer les voix"
          >
            <span className="hero-explore-btn__sheen" aria-hidden />
            <span className="hero-explore-btn__icon" aria-hidden>
              <Headphones className="h-4 w-4" />
            </span>
            <span className="hero-explore-btn__body">
              <span className="hero-explore-btn__title">Explorer les voix</span>
              <span className="hero-explore-btn__meta">
                Récitateurs, sourates et découverte.
              </span>
            </span>
            <span className="hero-explore-btn__chevron" aria-hidden>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>
      </div>
    </>
  );
};

const AppContent: React.FC = () => {
  const {
    reciters,
    isLoadingReciters,
    error,
    activeReciter,
    activeMoshaf,
    setActiveReciter,
    setActiveMoshaf,
    currentTrack,
    playbackStatus,
    play,
    cachedUrls,
    getAvailableSurahs,
    playTrack,
  } = useAudio();
  const { user, loading: authLoading } = useAuth();
  const isOnline = useOnlineStatus();

  const [activeTab, setActiveTab] = useState<TabId>(() => getInitialTab());
  const [morePanel, setMorePanel] = useState<MorePanel>(() => getInitialMorePanel());
  const [legalSub, setLegalSub] = useState<LegalSub>(() => getInitialLegalSub());
  const [listenStep, setListenStep] = useState<ListenStep>('reciters');
  const [categoryModalId, setCategoryModalId] = useState<ReciterCategoryId | null>(null);
  const [reciterSearch, setReciterSearch] = useState<string>('');
  const deferredReciterSearch = useDeferredValue(reciterSearch);
  const [ayahSyncFilter, setAyahSyncFilter] = useState<'all' | 'with' | 'without'>('all');
  const timingCatalogReady = useTimingCatalogReady();
  const [showLoadingHome, setShowLoadingHome] = useState(true);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const surahSectionRef = useRef<HTMLElement | null>(null);
  const didRestoreListenStep = useRef(false);
  const authPromptShownRef = useRef(false);
  const [reciterFusionProgress, setReciterFusionProgress] = useState(0);
  const [reciterFusionSpacerPx, setReciterFusionSpacerPx] = useState(0);
  const [exploreFusionProgress, setExploreFusionProgress] = useState(0);
  const [exploreFusionSpacerPx, setExploreFusionSpacerPx] = useState(0);
  const [recentReciterIds, setRecentReciterIds] = useState<number[]>(() => readRecentReciterIds());
  const [navDesktopStyle, setNavDesktopStyle] = useState<NavDesktopStyle>(() => loadNavDesktopStyle());

  const handleNavDesktopStyleChange = useCallback((style: NavDesktopStyle) => {
    setNavDesktopStyle(style);
    saveNavDesktopStyle(style);
  }, []);

  // Moments = liens YouTube → inutile hors-ligne
  useEffect(() => {
    if (!isOnline && activeTab === 'moments') {
      setActiveTab('listen');
    }
  }, [isOnline, activeTab]);

  const handleReciterFusionProgress = useCallback((progress: number) => {
    setReciterFusionProgress(progress);
  }, []);

  const handleReciterFusionSpacer = useCallback((spacerPx: number) => {
    setReciterFusionSpacerPx(spacerPx);
  }, []);

  const handleExploreFusionProgress = useCallback((progress: number) => {
    setExploreFusionProgress(progress);
  }, []);

  const handleExploreFusionSpacer = useCallback((spacerPx: number) => {
    setExploreFusionSpacerPx(spacerPx);
  }, []);

  const reciterFusionEnabled =
    activeTab === 'listen' && listenStep === 'surahs' && Boolean(activeReciter);
  const exploreFusionEnabled = activeTab === 'home';

  const applyDeepLink = useCallback((rawUrl: string) => {
    try {
      const url = new URL(rawUrl, window.location.origin);
      const tab = url.searchParams.get('tab');
      const panelParam = url.searchParams.get('panel');
      const sectionParam = url.searchParams.get('section');

      const openMore = (raw: string | null) => {
        const resolved = resolveMoreNavigation(raw);
        let panel = resolved.panel;
        if (sectionParam === 'downloads') panel = 'downloads';
        setMorePanel(panel);
        if (resolved.legalSub) setLegalSub(resolved.legalSub);
        if (panel === 'legal' && isLegalSub(sectionParam)) setLegalSub(sectionParam);
        setActiveTab('more');
      };

      if (
        tab === 'compare' ||
        tab === 'about' ||
        tab === 'sources' ||
        tab === 'privacy' ||
        tab === 'terms' ||
        tab === 'downloads' ||
        tab === 'legal'
      ) {
        openMore(tab);
        return;
      }
      if (tab === 'account' || tab === 'profile') {
        setActiveTab('account');
        return;
      }
      if (panelParam === 'account' || panelParam === 'profile') {
        setActiveTab('account');
        return;
      }
      if (panelParam) {
        openMore(panelParam);
        return;
      }
      if (tab === 'moments') {
        setActiveTab('moments');
        return;
      }
      if (tab) {
        setActiveTab(mapLegacyTab(tab));
      }
      if (url.protocol === 'sawra:' || url.pathname.includes('/surah')) {
        setActiveTab('listen');
      }
    } catch {
      if (rawUrl.includes('tab=compare')) {
        setMorePanel('compare');
        setActiveTab('more');
      } else if (rawUrl.includes('tab=about')) {
        setMorePanel('about');
        setActiveTab('more');
      } else if (rawUrl.includes('tab=moments')) {
        setActiveTab('moments');
      } else if (
        rawUrl.includes('tab=surahs') ||
        rawUrl.includes('tab=reciters') ||
        rawUrl.includes('tab=listen') ||
        rawUrl.includes('sawra://surah')
      ) {
        setActiveTab('listen');
      }
    }
  }, []);

  useEffect(() => {
    let removeListener: (() => void) | undefined;

    const bindDeepLinks = async () => {
      try {
        const { App } = await import('@capacitor/app');
        const launch = await App.getLaunchUrl();
        if (launch?.url) applyDeepLink(launch.url);

        const handle = await App.addListener('appUrlOpen', (event) => {
          applyDeepLink(event.url);
        });
        removeListener = () => { void handle.remove(); };
      } catch {
        // Web/PWA: URL query params only.
      }
    };

    void bindDeepLinks();
    return () => removeListener?.();
  }, [applyDeepLink]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    if (activeTab === 'more') {
      params.set('panel', morePanel);
      if (morePanel === 'legal') {
        params.set('section', legalSub);
      } else {
        params.delete('section');
      }
    } else {
      params.delete('panel');
      params.delete('section');
    }
    const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }, [activeTab, morePanel, legalSub]);

  useEffect(() => {
    applyDocumentSeo(resolveSeoForView(activeTab, morePanel));
  }, [activeTab, morePanel]);

  useEffect(() => {
    if (!isLoadingReciters) {
      const doneTimer = window.setTimeout(() => {
        setShowLoadingHome(false);
        document.getElementById('boot-splash')?.remove();
      }, 180);
      return () => window.clearTimeout(doneTimer);
    }

    setShowLoadingHome(true);
  }, [isLoadingReciters]);

  // Favorites state persisted locally
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('quran_streamer_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track recently listened reciters for the listen catalog
  useEffect(() => {
    const id = currentTrack?.reciter.id;
    if (!id) return;
    setRecentReciterIds(pushRecentReciterId(id));
  }, [currentTrack?.reciter.id]);

  const toggleFavorite = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user && !authLoading) {
      setShowAuthPrompt(true);
      authPromptShownRef.current = true;
    }
    setFavorites((prev) => {
      const updated = prev.includes(id) ? prev.filter((fId) => fId !== id) : [...prev, id];
      try {
        localStorage.setItem('quran_streamer_favorites', JSON.stringify(updated));
      } catch {
        // The in-memory favorite still updates when storage is unavailable.
      }
      return updated;
    });
  };

  const handlePlayFatihah = useCallback(() => {
    if (!activeReciter || !activeMoshaf) return;
    const available = getAvailableSurahs(activeReciter, activeMoshaf);
    const fatihah = available.find((s) => s.id === 1) ?? available[0];
    if (!fatihah) return;
    playTrack(activeReciter, activeMoshaf, fatihah);
  }, [activeReciter, activeMoshaf, getAvailableSurahs, playTrack]);

  const dismissAuthPrompt = () => {
    setShowAuthPrompt(false);
    try {
      sessionStorage.setItem('sawra_auth_prompt_dismissed', '1');
    } catch {
      // ignore
    }
  };

  const openAuthFromPrompt = () => {
    dismissAuthPrompt();
    setActiveTab('account');
  };

  // Soft prompt once per session if logged out
  useEffect(() => {
    if (authLoading || user || showLoadingHome || authPromptShownRef.current) return;
    try {
      if (sessionStorage.getItem('sawra_auth_prompt_dismissed') === '1') return;
    } catch {
      // ignore
    }
    const timer = window.setTimeout(() => {
      if (!user) {
        setShowAuthPrompt(true);
        authPromptShownRef.current = true;
      }
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [authLoading, user, showLoadingHome]);

  useEffect(() => {
    if (user) setShowAuthPrompt(false);
  }, [user]);

  const featuredReciters = useMemo(() => {
    if (!reciters) return [];

    return FEATURED_RECITER_IDS
      .map(id => reciters.find(r => r.id === id))
      .filter((r): r is Reciter => !!r);
  }, [reciters]);

  // Client-side fuzzy search on reciters (+ optional ayah-sync filter)
  const filteredReciters = useMemo(() => {
    if (!reciters) return [];

    let list: Reciter[];
    if (!deferredReciterSearch.trim()) {
      list = reciters;
    } else {
      const queryNorm = normalizeString(deferredReciterSearch);
      const scored = reciters
        .map((r) => ({
          reciter: r,
          score: getSearchScore(r, queryNorm),
        }))
        .filter((item) => item.score > 0);

      scored.sort((a, b) => b.score - a.score || a.reciter.name.localeCompare(b.reciter.name));
      list = scored.map((item) => item.reciter);
    }

    if (!timingCatalogReady || ayahSyncFilter === 'all') return list;
    return list.filter((r) => {
      const hasSync = reciterHasAyahTiming(r);
      return ayahSyncFilter === 'with' ? hasSync : !hasSync;
    });
  }, [reciters, deferredReciterSearch, ayahSyncFilter, timingCatalogReady]);

  const isSearchPending = reciterSearch !== deferredReciterSearch;

  const favoritedReciters = useMemo(() => {
    if (!reciters) return [];
    return reciters.filter((r) => favorites.includes(r.id));
  }, [reciters, favorites]);

  const listenFavoritedReciters = useMemo(() => {
    if (deferredReciterSearch.trim()) return [];
    return favoritedReciters.filter((r) => filteredReciters.some((f) => f.id === r.id));
  }, [favoritedReciters, deferredReciterSearch, filteredReciters]);

  const recentReciters = useMemo(() => {
    if (deferredReciterSearch.trim() || !reciters.length || recentReciterIds.length === 0) return [];
    const allowed = new Set(filteredReciters.map((r) => r.id));
    const byId = new Map(reciters.map((r) => [r.id, r]));
    return recentReciterIds
      .map((id) => byId.get(id))
      .filter((r): r is Reciter => r != null && allowed.has(r.id));
  }, [reciters, recentReciterIds, deferredReciterSearch, filteredReciters]);

  const catalogReciters = useMemo(() => {
    if (deferredReciterSearch.trim()) return filteredReciters;
    const favoriteIds = new Set(favoritedReciters.map((r) => r.id));
    const recentIds = new Set(recentReciters.map((r) => r.id));
    return filteredReciters.filter((r) => !favoriteIds.has(r.id) && !recentIds.has(r.id));
  }, [filteredReciters, favoritedReciters, recentReciters, deferredReciterSearch]);

  const downloadedEntries = useMemo(() => {
    if (cachedUrls.size === 0 || reciters.length === 0) return [];

    const entries: Array<{
      key: string;
      reciterId: number;
      moshafId: number;
      reciterName: string;
      surahId: number;
      surahName: string;
    }> = [];

    for (const reciter of reciters) {
      for (const moshaf of reciter.moshaf) {
        const availableSurahs = getAvailableSurahs(reciter, moshaf);
        for (const surah of availableSurahs) {
          const url = getAudioUrl(moshaf, surah);
          if (!cachedUrls.has(url)) continue;
          entries.push({
            key: `${reciter.id}-${moshaf.id}-${surah.id}`,
            reciterId: reciter.id,
            moshafId: moshaf.id,
            reciterName: reciter.name,
            surahId: surah.id,
            surahName: surah.name,
          });
        }
      }
    }

    return entries.sort((a, b) => {
      if (a.reciterName !== b.reciterName) {
        return a.reciterName.localeCompare(b.reciterName, 'fr');
      }
      return a.surahId - b.surahId;
    });
  }, [cachedUrls, getAvailableSurahs, reciters]);

  const handleNavigate = (
    tab: TabId,
    panel?: MorePanel,
    options?: { legalSub?: LegalSub }
  ) => {
    const nextTab = tab === 'moments' && !isOnline ? 'listen' : tab;
    setActiveTab(nextTab);
    if (panel) setMorePanel(panel);
    if (options?.legalSub) setLegalSub(options.legalSub);
    if (nextTab === 'listen') {
      setListenStep(activeReciter ? 'surahs' : 'reciters');
    }
  };

  const openLegal = (section: LegalSub) => {
    setMorePanel('legal');
    setLegalSub(section);
    setActiveTab('more');
  };

  const handleExploreVoices = () => {
    setActiveTab('listen');
    setListenStep('reciters');
  };

  const handleSelectReciter = (reciter: Reciter) => {
    setCategoryModalId(null);
    setActiveReciter(reciter);
    setActiveTab('listen');
    setListenStep('surahs');
    setReciterSearch('');
    window.setTimeout(() => {
      surahSectionRef.current?.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 80);
  };

  const handleListenSurahFromQuiz = useCallback(
    (reciter: Reciter, moshaf: Moshaf, surah: Surah) => {
      setActiveReciter(reciter);
      setActiveMoshaf(moshaf);
      setActiveTab('listen');
      setListenStep('surahs');
      setReciterSearch('');
      playTrack(reciter, moshaf, surah);
      window.setTimeout(() => {
        surahSectionRef.current?.scrollIntoView({
          block: 'start',
          behavior: 'smooth',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 80);
    },
    [playTrack, setActiveMoshaf, setActiveReciter],
  );

  const handleResumeListening = () => {
    if (!currentTrack) {
      handleNavigate('listen');
      return;
    }
    setActiveReciter(currentTrack.reciter);
    setActiveMoshaf(currentTrack.moshaf);
    setActiveTab('listen');
    setListenStep('surahs');
    if (playbackStatus !== 'playing') {
      play();
    }
  };

  const activeCategory = categoryModalId ? getReciterCategory(categoryModalId) : undefined;

  const handleChangeReciter = () => {
    setListenStep('reciters');
    setReciterSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (isLoadingReciters) return;
    if (!activeReciter) {
      setListenStep('reciters');
      return;
    }
    if (!didRestoreListenStep.current) {
      didRestoreListenStep.current = true;
      setListenStep('surahs');
    }
  }, [activeReciter, isLoadingReciters]);

  const handleSetActiveTab = (tab: TabId) => {
    if (tab === 'moments' && !isOnline) {
      setActiveTab('listen');
      setListenStep(activeReciter ? 'surahs' : 'reciters');
      return;
    }
    setActiveTab(tab);
    if (tab === 'listen') {
      setListenStep(activeReciter ? 'surahs' : 'reciters');
    }
  };

  if (showLoadingHome) {
    // Keep the HTML #boot-splash as the LCP element; React stays empty until ready.
    return null;
  }

  return (
    <div
      data-nav-desktop={navDesktopStyle}
      data-hide-player={
        activeTab === 'account' || activeTab === 'quiz' || activeTab === 'learn'
          ? 'true'
          : undefined
      }
      data-hide-nav={
        activeTab === 'quiz' || activeTab === 'learn' ? 'true' : undefined
      }
      className={`flex-1 flex flex-col px-4 max-w-lg mx-auto w-full mobile-shell-padding mobile-app-shell max-md:px-0 ${
      activeTab === 'quiz' || activeTab === 'learn'
        ? 'md:w-full md:max-w-none md:px-6 md:pt-0'
        : `md:w-[min(72rem,calc(100%-4rem))] md:max-w-6xl md:px-0 ${
            navDesktopStyle === 'classic' ? 'md:pt-[5.75rem]' : 'md:pt-28'
          }`
    } ${
      currentTrack &&
      activeTab !== 'account' &&
      activeTab !== 'quiz' &&
      activeTab !== 'learn'
        ? 'md:pb-44'
        : 'md:pb-12'
    }`}>
      <CloudSync favorites={favorites} setFavorites={setFavorites} />
      <AuthPromptModal
        open={showAuthPrompt && !user}
        onClose={dismissAuthPrompt}
        onConnect={openAuthFromPrompt}
      />
      {/* Brand lives in the floating Navbar; keep an accessible page title */}
      <h1 className="sr-only">Sawra — Écouter le Coran en ligne gratuitement, sans publicité</h1>

      {/* 2. Main Tab Views */}
      <main
        className={`flex-1 flex flex-col mobile-app-main ${
          activeTab === 'listen' && listenStep === 'surahs' && activeReciter
            ? 'max-md:gap-0 gap-5'
            : 'gap-5'
        }`}
      >
        <div
          key={
            activeTab === 'listen'
              ? `listen-${listenStep}`
              : activeTab === 'more'
                ? `more-${morePanel}`
                : activeTab
          }
          className={`flex flex-col animate-page-enter ${
            activeTab === 'listen' && listenStep === 'surahs' && activeReciter
              ? 'max-md:gap-0 gap-5'
              : 'gap-5'
          }`}
        >
        
        {activeTab === 'home' && (
          <div className="flex flex-col gap-4 md:gap-7 pb-16 sm:pb-20 max-md:pt-2 md:pt-5">
            {!isOnline && (
              <button
                type="button"
                onClick={() => handleNavigate('listen')}
                className="flex items-center gap-3 rounded-2xl border border-[#bfa078]/30 bg-[#bfa078]/10 px-4 py-3 text-left tap-feedback"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#bfa078]/15 text-[#e2d0ba]">
                  <Download className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-black text-[#f6f8fb]">Mode hors-ligne</span>
                  <span className="mt-0.5 block text-[11px] text-[#d0d9e3]/85">
                    {downloadedEntries.length > 0
                      ? `${downloadedEntries.length} sourate${downloadedEntries.length > 1 ? 's' : ''} disponibles — ouvrir la bibliothèque`
                      : 'Aucune sourate téléchargée sur cet appareil'}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#e2d0ba]/80" />
              </button>
            )}
            <section className="home-hero">
              <div className="home-hero__atmosphere" aria-hidden="true">
                <div className="home-hero__wash" />
                <div className="home-hero__mesh" />
                <div className="home-hero__orb home-hero__orb--gold" />
                <div className="home-hero__orb home-hero__orb--warm" />
                <div className="home-hero__orb home-hero__orb--steel" />
                <div className="home-hero__rail" />
                <div className="home-hero__spark home-hero__spark--a" />
                <div className="home-hero__spark home-hero__spark--b" />
              </div>

              <div className="home-hero__content">
                <header className="home-hero__copy">
                  <p className="home-hero__brand home-hero__enter home-hero__enter--1">
                    <span className="reciter-name-gradient is-selected home-hero__brand-glow">Sawra</span>
                  </p>
                  <h2 className="home-hero__title home-hero__enter home-hero__enter--2">
                    Le Coran,
                    <span className="home-hero__title-line">
                      <span className="home-hero__accent">simplement.</span>
                    </span>
                  </h2>
                  <p className="home-hero__lede home-hero__enter home-hero__enter--3">
                    Reprenez votre lecture, trouvez une belle voix.
                  </p>
                </header>
              </div>
            </section>

            <div className="home-fusion-scope home-hero__enter home-hero__enter--4">
                  <button
                    type="button"
                    onClick={currentTrack ? handleResumeListening : () => handleNavigate('listen')}
                    className="home-hero__cta tap-feedback"
                    aria-label={
                      currentTrack
                        ? `Continuer la lecture : ${currentTrack.surah.name} avec ${currentTrack.reciter.name}`
                        : 'Continuer la lecture'
                    }
                  >
                    <span className="home-hero__cta-sheen" aria-hidden />
                    <span className="home-hero__cta-text">
                      <span className="home-hero__cta-title">Continuer la lecture</span>
                      <span className="home-hero__cta-meta">
                        {currentTrack
                          ? `${currentTrack.surah.name} · ${currentTrack.reciter.name}`
                          : 'Choisissez une voix et lancez l’écoute'}
                      </span>
                    </span>
                    <span className="home-hero__cta-play" aria-hidden>
                      <Play className="ml-0.5 h-4 w-4 fill-current" />
                    </span>
                  </button>

                  <HomeExploreFusionButton
                    enabled={exploreFusionEnabled}
                    reciters={reciters ?? []}
                    onExplore={handleExploreVoices}
                    onFusionProgressChange={handleExploreFusionProgress}
                    onFusionSpacerChange={handleExploreFusionSpacer}
                  />

                  <HomeQuizCta onOpen={() => handleNavigate('quiz')} />

                  <button
                    type="button"
                    onClick={() => handleNavigate('learn')}
                    className="home-hero__learn tap-feedback"
                  >
                    <span className="home-hero__learn-sheen" aria-hidden />
                    <span className="home-hero__learn-icon" aria-hidden>
                      <BookOpen className="h-4.5 w-4.5" />
                    </span>
                    <span className="home-hero__learn-text">
                      <span className="home-hero__learn-title">Apprendre</span>
                      <span className="home-hero__learn-meta">Flou, écoute, révélation</span>
                    </span>
                    <ArrowRight className="home-hero__learn-arrow h-4 w-4 shrink-0" aria-hidden />
                  </button>

              <div className="home-fusion-feed">
            {!isLoadingReciters && (
              <section className="flex flex-col gap-3">
                <ReciterCategoryGrid
                  reciters={reciters}
                  activeCategoryId={categoryModalId}
                  onOpenCategory={setCategoryModalId}
                />
              </section>
            )}

            {featuredReciters.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-end justify-between gap-3 px-0.5">
                  <div>
                    <h3 className="text-sm font-black text-[#f6f8fb]">Voix recommandées</h3>
                    <p className="mt-1 text-xs text-[#95a7ba]">Une sélection simple à lancer en un appui.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('listen');
                      setListenStep('reciters');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#d0d9e3] hover:text-[#e6d5c2]"
                  >
                    Tous
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="-mx-1 flex gap-1 overflow-x-auto px-1 py-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  {featuredReciters.map((reciter, index) => (
                    <HomeFeaturedReciter
                      key={reciter.id}
                      reciter={reciter}
                      isSelected={activeReciter?.id === reciter.id}
                      onSelect={() => handleSelectReciter(reciter)}
                      priority={index < 1}
                    />
                  ))}
                </div>
              </section>
            )}

            {favoritedReciters.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-end justify-between gap-3 px-0.5">
                  <div>
                    <h3 className="text-sm font-black text-[#f6f8fb]">Vos favoris</h3>
                    <p className="mt-1 text-xs text-[#95a7ba]">Retrouvez vos voix préférées sans détour.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNavigate('favorites')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#d0d9e3] hover:text-[#e6d5c2]"
                  >
                    Voir
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="-mx-1 flex gap-1 overflow-x-auto px-1 py-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  {favoritedReciters.slice(0, 8).map((reciter) => (
                    <HomeFeaturedReciter
                      key={reciter.id}
                      reciter={reciter}
                      isSelected={activeReciter?.id === reciter.id}
                      onSelect={() => handleSelectReciter(reciter)}
                    />
                  ))}
                </div>
              </section>
            )}

            <footer className="overflow-hidden rounded-[1.5rem] border border-[#30455c]/45 bg-[linear-gradient(165deg,rgba(16,27,42,0.92),rgba(8,15,24,0.96))]">
              <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8ea1b3]">
                      Sawra
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#f6f8fb]">
                      Le Coran, simplement.
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#95a7ba]">
                      PWA dispo · Apps stores bientôt en liste d’attente
                    </p>
                  </div>
                  <img
                    src="/icons/sansfond.webp"
                    alt=""
                    width="40"
                    height="40"
                    loading="lazy"
                    decoding="async"
                    className="h-10 w-10 shrink-0 object-contain opacity-90"
                    draggable={false}
                    aria-hidden
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const isStandalone =
                      window.matchMedia('(display-mode: standalone)').matches ||
                      // @ts-expect-error iOS Safari
                      Boolean(window.navigator.standalone);
                    if (isStandalone) {
                      alert('Sawra est déjà installé sur cet appareil.');
                      return;
                    }
                    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
                    alert(
                      isIos
                        ? 'Sur iPhone/iPad : ouvrez Safari → Partager → « Sur l’écran d’accueil ».'
                        : 'Sur Android/Chrome : menu ⋮ → « Installer l’application » ou « Ajouter à l’écran d’accueil ».'
                    );
                  }}
                  className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-full border border-[#bfa078]/30 bg-[#e2d0ba]/12 px-4 py-2.5 text-[12px] font-bold text-[#e6d5c2] transition-colors hover:bg-[#e2d0ba]/18 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078] tap-feedback"
                >
                  <Share className="h-3.5 w-3.5" aria-hidden />
                  Ajouter à l’écran d’accueil
                </button>

                <nav
                  aria-label="Liens utiles"
                  className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-[11px]"
                >
                  {[
                    { label: 'Sources', onClick: () => openLegal('sources') },
                    { label: 'Confidentialité', onClick: () => openLegal('privacy') },
                    { label: 'Conditions', onClick: () => openLegal('terms') },
                  ].map((item, index) => (
                    <React.Fragment key={item.label}>
                      {index > 0 && (
                        <span className="px-1.5 text-[#46607b]" aria-hidden>
                          ·
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={item.onClick}
                        className="min-h-9 px-1 text-[#aab7c5] transition-colors hover:text-[#e6d5c2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078]"
                      >
                        {item.label}
                      </button>
                    </React.Fragment>
                  ))}
                  <span className="px-1.5 text-[#46607b]" aria-hidden>
                    ·
                  </span>
                  <a
                    href={GOMUSLIMLIFE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 items-center gap-1 px-1 text-[#aab7c5] transition-colors hover:text-[#e6d5c2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078]"
                  >
                    GoMuslimLife
                    <ExternalLink className="h-3 w-3 opacity-50" aria-hidden />
                  </a>
                </nav>
              </div>

              <div className="flex flex-col items-center gap-2 border-t border-[#30455c]/40 bg-[#07111d]/35 px-4 py-3.5 text-center sm:px-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#6d8298]">
                  Sawra · {new Date().getFullYear()}
                </p>
                <a
                  href="https://sofianeweb.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 rounded-full border border-[#30455c]/45 bg-[#0c1522]/70 px-3 py-1.5 text-[11px] text-[#95a7ba] transition-all duration-300 hover:border-[#bfa078]/35 hover:bg-[#162538]/80 hover:text-[#e6edf5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078]"
                >
                  <span>Imaginé &amp; façonné par</span>
                  <span className="font-bold text-[#e6d5c2] transition-colors group-hover:text-[#e2d0ba]">
                    sofianeweb.fr
                  </span>
                  <span
                    className="inline-block text-[#bfa078] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                  >
                    ↗
                  </span>
                </a>
              </div>
            </footer>

            {exploreFusionEnabled && exploreFusionSpacerPx > 0 && (
              <div
                className="hidden md:block w-full shrink-0 pointer-events-none"
                style={{ height: exploreFusionSpacerPx }}
                aria-hidden
              />
            )}
              </div>
            </div>
          </div>
        )}

        {/* 2.1 Listening Hub — online wizard / offline downloaded library */}
        {activeTab === 'listen' && !isOnline && (
          <div className="flex flex-col gap-5 max-md:pt-4">
            <DownloadedSurahsPage entries={downloadedEntries} offlineMode />
          </div>
        )}

        {activeTab === 'listen' && isOnline && (
          <div
            className={`flex flex-col ${
              listenStep === 'surahs' && activeReciter
                ? 'gap-5 max-md:gap-0'
                : 'gap-5 max-md:pt-7 md:pt-6'
            }`}
          >
            {error && (
              <div className="glass-panel p-4 rounded-2xl border-[#f08c8c]/25 bg-[#f08c8c]/8 flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-[#f2a3a3] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-[#f6f8fb] text-sm">Connexion interrompue</h4>
                  <p className="text-xs text-[#c8d1db] mt-1">{error}</p>
                </div>
              </div>
            )}

            {listenStep === 'reciters' && (
              <div className="flex flex-col gap-5">
                {!isLoadingReciters && (
                  <ReciterCategoryGrid
                    reciters={reciters}
                    activeCategoryId={categoryModalId}
                    onOpenCategory={setCategoryModalId}
                  />
                )}

                <div className="relative">
                  <label htmlFor="reciter-search" className="sr-only">
                    Rechercher un récitateur
                  </label>
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95a7ba]" aria-hidden />
                  <input
                    id="reciter-search"
                    type="search"
                    value={reciterSearch}
                    onChange={(e) => setReciterSearch(e.target.value)}
                    placeholder="Rechercher un récitateur..."
                    aria-label="Rechercher un récitateur"
                    className="reciter-search-input w-full min-h-12 pl-12 pr-5 py-3.5 rounded-2xl text-sm text-[#e6edf5] placeholder:text-[#8295aa]"
                  />
                  {reciterSearch && (
                    <button
                      type="button"
                      onClick={() => setReciterSearch('')}
                      aria-label="Effacer la recherche"
                      className="absolute right-3 top-1/2 -translate-y-1/2 min-h-9 min-w-9 text-xs text-[#b4c0ce] hover:text-[#f6f8fb] px-2 py-1 bg-[#1b2d43] rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078]"
                    >
                      Effacer
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
                  <aside className="flex min-w-0 w-full flex-1 items-center gap-2 rounded-2xl border border-[#bfa078]/20 bg-[#111d2d]/70 px-3 py-2 sm:gap-3 sm:px-3.5 sm:py-3">
                    <span
                      className="ayah-sync-badge inline-flex shrink-0 items-center rounded-md border border-[#bfa078]/40 bg-[#bfa078]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] leading-none text-[#e2d0ba]"
                      aria-hidden
                    >
                      Versets
                    </span>
                    <MemoMarquee>
                      <span className="font-semibold text-[#e6edf5]">Verset par verset :</span>{' '}
                      le verset lu s’illumine avec l’audio. Ouvre le texte via{' '}
                      <BookOpen
                        className="mx-0.5 inline-block h-[1.125rem] w-[1.125rem] translate-y-[-1px] align-middle text-[#aab7c5]"
                        strokeWidth={2}
                        aria-label="bouton livre du lecteur"
                      />{' '}
                      dans le lecteur.
                    </MemoMarquee>
                  </aside>

                  <div
                    className="flex w-full shrink-0 items-center gap-0.5 rounded-2xl border border-[#30455c] bg-[#111d2d]/78 p-1 sm:w-auto sm:gap-1"
                    role="group"
                    aria-label="Filtrer par verset par verset"
                  >
                    {(
                      [
                        { id: 'all' as const, label: 'Tous' },
                        { id: 'with' as const, label: 'Versets' },
                        { id: 'without' as const, label: 'Sans' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAyahSyncFilter(opt.id)}
                        aria-pressed={ayahSyncFilter === opt.id}
                        className={`min-h-9 flex-1 rounded-xl px-2 text-[10px] font-bold tap-feedback sm:min-h-10 sm:flex-none sm:px-3 sm:text-[11px] ${
                          ayahSyncFilter === opt.id
                            ? 'bg-[#bfa078]/18 text-[#e2d0ba] border border-[#bfa078]/35'
                            : 'text-[#95a7ba] border border-transparent hover:text-[#e6edf5]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {reciterSearch.trim() && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl brand-card-muted px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#e6edf5]">
                        {isSearchPending ? 'Recherche...' : `${filteredReciters.length} résultat${filteredReciters.length > 1 ? 's' : ''}`}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#95a7ba] truncate">
                        Accents, aliases et orthographes proches.
                      </p>
                    </div>
                    <span className="brand-chip shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest">
                      Smart
                    </span>
                  </div>
                )}

                {isLoadingReciters ? (
                  <RecitersLoadingSkeleton />
                ) : filteredReciters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center glass-panel rounded-3xl gap-2">
                    <p className="text-[#b4c0ce]">
                      {ayahSyncFilter === 'with'
                        ? 'Aucun récitateur avec verset par verset'
                        : ayahSyncFilter === 'without'
                          ? 'Aucun récitateur sans sync versets'
                          : 'Aucun récitateur trouvé'}
                    </p>
                    {ayahSyncFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setAyahSyncFilter('all')}
                        className="mt-2 text-xs font-semibold text-[#e2d0ba] underline-offset-2 hover:underline"
                      >
                        Réafficher tous
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {recentReciters.length > 0 && (
                      <section className="flex flex-col gap-3">
                        <h3 className="text-sm font-bold text-[#d7e4ef] flex items-center gap-2">
                          <History className="w-4 h-4 text-[#e2d0ba]" />
                          Vos derniers récitateurs écoutés
                        </h3>
                        <div className="grid grid-cols-1 gap-3.5">
                          {recentReciters.map((reciter) => (
                            <ReciterCard
                              key={`recent-${reciter.id}`}
                              reciter={reciter}
                              isSelected={activeReciter?.id === reciter.id}
                              onSelect={() => handleSelectReciter(reciter)}
                              isFavorite={favorites.includes(reciter.id)}
                              onToggleFavorite={(e) => toggleFavorite(reciter.id, e)}
                              searchQuery={reciterSearch}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {(() => {
                      const favoritedOnly = listenFavoritedReciters.filter(
                        (r) => !recentReciters.some((recent) => recent.id === r.id),
                      );
                      if (favoritedOnly.length === 0) return null;
                      return (
                      <section className="flex flex-col gap-3">
                        <h3 className="text-sm font-bold text-[#d7e4ef] flex items-center gap-2">
                          <Heart className="w-4 h-4 text-red-400 fill-current" />
                          Favoris
                        </h3>
                        <div className="grid grid-cols-1 gap-3.5">
                          {favoritedOnly.map((reciter) => (
                            <ReciterCard
                              key={reciter.id}
                              reciter={reciter}
                              isSelected={activeReciter?.id === reciter.id}
                              onSelect={() => handleSelectReciter(reciter)}
                              isFavorite={true}
                              onToggleFavorite={(e) => toggleFavorite(reciter.id, e)}
                              searchQuery={reciterSearch}
                            />
                          ))}
                        </div>
                      </section>
                      );
                    })()}

                    <section className="flex flex-col gap-3">
                      {!deferredReciterSearch.trim() && (
                        <h3 className="text-sm font-bold text-[#d7e4ef]">
                          {recentReciters.length > 0 || listenFavoritedReciters.length > 0
                            ? 'Tous les récitateurs'
                            : 'Récitateurs'}
                        </h3>
                      )}
                      <div className="grid grid-cols-1 gap-3.5">
                        {catalogReciters.map((reciter) => (
                          <ReciterCard
                            key={reciter.id}
                            reciter={reciter}
                            isSelected={activeReciter?.id === reciter.id}
                            onSelect={() => handleSelectReciter(reciter)}
                            isFavorite={favorites.includes(reciter.id)}
                            onToggleFavorite={(e) => toggleFavorite(reciter.id, e)}
                            searchQuery={reciterSearch}
                          />
                        ))}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            )}

            {listenStep === 'surahs' && !activeReciter && (
              <div className="flex flex-col items-center justify-center p-12 text-center glass-panel rounded-3xl gap-4">
                <p className="text-[#b4c0ce] text-sm">Choisissez un récitateur pour continuer.</p>
                <button
                  type="button"
                  onClick={handleChangeReciter}
                  className="brand-button-primary px-5 py-2.5 rounded-xl font-semibold text-xs tap-feedback"
                >
                  Voir les récitateurs
                </button>
              </div>
            )}

            {listenStep === 'surahs' && activeReciter && (
              <div className="listen-surahs-panel flex flex-col gap-5 max-md:gap-0 md:gap-6">
                <ListenReciterHeader
                  activeReciter={activeReciter}
                  activeMoshaf={activeMoshaf}
                  fusionEnabled={reciterFusionEnabled}
                  isFavorite={favorites.includes(activeReciter.id)}
                  onFusionProgressChange={handleReciterFusionProgress}
                  onFusionSpacerChange={handleReciterFusionSpacer}
                  onChangeReciter={handleChangeReciter}
                  onSelectMoshaf={setActiveMoshaf}
                  onToggleFavorite={(e) => toggleFavorite(activeReciter.id, e)}
                  onPlay={handlePlayFatihah}
                  sectionRef={surahSectionRef}
                />

                <div className="relative z-0 max-md:px-0 max-md:pt-4">
                  <Suspense fallback={<div className="shimmer-loader h-40 rounded-2xl border border-slate-900" />}>
                    <SurahList onChooseReciter={handleChangeReciter} />
                  </Suspense>
                </div>

                {reciterFusionEnabled && reciterFusionSpacerPx > 0 && (
                  <div
                    className="hidden md:block shrink-0 pointer-events-none"
                    style={{ height: reciterFusionSpacerPx }}
                    aria-hidden
                  />
                )}
              </div>
            )}
          </div>
        )}

        {((activeTab === 'moments' && isOnline) || activeTab === 'favorites') && (
          <div className="md:hidden pt-4 pb-1">
            <div
              className="flex gap-1 rounded-2xl border border-[#30455c]/50 bg-[#0f1928]/80 p-1"
              role="tablist"
              aria-label="Favoris et Moments"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'favorites'}
                onClick={() => handleNavigate('favorites')}
                className={`min-h-10 flex-1 rounded-xl px-2 py-2 text-[11px] font-bold transition-all tap-feedback ${
                  activeTab === 'favorites'
                    ? 'bg-[#e2d0ba]/14 text-[#e6d5c2]'
                    : 'text-[#95a7ba] hover:text-[#e6edf5]'
                }`}
              >
                Favoris
              </button>
              {isOnline && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'moments'}
                  onClick={() => handleNavigate('moments')}
                  className={`min-h-10 flex-1 rounded-xl px-2 py-2 text-[11px] font-bold transition-all tap-feedback ${
                    activeTab === 'moments'
                      ? 'bg-[#e2d0ba]/14 text-[#e6d5c2]'
                      : 'text-[#95a7ba] hover:text-[#e6edf5]'
                  }`}
                >
                  Moments
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'moments' && isOnline && (
          <div className="flex flex-col gap-5 pb-16 sm:pb-20 max-md:pt-2 md:pt-3">
            <section className="relative overflow-hidden rounded-3xl border border-[#30455c]/55 bg-[linear-gradient(180deg,rgba(17,29,45,0.94),rgba(9,17,28,0.98))] p-5 sm:p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(241,232,220,0.12),transparent_42%),radial-gradient(circle_at_85%_20%,rgba(121,144,161,0.14),transparent_28%)]" aria-hidden="true" />
              <div className="relative z-10 flex flex-col gap-5">
                <div className="max-w-2xl">
                  <span className="brand-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                    Moments
                  </span>
                  <h2 className="mt-3 text-xl font-black text-[#f6f8fb] sm:text-[1.75rem]">Récitations marquantes</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#b4c0ce]">
                    Une sélection mise en avant, puis d'autres récitations à ouvrir juste en dessous.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div className="rounded-2xl border border-[#30455c]/45 bg-[#101b2a]/78 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8ea1b3]">Sélection</p>
                    <p className="mt-1 text-lg font-black text-[#f6f8fb]">{MAKKAH_MOMENTS.length}</p>
                  </div>
                  <div className="rounded-2xl border border-[#30455c]/45 bg-[#101b2a]/78 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8ea1b3]">À la une</p>
                    <p className="mt-1 text-sm font-black text-[#f6f8fb]">1 vidéo</p>
                  </div>
                  <div className="rounded-2xl border border-[#30455c]/45 bg-[#101b2a]/78 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8ea1b3]">Format</p>
                    <p className="mt-1 text-sm font-black text-[#f6f8fb]">YouTube</p>
                  </div>
                  <div className="rounded-2xl border border-[#30455c]/45 bg-[#101b2a]/78 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8ea1b3]">Accès</p>
                    <p className="mt-1 text-sm font-black text-[#f6f8fb]">Direct</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <div className="px-0.5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8ea1b3]">À la une</p>
                <h3 className="mt-1 text-lg font-black text-[#f6f8fb]">{MAKKAH_MOMENTS[0].reciter}</h3>
              </div>
              <MakkahMomentCard {...MAKKAH_MOMENTS[0]} featured />
            </section>

            <section className="flex flex-col gap-3">
              <div className="px-0.5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8ea1b3]">Sélection</p>
                <h3 className="mt-1 text-lg font-black text-[#f6f8fb]">Autres récitations</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {MAKKAH_MOMENTS.slice(1).map((moment) => (
                  <MakkahMomentCard key={moment.id} {...moment} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* 2.2 Tab Favorites View */}
        {activeTab === 'favorites' && (
          <div className="flex flex-col gap-5 pb-16 sm:pb-20 max-md:pt-2 md:pt-3">
            <h2 className="text-lg font-bold text-[#f6f8fb] flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500 fill-current" />
              Vos Récitateurs Favoris
            </h2>

            {favoritedReciters.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center glass-panel rounded-3xl gap-4">
                <Heart className="w-12 h-12 text-[#46607b]" />
                <div>
                  <h3 className="font-semibold text-[#e6edf5]">Favoris Vides</h3>
                  <p className="text-xs text-[#b4c0ce] max-w-xs mt-1">
                    Appuyez sur l'icône de cœur sur la carte d'un récitateur dans l'espace Écouter pour l'ajouter ici.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('listen')}
                  className="brand-button-primary px-5 py-2.5 rounded-xl font-semibold text-xs transition-colors tap-feedback"
                >
                  Aller vers Écouter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {favoritedReciters.map((reciter) => (
                  <ReciterCard
                    key={reciter.id}
                    reciter={reciter}
                    isSelected={activeReciter?.id === reciter.id}
                    onSelect={() => handleSelectReciter(reciter)}
                    isFavorite={true}
                    onToggleFavorite={(e) => toggleFavorite(reciter.id, e)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2.2a Tab Quiz (accès Accueil uniquement) */}
        {activeTab === 'quiz' && (
          <Suspense fallback={<div className="shimmer-loader h-48 rounded-3xl border border-slate-900 max-md:mx-4" />}>
            <QuizPage
              onBack={() => handleNavigate('home')}
              onListenSurah={handleListenSurahFromQuiz}
            />
          </Suspense>
        )}

        {/* 2.2a2 Tab Apprentissage (accès Accueil uniquement) */}
        {activeTab === 'learn' && (
          <Suspense fallback={<div className="shimmer-loader h-48 rounded-3xl border border-slate-900 max-md:mx-4" />}>
            <LearnPage
              onBack={() => handleNavigate('home')}
              onListenSurah={handleListenSurahFromQuiz}
            />
          </Suspense>
        )}

        {/* 2.2b Tab Connexion */}
        {activeTab === 'account' && (
          <div className="flex flex-col justify-center gap-5 max-md:min-h-[calc(100dvh-5.1rem-env(safe-area-inset-bottom,0px))] max-md:py-4 md:min-h-[min(70vh,40rem)] md:pt-10 md:pb-12 md:max-w-lg md:mx-auto md:w-full">
            <Suspense fallback={<div className="shimmer-loader h-48 rounded-3xl border border-slate-900" />}>
              <AccountPanel />
            </Suspense>
          </div>
        )}

        {/* 2.3 Tab More View */}
        {activeTab === 'more' && (
          <div className="flex flex-col gap-5 max-md:pt-4 md:pt-3">
            <section className="glass-panel rounded-3xl border border-[#30455c]/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="brand-chip-cool inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                    Plus
                  </span>
                  <h2 className="mt-3 text-lg font-black text-[#f6f8fb]">Fonctions avancées et informations</h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleNavigate('account')}
                className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-[#bfa078]/30 bg-[#e2d0ba]/[0.08] px-4 py-3.5 text-left transition-colors hover:bg-[#e2d0ba]/[0.14] tap-feedback md:hidden"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#20334a] text-[#e6d5c2]">
                  <User className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-black text-[#f6f8fb]">Connexion</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-[#95a7ba]">
                    {user ? 'Compte synchronisé — favoris & reprise' : 'Synchroniser favoris et reprise de lecture'}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#bfa078]/80" />
              </button>

              <NavDesktopStyleToggle
                value={navDesktopStyle}
                onChange={handleNavDesktopStyleChange}
              />

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {([
                  { id: 'downloads' as const, label: 'Téléchargées' },
                  { id: 'legal' as const, label: 'Légal' },
                  { id: 'priorities' as const, label: 'Priorités' },
                  { id: 'compare' as const, label: 'Comparer' },
                  { id: 'about' as const, label: 'À propos' },
                ]).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMorePanel(item.id)}
                    aria-pressed={morePanel === item.id}
                    className={`min-h-11 rounded-2xl border px-3 py-3 text-xs font-bold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078] ${
                      morePanel === item.id
                        ? 'border-[#bfa078]/35 bg-[#e2d0ba]/12 text-[#e6d5c2]'
                        : 'border-[#30455c] bg-[#111d2d]/72 text-[#b4c0ce] hover:text-[#f6f8fb]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            {morePanel === 'downloads' && (
              <DownloadedSurahsPage
                entries={downloadedEntries}
                onOpenReciter={(selected) => handleSelectReciter(selected)}
              />
            )}

            {morePanel === 'legal' && (
              <div className="flex flex-col gap-4">
                <div
                  className="flex gap-1 rounded-2xl border border-[#30455c]/50 bg-[#0f1928]/80 p-1"
                  role="tablist"
                  aria-label="Informations légales"
                >
                  {([
                    { id: 'sources' as const, label: 'Sources' },
                    { id: 'privacy' as const, label: 'Confidentialité' },
                    { id: 'terms' as const, label: 'Conditions' },
                  ]).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={legalSub === item.id}
                      onClick={() => setLegalSub(item.id)}
                      className={`min-h-10 flex-1 rounded-xl px-2 py-2 text-[11px] sm:text-xs font-bold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078] ${
                        legalSub === item.id
                          ? 'bg-[#e2d0ba]/14 text-[#e6d5c2]'
                          : 'text-[#95a7ba] hover:text-[#e6edf5]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <Suspense fallback={<div className="shimmer-loader h-40 rounded-2xl border border-slate-900" />}>
                  {legalSub === 'sources' && <SourcesPanel />}
                  {legalSub === 'privacy' && <PrivacyPanel />}
                  {legalSub === 'terms' && <TermsPanel />}
                </Suspense>
              </div>
            )}

            {morePanel === 'priorities' && (
              <div className="grid grid-cols-1 gap-3">
                {PRODUCT_PRIORITIES.map((priority) => (
                  <ProductPriorityCard key={priority.id} {...priority} />
                ))}
              </div>
            )}

            {morePanel === 'compare' && (
              <Suspense fallback={<div className="shimmer-loader h-40 rounded-2xl border border-slate-900" />}>
                <ReciterCompare />
              </Suspense>
            )}

            {morePanel === 'about' && (
              <Suspense fallback={<div className="shimmer-loader h-40 rounded-2xl border border-slate-900" />}>
                <AboutPanel onOpenLegal={openLegal} />
              </Suspense>
            )}
          </div>
        )}
        </div>
      </main>

      {/* Category modal (listen step) */}
      {activeCategory && (
        <ReciterCategoryModal
          category={activeCategory}
          reciters={reciters}
          activeReciterId={activeReciter?.id}
          favorites={favorites}
          onClose={() => setCategoryModalId(null)}
          onSelect={handleSelectReciter}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {/* 3. Global Audio Player Sheet */}
      {currentTrack && activeTab !== 'account' && activeTab !== 'quiz' && activeTab !== 'learn' && (
        <Suspense fallback={null}>
          <GlobalPlayerV2
            desktopChrome={navDesktopStyle}
            onDesktopChromeChange={handleNavDesktopStyleChange}
          />
        </Suspense>
      )}

      <BatchDownloadToast />

      {/* 4. Floating Navbar — hidden on quiz / learn pages */}
      {activeTab !== 'quiz' && activeTab !== 'learn' && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          dockWithPlayer={Boolean(currentTrack) && activeTab !== 'account'}
          desktopStyle={navDesktopStyle}
          showMoments={isOnline}
          onOpenQuiz={() => handleNavigate('quiz')}
          onOpenLearn={() => handleNavigate('learn')}
          reciterFusion={
            reciterFusionEnabled && activeReciter
              ? {
                  progress: reciterFusionProgress,
                  reciter: activeReciter,
                  activeMoshaf,
                  onChangeReciter: handleChangeReciter,
                }
              : null
          }
          exploreFusion={
            exploreFusionEnabled
              ? {
                  progress: exploreFusionProgress,
                  onExplore: handleExploreVoices,
                }
              : null
          }
        />
      )}

    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AudioProvider>
        <AppContent />
      </AudioProvider>
    </AuthProvider>
  );
}

export default App;
