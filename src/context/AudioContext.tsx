import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { Reciter, Moshaf, Surah, AudioTrack, PlaybackStatus } from '../types';
import { SURAHS } from '../data/surahs';
import { SEEDED_RECITERS } from '../data/recitersSeed';
import { simplifyMoshafName } from '../utils/moshafLabel';
import { filterCuratedReciters, CURATED_RECITER_IDS } from '../data/curatedReciters';
import { getAudioUrl } from '../utils/audioUrl';
import { syncWidgetPlayback } from '../utils/widgetSync';
import { capturePostHogEvent } from '../utils/posthog';
import {
  getAudioCacheInfo,
  downloadAndCacheUrl,
  deleteCachedUrl,
  getCachedBlobUrl,
  clearAudioCache,
  isUrlCached,
} from '../utils/offlineManager';
import {
  DEFAULT_PLAYER_V2_PREFS,
  loadPlayerV2Prefs,
  savePlayerV2Prefs,
  type PlayerV2Prefs,
} from '../components/player/playerV2Prefs';
import { getAppOptions } from '../utils/appOptions';
import { AudioEffectsEngine } from '../audio/effectsEngine';
import {
  effectsNeedProcessing,
  loadAudioEffects,
  normalizeAudioEffects,
  saveAudioEffects,
  type AudioEffectsSettings,
} from '../audio/effectsTypes';
import {
  fetchAyahTimings,
  getTimingForAyah,
  resolveTimingReadId,
} from '../utils/ayahTiming';

export type RemotePlaybackSession = {
  reciterId: number;
  moshafId: number;
  surahId: number;
  positionSeconds: number;
  ayah: number | null;
  deviceId: string;
  deviceLabel: string | null;
  updatedAt: string;
};

interface AudioContextType {
  // Playback state
  currentTrack: AudioTrack | null;
  playbackStatus: PlaybackStatus;
  currentTime: number;
  duration: number;
  volume: number;
  playbackSpeed: number;
  repeatMode: 'none' | 'one' | 'all';
  sleepTimer: number | null;
  playerTheme: string;
  audioEffects: AudioEffectsSettings;
  setAudioEffects: (
    effects: AudioEffectsSettings | ((prev: AudioEffectsSettings) => AudioEffectsSettings)
  ) => void;
  effectsSupported: boolean;

  /** Another signed-in device is currently playing */
  remoteSession: RemotePlaybackSession | null;
  setRemoteSession: (session: RemotePlaybackSession | null) => void;
  takeOverRemoteSession: () => Promise<boolean>;
  registerTakeOverHandler: (handler: (() => Promise<boolean>) | null) => void;
  /** Ignore remote takeover signals until this timestamp (ms) */
  suppressRemoteUntil: number;
  setSuppressRemoteUntil: (ts: number) => void;
  getAccurateCurrentTime: () => number;
  isSeekingNow: () => boolean;

  // Offline / Cache States & Actions
  cachedUrls: Set<string>;
  downloadProgress: Record<string, number>;
  cacheInfo: { count: number; totalSizeMb: number } | null;
  batchDownload: {
    done: number;
    total: number;
    /** 0–100 progress of the file currently downloading */
    fileProgress: number;
    /** Name of the surah currently downloading */
    currentSurahName?: string;
    active: boolean;
    reciterName?: string;
    startedAt?: number;
  } | null;
  downloadSurah: (reciter: Reciter, moshaf: Moshaf, surah: Surah) => Promise<void>;
  downloadSurahs: (reciter: Reciter, moshaf: Moshaf, surahs: Surah[]) => Promise<void>;
  downloadAllSurahs: (reciter: Reciter, moshaf: Moshaf) => Promise<void>;
  deleteAllSurahs: (reciter: Reciter, moshaf: Moshaf) => Promise<void>;
  cancelBatchDownload: () => void;
  deleteSurah: (reciter: Reciter, moshaf: Moshaf, surah: Surah) => Promise<void>;
  clearCache: () => Promise<void>;
  
  // Lists and loading states
  reciters: Reciter[];
  isLoadingReciters: boolean;
  error: string | null;
  
  // Selected configuration
  activeReciter: Reciter | null;
  activeMoshaf: Moshaf | null;
  activeSurah: Surah | null;

  // Playlist selection (checked surahs)
  selectedSurahIds: Set<number>;
  setSelectedSurahIds: (ids: Set<number> | ((prev: Set<number>) => Set<number>)) => void;

  // Player V2 personalization
  playerV2Prefs: PlayerV2Prefs;
  setPlayerV2Prefs: (prefs: PlayerV2Prefs | ((prev: PlayerV2Prefs) => PlayerV2Prefs)) => void;

  /** Apply cloud-synced player preferences + playlist */
  hydrateCloudSettings: (payload: {
    volume?: number;
    playbackSpeed?: number;
    repeatMode?: 'none' | 'one' | 'all';
    playerTheme?: string;
    playerV2Prefs?: Partial<PlayerV2Prefs>;
    selectedSurahIds?: number[];
  }) => void;
  
  // Actions
  setActiveReciter: (reciter: Reciter | null) => void;
  setActiveMoshaf: (moshaf: Moshaf | null) => void;
  setActiveSurah: (surah: Surah | null) => void;
  playTrack: (reciter: Reciter, moshaf: Moshaf, surah: Surah, startAt?: number) => void;
  playFromAyah: (reciter: Reciter, moshaf: Moshaf, surah: Surah, ayah: number) => Promise<void>;
  seekToAyah: (ayah: number) => Promise<void>;
  hydratePlaybackState: (payload: {
    reciterId: number;
    moshafId: number;
    surahId: number;
    positionSeconds: number;
  }) => boolean;
  togglePlay: () => void;
  pause: () => void;
  play: () => void;
  /** Pause audio and clear the current track (dismiss player bar). */
  dismissTrack: () => void;
  seekTo: (time: number) => void;
  setVolume: (vol: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setRepeatMode: (mode: 'none' | 'one' | 'all') => void;
  setCustomPlaylistOrder: (order: number[] | null) => void;
  /** Multi-reciter radio queue (surah + voice pairs). Clears on null. */
  setRadioSlotQueue: (slots: Array<{ reciterId: number; surahId: number }> | null) => void;
  setSleepTimer: (time: number | null) => void;
  setPlayerTheme: (theme: string) => void;
  playNextTrack: () => void;
  playPrevTrack: () => void;
  getAvailableSurahs: (reciter: Reciter | null, moshaf: Moshaf | null) => Surah[];
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const LOCAL_STORAGE_PREFIX = 'quran_streamer_';
const RECITERS_CACHE_KEY = `${LOCAL_STORAGE_PREFIX}reciters_cache`;
const ARTWORK_URL = '/icons/artwork.png';
const API_RECITERS_URL = 'https://www.mp3quran.net/api/v3/reciters?language=fr';

const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private browsing modes.
  }
};

const parseSavedNumber = (key: string, fallback: number, min?: number, max?: number) => {
  const saved = readStorage(key);
  const parsed = saved === null ? NaN : Number.parseFloat(saved);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max ?? parsed, Math.max(min ?? parsed, parsed));
};

// Curated display-name corrections keyed by reciter ID.
// The API transliterations are often inconsistent; these take priority.
const RECITER_NAME_CORRECTIONS: Record<number, string> = {
  // Featured reciters
  123: 'Mishary Rachid Al-Afasy',
  54:  'Abderrahmane Al-Soudais',
  102: 'Maher Al-Mouaiqly',
  31:  'Saoud Al-Shuraim',
  30:  'Saad El-Ghamidi',
  5:   'Ahmed El-Ajami',
  112: 'Mohamed Siddiq El-Menchaoui',
  118: 'Mahmoud Khalil Al-Housary',
  // Other common reciters
  51:  'Abdel Bassit Abdel Samad',
  74:  'Ali Al-Houdhayfi',
  76:  'Ali Jaber',
  81:  'Fares Abbad',
  84:  'Fawaz Alkabi',
  86:  'Nasser Al-Qatami',
  89:  'Hani Arrifai',
  92:  'Yasser Al-Dossary',
  111: 'Mohamed Jibreel',
  121: 'Mahmoud Ali Albanna',
  125: 'Mustafa Ismail',
  137: 'Ahmad Talib bin Humaid',
  152: 'Yasser Salamah',
  225: 'Abdulrahman Aloosi',
  226: 'Khalid Al-Ghamdi',
  106: 'Mohamed Tablaoui',
  107: 'Mohamed El-Louhaïdan',
  109: 'Mohamed Ayyoub',
  4:   'Abou Bakr Al-Chatri',
  49:  'Abdel Bari Al-Toubaïty',
  43:  'Salah Al-Boudeir',
  62:  'Abdullah Al-Johani',
  67:  'Abdelmohsen Al-Qasim',
  71:  'Abdelwadoud Hanif',
  78:  'Imad Zuhair Hafez',
  80:  'Omar Al-Qazabri',
  17:  'Tawfiq Al-Sayegh',
  20:  'Khaled Al-Jalil',
  21:  'Khaled Al-Qahtani',
  24:  'Khalifa Al-Tounaïji',
  25:  'Daoud Hamza',
  48:  'Adel Ryyan',
  46:  'Salah Boukhater',
  60:  'Abdullah Basfar',
  104: 'Mohammad Al-Airawy',
  44:  'Salah Al-Hachem',
  94:  'Yasser Al-Faylakawi',
  100: 'Majed Al-Enezi',
  70:  'Saud Al-Kanakeri',
  230: 'Rami Al-Dais',
  221: 'Raad Al-Kurdi',
  217: 'Bandar Balilah',
  245: 'Mansour Al-Salemi',
  254: 'Badr Al-Turki',
  272: 'Okasha Kameny',
  12:  'Idris Abkar',
  160: 'Adel Al-Khalbani',
  163: 'Hatem Farid Al-Waar',
  197: 'Moeedh Al-Harthi',
  202: 'Abdullah Al-Kandari',
  178: 'Ibrahim Al-Dossary',
  149: 'Maher Chakachero',
  236: 'Abdulrahman Al-Majed',
  27:  'Rachid Belalya',
};

const applyNameCorrections = (reciters: Reciter[]): Reciter[] =>
  reciters.map((r) => {
    const withName = RECITER_NAME_CORRECTIONS[r.id]
      ? { ...r, name: RECITER_NAME_CORRECTIONS[r.id] }
      : r;
    return {
      ...withName,
      moshaf: withName.moshaf.map((m) => ({
        ...m,
        name: simplifyMoshafName(m.name),
      })),
    };
  });

const stabilizeFirstScreenReciters = (apiReciters: Reciter[]) => {
  const corrected = applyNameCorrections(apiReciters);
  const curated = filterCuratedReciters(corrected);
  const byId = new Map(curated.map((reciter) => [reciter.id, reciter]));

  // Prefer curated catalogue order; fall back to seed entries until API has them.
  const ordered: Reciter[] = [];
  for (const id of CURATED_RECITER_IDS) {
    const fromApi = byId.get(id);
    if (fromApi) {
      ordered.push(fromApi);
      continue;
    }
    const fromSeed = SEEDED_RECITERS.find((reciter) => reciter.id === id);
    if (fromSeed) ordered.push(fromSeed);
  }
  return ordered;
};


export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reciters, setReciters] = useState<Reciter[]>(() => filterCuratedReciters(SEEDED_RECITERS));
  const [isLoadingReciters, setIsLoadingReciters] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active configurations
  const [activeReciter, setActiveReciterState] = useState<Reciter | null>(null);
  const [activeMoshaf, setActiveMoshafState] = useState<Moshaf | null>(null);
  const [activeSurah, setActiveSurahState] = useState<Surah | null>(null);

  // Playback states
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(1.0);
  const [remoteSession, setRemoteSession] = useState<RemotePlaybackSession | null>(null);
  const [suppressRemoteUntil, setSuppressRemoteUntil] = useState(0);
  const takeOverHandlerRef = useRef<(() => Promise<boolean>) | null>(null);
  const suppressRemoteUntilRef = useRef(0);
  const [repeatMode, setRepeatModeState] = useState<'none' | 'one' | 'all'>(() => {
    const saved = readStorage(`${LOCAL_STORAGE_PREFIX}repeat_mode`);
    return (saved === 'none' || saved === 'one' || saved === 'all') ? saved : 'all';
  });
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [playerTheme, setPlayerThemeState] = useState<string>(() => {
    return readStorage(`${LOCAL_STORAGE_PREFIX}player_theme`) || 'emerald';
  });
  // IDs of user-selected (checked) surahs; empty = play all
  const [selectedSurahIds, setSelectedSurahIdsState] = useState<Set<number>>(() => {
    try {
      const raw = readStorage(`${LOCAL_STORAGE_PREFIX}selected_surah_ids`);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return new Set();
      return new Set(
        parsed
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id >= 1 && id <= 114)
      );
    } catch {
      return new Set();
    }
  });
  const [playerV2Prefs, setPlayerV2PrefsState] = useState<PlayerV2Prefs>(() => loadPlayerV2Prefs());
  const [audioEffects, setAudioEffectsState] = useState<AudioEffectsSettings>(() => loadAudioEffects());
  const [effectsSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);
  });
  const effectsEngineRef = useRef<AudioEffectsEngine | null>(null);
  const audioEffectsRef = useRef(audioEffects);
  const selectedSurahIdsRef = useRef<Set<number>>(selectedSurahIds);
  const customPlaylistOrderRef = useRef<number[] | null>(null);
  const radioSlotQueueRef = useRef<Array<{ reciterId: number; surahId: number }> | null>(null);
  const radioSlotIndexRef = useRef(0);
  const autoResumeRef = useRef<{
    reciter: Reciter;
    moshaf: Moshaf;
    surah: Surah;
    time: number;
  } | null>(null);
  const autoResumeAttemptedRef = useRef(false);
  const recitersRef = useRef(reciters);
  useEffect(() => {
    recitersRef.current = reciters;
  }, [reciters]);
  useEffect(() => {
    selectedSurahIdsRef.current = selectedSurahIds;
  }, [selectedSurahIds]);

  const sortPlaylistByCustomOrder = <T extends { id: number }>(playlist: T[]): T[] => {
    const order = customPlaylistOrderRef.current;
    if (!order?.length) return playlist;
    const rank = new Map(order.map((id, i) => [id, i]));
    return [...playlist].sort(
      (a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  };

  const setCustomPlaylistOrder = useCallback((order: number[] | null) => {
    customPlaylistOrderRef.current = order?.length ? [...order] : null;
  }, []);

  const setRadioSlotQueue = useCallback((slots: Array<{ reciterId: number; surahId: number }> | null) => {
    radioSlotQueueRef.current = slots?.length ? slots.map((s) => ({ ...s })) : null;
    radioSlotIndexRef.current = 0;
    if (!slots?.length) return;
    customPlaylistOrderRef.current = slots.map((s) => s.surahId);
  }, []);

  useEffect(() => {
    audioEffectsRef.current = audioEffects;
  }, [audioEffects]);

  const repeatModeRef = useRef(repeatMode);
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  // Audio HTML5 Reference
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekingUntilRef = useRef(0);
  const markSeeking = () => {
    seekingUntilRef.current = Date.now() + 320;
  };
  const isSeekingNow = () => Date.now() < seekingUntilRef.current;

  const ensureEffectsEngine = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !effectsSupported) return null;

    if (!effectsEngineRef.current) {
      effectsEngineRef.current = new AudioEffectsEngine();
    }
    const engine = effectsEngineRef.current;
    if (!engine.isConnected) {
      // Required for MediaElementSource on cross-origin streams (mp3quran sends ACAO: *)
      if (audio.src && !audio.src.startsWith('blob:')) {
        audio.crossOrigin = 'anonymous';
      }
      engine.connect(audio);
    }
    await engine.resume();
    engine.apply(audioEffectsRef.current);
    return engine;
  }, [effectsSupported]);

  const syncEffectsToEngine = useCallback(async (settings: AudioEffectsSettings) => {
    if (!effectsSupported) return;

    if (effectsNeedProcessing(settings)) {
      await ensureEffectsEngine();
      return;
    }

    // Keep bypass path if the graph was already created (cannot detach MediaElementSource)
    effectsEngineRef.current?.apply(settings);
  }, [effectsSupported, ensureEffectsEngine]);

  // Offline / Cache States & Actions
  const [cachedUrls, setCachedUrls] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [cacheInfo, setCacheInfo] = useState<{ count: number; totalSizeMb: number } | null>(null);
  const [batchDownload, setBatchDownload] = useState<{
    done: number;
    total: number;
    fileProgress: number;
    currentSurahName?: string;
    active: boolean;
    reciterName?: string;
    startedAt?: number;
  } | null>(null);
  const batchAbortRef = useRef(false);
  const batchAbortControllerRef = useRef<AbortController | null>(null);

  const refreshCacheInfo = useCallback(async () => {
    const info = await getAudioCacheInfo();
    setCachedUrls(new Set(info.cachedUrls));
    setCacheInfo({ count: info.count, totalSizeMb: info.totalSizeMb });
  }, []);

  useEffect(() => {
    refreshCacheInfo();
  }, [refreshCacheInfo]);

  const downloadSurahs = useCallback(async (reciter: Reciter, moshaf: Moshaf, surahs: Surah[]) => {
    if (batchDownload?.active || surahs.length === 0) return;

    const pending: Surah[] = [];
    for (const surah of surahs) {
      const url = getAudioUrl(moshaf, surah);
      if (!(await isUrlCached(url))) pending.push(surah);
    }

    if (pending.length === 0) {
      setBatchDownload({
        done: 0,
        total: 0,
        fileProgress: 0,
        active: false,
        reciterName: reciter.name,
      });
      window.setTimeout(() => setBatchDownload(null), 2000);
      return;
    }

    const startedAt = Date.now();
    batchAbortRef.current = false;
    const controller = new AbortController();
    batchAbortControllerRef.current = controller;
    setBatchDownload({
      done: 0,
      total: pending.length,
      fileProgress: 0,
      currentSurahName: pending[0]?.name,
      active: true,
      reciterName: reciter.name,
      startedAt,
    });
    let done = 0;
    let cancelled = false;

    for (const surah of pending) {
      if (batchAbortRef.current || controller.signal.aborted) {
        cancelled = true;
        break;
      }
      const url = getAudioUrl(moshaf, surah);
      try {
        setDownloadProgress((prev) => ({ ...prev, [url]: 0 }));
        setBatchDownload({
          done,
          total: pending.length,
          fileProgress: 0,
          currentSurahName: surah.name,
          active: true,
          reciterName: reciter.name,
          startedAt,
        });
        await downloadAndCacheUrl(
          url,
          (progress) => {
            if (controller.signal.aborted) return;
            const clamped = Math.min(100, Math.max(0, progress));
            setDownloadProgress((prev) => ({ ...prev, [url]: clamped }));
            setBatchDownload((prev) =>
              prev?.active
                ? { ...prev, fileProgress: Math.max(prev.fileProgress, clamped) }
                : prev
            );
          },
          controller.signal
        );
        if (controller.signal.aborted || batchAbortRef.current) {
          cancelled = true;
          setDownloadProgress((prev) => {
            const next = { ...prev };
            delete next[url];
            return next;
          });
          break;
        }
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[url];
          return next;
        });
        done += 1;
        capturePostHogEvent('surah_download_completed', {
          reciter_id: reciter.id,
          moshaf_id: moshaf.id,
          surah_id: surah.id,
        });
        setBatchDownload({
          done,
          total: pending.length,
          fileProgress: 0,
          currentSurahName: surah.name,
          active: true,
          reciterName: reciter.name,
          startedAt,
        });
        await refreshCacheInfo();
      } catch (e) {
        const aborted =
          batchAbortRef.current ||
          controller.signal.aborted ||
          (e instanceof DOMException && e.name === 'AbortError');
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[url];
          return next;
        });
        if (aborted) {
          cancelled = true;
          break;
        }
        console.error('Failed to download surah in batch', surah.id, e);
        setBatchDownload({
          done,
          total: pending.length,
          fileProgress: 0,
          currentSurahName: surah.name,
          active: true,
          reciterName: reciter.name,
          startedAt,
        });
      }
    }

    batchAbortControllerRef.current = null;
    setDownloadProgress({});
    setBatchDownload({
      done,
      total: pending.length,
      fileProgress: cancelled ? 0 : 100,
      currentSurahName: undefined,
      active: false,
      reciterName: reciter.name,
      startedAt,
    });
    window.setTimeout(() => setBatchDownload(null), cancelled ? 1600 : 3200);
  }, [batchDownload?.active, refreshCacheInfo]);

  const downloadSurah = useCallback(async (reciter: Reciter, moshaf: Moshaf, surah: Surah) => {
    await downloadSurahs(reciter, moshaf, [surah]);
  }, [downloadSurahs]);

  const cancelBatchDownload = useCallback(() => {
    batchAbortRef.current = true;
    batchAbortControllerRef.current?.abort();
    setDownloadProgress({});
    setBatchDownload((prev) =>
      prev?.active
        ? {
            ...prev,
            active: false,
            fileProgress: 0,
            currentSurahName: undefined,
          }
        : prev
    );
  }, []);

  const downloadAllSurahs = useCallback(async (reciter: Reciter, moshaf: Moshaf) => {
    if (batchDownload?.active) return;

    const availableIds = moshaf.surah_list
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    const surahs = SURAHS.filter((surah) => availableIds.includes(surah.id));
    if (surahs.length === 0) return;

    await downloadSurahs(reciter, moshaf, surahs);
  }, [batchDownload?.active, downloadSurahs]);

  const deleteAllSurahs = useCallback(async (_reciter: Reciter, moshaf: Moshaf) => {
    if (batchDownload?.active) return;

    const availableIds = moshaf.surah_list
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    const surahs = SURAHS.filter((surah) => availableIds.includes(surah.id));

    for (const surah of surahs) {
      const url = getAudioUrl(moshaf, surah);
      if (await isUrlCached(url)) {
        try {
          await deleteCachedUrl(url);
        } catch (e) {
          console.error('Failed to delete surah in batch', surah.id, e);
        }
      }
    }
    await refreshCacheInfo();
  }, [batchDownload?.active, refreshCacheInfo]);

  const deleteSurah = useCallback(async (_reciter: Reciter, moshaf: Moshaf, surah: Surah) => {
    const url = getAudioUrl(moshaf, surah);
    try {
      await deleteCachedUrl(url);
      await refreshCacheInfo();
    } catch (e) {
      console.error('Failed to delete cached surah', e);
    }
  }, [refreshCacheInfo]);

  const clearCache = useCallback(async () => {
    try {
      await clearAudioCache();
      await refreshCacheInfo();
    } catch (e) {
      console.error('Failed to clear cache', e);
    }
  }, [refreshCacheInfo]);

  // 1. Fetch Reciters on Startup
  useEffect(() => {
    const controller = new AbortController();
    let isCurrentRequest = true;

    const fetchReciters = async () => {
      try {
        setIsLoadingReciters(true);
        const response = await fetch(API_RECITERS_URL, { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Failed to fetch reciters from the Quran API.');
        }
        const data = await response.json();
        if (!isCurrentRequest) return;

        if (data && data.reciters) {
          const stabilized = stabilizeFirstScreenReciters(data.reciters);
          setReciters(stabilized);
          writeStorage(RECITERS_CACHE_KEY, JSON.stringify(stabilized));
          // Always restore from corrected names so the player matches the list
          const restored = restoreFromLocalStorage(stabilized);
          if (restored && getAppOptions().autoResumeOnLaunch) {
            autoResumeRef.current = restored;
          }
        } else {
          throw new Error('Unexpected API response structure.');
        }
      } catch (err: unknown) {
        if (!isCurrentRequest || (err instanceof DOMException && err.name === 'AbortError')) return;

        console.error(err);
        const cached = readStorage(RECITERS_CACHE_KEY);
        if (cached) {
          try {
            const cachedReciters = JSON.parse(cached) as Reciter[];
            const stabilized = stabilizeFirstScreenReciters(cachedReciters);
            setReciters(stabilized);
            const restored = restoreFromLocalStorage(stabilized);
            if (restored && getAppOptions().autoResumeOnLaunch) {
              autoResumeRef.current = restored;
            }
            setError('Connexion instable : affichage des récitants sauvegardés localement.');
          } catch {
            setError('Impossible de charger les récitants. Vérifiez votre connexion puis réessayez.');
          }
        } else {
          setError('Impossible de charger les récitants. Vérifiez votre connexion puis réessayez.');
        }
      } finally {
        if (isCurrentRequest) {
          setIsLoadingReciters(false);
        }
      }
    };

    fetchReciters();

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, []);

  // Initialize Audio Object on Client Side (ONCE on mount)
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    // Enables Web Audio processing on CDN streams (Access-Control-Allow-Origin: *)
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;
    
    // Set restored volume
    const parsedVol = parseSavedNumber(`${LOCAL_STORAGE_PREFIX}volume`, 0.8, 0, 1);
    audio.volume = parsedVol;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVolumeState(parsedVol);

    // Set restored playback speed
    const parsedSpeed = parseSavedNumber(`${LOCAL_STORAGE_PREFIX}speed`, 1, 0.5, 2);
    audio.defaultPlaybackRate = parsedSpeed;
    audio.playbackRate = parsedSpeed;
    setPlaybackSpeedState(parsedSpeed);

    return () => {
      audio.pause();
      effectsEngineRef.current?.dispose();
      effectsEngineRef.current = null;
      audioRef.current = null;
    };
  }, []);

  // Manage Audio Event Listeners to synchronize with state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Listeners for audio state sync
    const onPlay = () => setPlaybackStatus('playing');
    const onPause = () => setPlaybackStatus('paused');
    const onWaiting = () => setPlaybackStatus('buffering');
    const onPlaying = () => setPlaybackStatus('playing');
    const onLoadStart = () => setPlaybackStatus('buffering');
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Persist timestamp occasionally
      writeStorage(`${LOCAL_STORAGE_PREFIX}timestamp`, String(audio.currentTime));
    };
    const onEnded = () => {
      if (repeatModeRef.current === 'one' && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => console.error(err));
        setPlaybackStatus('playing');
      } else {
        setPlaybackStatus('paused');
        playNextTrack();
      }
    };
    const onError = (e: Event | string | unknown) => {
      console.error('Audio Playback Error:', e);
      setPlaybackStatus('error');
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reciters, currentTrack]);

  // Synchronize Media Session controls and metadata
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;

    const audio = audioRef.current;

    if ('mediaSession' in navigator) {
      const paddedId = String(currentTrack.surah.id).padStart(3, '0');
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${paddedId}. ${currentTrack.surah.name}`,
        artist: currentTrack.reciter.name,
        album: `Holy Quran (${currentTrack.moshaf.name})`,
        artwork: [
          { src: ARTWORK_URL, sizes: '512x512', type: 'image/jpeg' },
          { src: ARTWORK_URL, sizes: '256x256', type: 'image/jpeg' }
        ]
      });

      // Synchronize action handlers
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          if (!audio.currentSrc) {
            playTrack(currentTrack.reciter, currentTrack.moshaf, currentTrack.surah, currentTime);
            return;
          }
          audio.play().catch(err => console.error(err));
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          audio.pause();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          playPrevTrack();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          playNextTrack();
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) {
            audio.currentTime = details.seekTime;
          }
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          audio.pause();
          audio.currentTime = 0;
          setPlaybackStatus('paused');
        });
      } catch (error) {
        console.warn('W3C Media Session action handlers configuration failed:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  // Update Media Session Position State
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack && audioRef.current && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: playbackSpeed,
          position: currentTime
        });
      } catch {
        // Safe check for range errors
      }
    }
  }, [currentTime, duration, playbackSpeed, currentTrack]);

  // Sync home-screen widget data (Capacitor + web fallback)
  useEffect(() => {
    if (!currentTrack) return;

    const progressPercent = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
    void syncWidgetPlayback({
      reciterName: currentTrack.reciter.name,
      surahName: currentTrack.surah.name,
      surahId: currentTrack.surah.id,
      surahArabic: currentTrack.surah.arabicName,
      isPlaying: playbackStatus === 'playing',
      progressPercent,
      updatedAt: Date.now(),
    });
  }, [currentTrack, playbackStatus, currentTime, duration]);

  // Helper to extract list of available Surahs for a reciter
  const getAvailableSurahs = useCallback((reciter: Reciter | null, moshaf: Moshaf | null): Surah[] => {
    if (!reciter || !moshaf) return [];
    const availableIds = moshaf.surah_list
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));
      
    return SURAHS.filter(surah => availableIds.includes(surah.id));
  }, []);

  // LocalStorage Helpers
  const restoreFromLocalStorage = (loadedReciters: Reciter[]) => {
    try {
      const savedReciterId = readStorage(`${LOCAL_STORAGE_PREFIX}reciter_id`);
      const savedMoshafId = readStorage(`${LOCAL_STORAGE_PREFIX}moshaf_id`);
      const savedSurahId = readStorage(`${LOCAL_STORAGE_PREFIX}surah_id`);

      if (savedReciterId) {
        const reciter = loadedReciters.find(r => r.id === parseInt(savedReciterId, 10));
        if (reciter) {
          setActiveReciterState(reciter);
          
          const moshaf = reciter.moshaf.find(m => m.id === parseInt(savedMoshafId || '', 10)) || reciter.moshaf[0];
          setActiveMoshafState(moshaf);
          
          if (savedSurahId) {
            const surah = SURAHS.find(s => s.id === parseInt(savedSurahId, 10));
            if (surah) {
              setActiveSurahState(surah);
              
              // Restore player metadata only. The audio source is loaded on user play.
              const restoredTrack: AudioTrack = { reciter, moshaf, surah };
              setCurrentTrack(restoredTrack);
              
              let parsedTime = 0;
              const savedTime = readStorage(`${LOCAL_STORAGE_PREFIX}timestamp`);
              if (savedTime) {
                const t = Number.parseFloat(savedTime);
                if (Number.isFinite(t) && t >= 0) {
                  parsedTime = t;
                  setCurrentTime(t);
                }
              }

              return { reciter, moshaf, surah, time: parsedTime };
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to restore playback state from LocalStorage', e);
    }
    return null;
  };

  const persistSelection = (reciter: Reciter | null, moshaf: Moshaf | null, surah: Surah | null) => {
    if (reciter) writeStorage(`${LOCAL_STORAGE_PREFIX}reciter_id`, String(reciter.id));
    if (moshaf) writeStorage(`${LOCAL_STORAGE_PREFIX}moshaf_id`, String(moshaf.id));
    if (surah) writeStorage(`${LOCAL_STORAGE_PREFIX}surah_id`, String(surah.id));
  };

  const hydratePlaybackState = useCallback((payload: {
    reciterId: number;
    moshafId: number;
    surahId: number;
    positionSeconds: number;
  }) => {
    const reciter = reciters.find((r) => r.id === payload.reciterId);
    if (!reciter) return false;
    const moshaf =
      reciter.moshaf.find((m) => m.id === payload.moshafId) || reciter.moshaf[0];
    if (!moshaf) return false;
    const surah = SURAHS.find((s) => s.id === payload.surahId);
    if (!surah) return false;

    setActiveReciterState(reciter);
    setActiveMoshafState(moshaf);
    setActiveSurahState(surah);
    setCurrentTrack({ reciter, moshaf, surah });
    const safeTime = Number.isFinite(payload.positionSeconds)
      ? Math.max(0, payload.positionSeconds)
      : 0;
    setCurrentTime(safeTime);
    persistSelection(reciter, moshaf, surah);
    writeStorage(`${LOCAL_STORAGE_PREFIX}timestamp`, String(safeTime));
    return true;
  }, [reciters]);

  // State mutators with automatic persistence
  const setActiveReciter = (reciter: Reciter | null) => {
    setActiveReciterState(reciter);
    if (reciter) {
      const defaultMoshaf = reciter.moshaf[0] || null;
      setActiveMoshafState(defaultMoshaf);
      
      const available = getAvailableSurahs(reciter, defaultMoshaf);
      const defaultSurah = available.length > 0 ? available[0] : null;
      setActiveSurahState(defaultSurah);
      
      persistSelection(reciter, defaultMoshaf, defaultSurah);
    }
  };

  const setActiveMoshaf = (moshaf: Moshaf | null) => {
    setActiveMoshafState(moshaf);
    if (activeReciter && moshaf) {
      const available = getAvailableSurahs(activeReciter, moshaf);
      const defaultSurah = available.length > 0 ? available[0] : null;
      setActiveSurahState(defaultSurah);
      persistSelection(activeReciter, moshaf, defaultSurah);
    }
  };

  const setActiveSurah = (surah: Surah | null) => {
    setActiveSurahState(surah);
    persistSelection(activeReciter, activeMoshaf, surah);
  };
  // Play Actions
  async function playTrack(reciter: Reciter, moshaf: Moshaf, surah: Surah, startAt = 0) {
    const audio = audioRef.current;
    if (!audio) return;
    if (!moshaf.server) {
      setPlaybackStatus('error');
      return;
    }

    // Prefer the corrected catalog entry so the player name matches the list
    const catalogReciter = reciters.find((r) => r.id === reciter.id) ?? reciter;
    const displayReciter = RECITER_NAME_CORRECTIONS[catalogReciter.id]
      ? { ...catalogReciter, name: RECITER_NAME_CORRECTIONS[catalogReciter.id] }
      : catalogReciter;

    const safeStartAt = Number.isFinite(startAt) ? Math.max(0, startAt) : 0;

    // 1. Update State synchronously
    const newTrack: AudioTrack = { reciter: displayReciter, moshaf, surah };
    setCurrentTrack(newTrack);
    setActiveReciterState(displayReciter);
    setActiveMoshafState(moshaf);
    setActiveSurahState(surah);
    persistSelection(displayReciter, moshaf, surah);

    // 2. Play Audio File
    const audioUrl = getAudioUrl(moshaf, surah);

    audio.pause();
    
    // Clean up previous blob URL if any
    if (audio.src && audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(audio.src);
    }

    setPlaybackStatus('buffering');
    setCurrentTime(safeStartAt);
    setDuration(0);

    let sourceToPlay = audioUrl;
    try {
      const cachedBlobUrl = await getCachedBlobUrl(audioUrl);
      if (cachedBlobUrl) {
        sourceToPlay = cachedBlobUrl;
      }
    } catch (e) {
      console.warn('Failed to retrieve cached blob URL, playing online version', e);
    }

    // crossOrigin is required for MediaElementSource on remote CDN streams
    audio.crossOrigin = 'anonymous';

    audio.src = sourceToPlay;
    audio.playbackRate = playbackSpeed;
    audio.load();

    if (effectsNeedProcessing(audioEffectsRef.current)) {
      try {
        await ensureEffectsEngine();
      } catch (e) {
        console.warn('Audio effects engine failed to start', e);
      }
    }

    const applyStartTime = () => {
      try {
        if (safeStartAt > 0) {
          markSeeking();
          audio.currentTime = safeStartAt;
        }
        setCurrentTime(safeStartAt);
      } catch {
        // Some streams reject seeking before enough metadata is available.
      }
    };

    // Seek before play so takeover doesn't resume at 0
    if (safeStartAt > 0) {
      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          applyStartTime();
          resolve();
        };
        if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
          finish();
          return;
        }
        audio.addEventListener('loadedmetadata', finish, { once: true });
        window.setTimeout(finish, 2500);
      });
    }
    
    try {
      await audio.play();
      capturePostHogEvent('surah_playback_started', {
        reciter_id: displayReciter.id,
        moshaf_id: moshaf.id,
        surah_id: surah.id,
        resumed: safeStartAt > 0,
      });
      setPlaybackStatus('playing');
    } catch (err) {
      console.error('Audio reproduction rejected:', err);
      setPlaybackStatus('error');
    }
  }

  // Auto-resume last track when enabled in Options (best-effort; browsers may block).
  useEffect(() => {
    if (isLoadingReciters || autoResumeAttemptedRef.current) return;
    const pending = autoResumeRef.current;
    if (!pending || !audioRef.current) return;
    if (!getAppOptions().autoResumeOnLaunch) {
      autoResumeRef.current = null;
      return;
    }
    autoResumeAttemptedRef.current = true;
    autoResumeRef.current = null;
    void playTrack(pending.reciter, pending.moshaf, pending.surah, pending.time).catch(() => undefined);
  }, [isLoadingReciters]);

  const getAccurateCurrentTime = () => {
    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.currentTime) && audio.currentTime > 0) {
      return audio.currentTime;
    }
    return currentTime;
  };

  const registerTakeOverHandler = (handler: (() => Promise<boolean>) | null) => {
    takeOverHandlerRef.current = handler;
  };

  const takeOverRemoteSession = async () => {
    if (takeOverHandlerRef.current) {
      return takeOverHandlerRef.current();
    }
    return false;
  };

  const setSuppressRemoteUntilSafe = (ts: number) => {
    suppressRemoteUntilRef.current = ts;
    setSuppressRemoteUntil(ts);
  };
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack || playbackStatus === 'buffering') return;
    
    if (playbackStatus === 'playing') {
      audio.pause();
    } else if (!audio.currentSrc) {
      playTrack(currentTrack.reciter, currentTrack.moshaf, currentTrack.surah, currentTime);
    } else {
      if (effectsNeedProcessing(audioEffectsRef.current)) {
        void ensureEffectsEngine();
      }
      audio.play().catch(err => {
        console.error(err);
        setPlaybackStatus('error');
      });
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const dismissTrack = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      try {
        audio.removeAttribute('src');
        audio.load();
      } catch {
        // ignore
      }
    }
    setPlaybackStatus('idle');
    setCurrentTime(0);
    setDuration(0);
    setCurrentTrack(null);
    try {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      }
    } catch {
      // ignore
    }
  };

  const play = () => {
    const audio = audioRef.current;
    if (audio && currentTrack && playbackStatus !== 'playing') {
      if (!audio.currentSrc) {
        playTrack(currentTrack.reciter, currentTrack.moshaf, currentTrack.surah, currentTime);
        return;
      }
      if (effectsNeedProcessing(audioEffectsRef.current)) {
        void ensureEffectsEngine();
      }
      audio.play().catch(err => console.error(err));
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current && Number.isFinite(time)) {
      const upperBound = Number.isFinite(duration) && duration > 0 ? duration : Number.POSITIVE_INFINITY;
      const safeTime = Math.min(upperBound, Math.max(0, time));
      markSeeking();
      audioRef.current.currentTime = safeTime;
      setCurrentTime(safeTime);
      writeStorage(`${LOCAL_STORAGE_PREFIX}timestamp`, String(safeTime));
    }
  };

  const resolveAyahStartSec = async (
    moshaf: Moshaf,
    surah: Surah,
    ayah: number,
  ): Promise<number | null> => {
    const readId = await resolveTimingReadId(moshaf);
    if (readId == null) return null;
    const timings = await fetchAyahTimings(readId, surah.id);
    const timing = getTimingForAyah(timings, ayah);
    if (!timing) return null;
    return timing.startMs / 1000;
  };

  const playFromAyah = async (
    reciter: Reciter,
    moshaf: Moshaf,
    surah: Surah,
    ayah: number,
  ) => {
    const startSec = await resolveAyahStartSec(moshaf, surah, ayah);
    if (startSec == null) return;
    await playTrack(reciter, moshaf, surah, startSec);
  };

  const seekToAyah = async (ayah: number) => {
    const track = currentTrack;
    if (!track) return;
    const startSec = await resolveAyahStartSec(track.moshaf, track.surah, ayah);
    if (startSec == null) return;
    seekTo(startSec);
  };

  const setVolume = (vol: number) => {
    const safeVol = Math.max(0, Math.min(1, vol));
    setVolumeState(safeVol);
    writeStorage(`${LOCAL_STORAGE_PREFIX}volume`, String(safeVol));
    if (audioRef.current) {
      audioRef.current.volume = safeVol;
    }
  };

  const setPlaybackSpeed = (speed: number) => {
    const safeSpeed = Math.max(0.5, Math.min(2, speed));
    setPlaybackSpeedState(safeSpeed);
    writeStorage(`${LOCAL_STORAGE_PREFIX}speed`, String(safeSpeed));
    if (audioRef.current) {
      audioRef.current.playbackRate = safeSpeed;
    }
  };

  const setRepeatMode = (mode: 'none' | 'one' | 'all') => {
    setRepeatModeState(mode);
    writeStorage(`${LOCAL_STORAGE_PREFIX}repeat_mode`, mode);
  };

  const setPlayerTheme = (theme: string) => {
    setPlayerThemeState(theme);
    writeStorage(`${LOCAL_STORAGE_PREFIX}player_theme`, theme);
  };

  const setSelectedSurahIds = useCallback(
    (ids: Set<number> | ((prev: Set<number>) => Set<number>)) => {
      setSelectedSurahIdsState((prev) => {
        const next = typeof ids === 'function' ? ids(prev) : ids;
        writeStorage(
          `${LOCAL_STORAGE_PREFIX}selected_surah_ids`,
          JSON.stringify([...next].sort((a, b) => a - b))
        );
        return next;
      });
    },
    []
  );

  const setPlayerV2Prefs = useCallback(
    (prefs: PlayerV2Prefs | ((prev: PlayerV2Prefs) => PlayerV2Prefs)) => {
      setPlayerV2PrefsState((prev) => {
        const next = typeof prefs === 'function' ? prefs(prev) : prefs;
        savePlayerV2Prefs(next);
        return next;
      });
    },
    []
  );

  const setAudioEffects = useCallback(
    (effects: AudioEffectsSettings | ((prev: AudioEffectsSettings) => AudioEffectsSettings)) => {
      setAudioEffectsState((prev) => {
        const raw = typeof effects === 'function' ? effects(prev) : effects;
        const next = normalizeAudioEffects(raw);
        saveAudioEffects(next);
        audioEffectsRef.current = next;
        void syncEffectsToEngine(next);
        return next;
      });
    },
    [syncEffectsToEngine]
  );

  const hydrateCloudSettings = useCallback(
    (payload: {
      volume?: number;
      playbackSpeed?: number;
      repeatMode?: 'none' | 'one' | 'all';
      playerTheme?: string;
      playerV2Prefs?: Partial<PlayerV2Prefs>;
      selectedSurahIds?: number[];
    }) => {
      if (typeof payload.volume === 'number' && Number.isFinite(payload.volume)) {
        const safeVol = Math.max(0, Math.min(1, payload.volume));
        setVolumeState(safeVol);
        writeStorage(`${LOCAL_STORAGE_PREFIX}volume`, String(safeVol));
        if (audioRef.current) audioRef.current.volume = safeVol;
      }
      if (typeof payload.playbackSpeed === 'number' && Number.isFinite(payload.playbackSpeed)) {
        const safeSpeed = Math.max(0.5, Math.min(2, payload.playbackSpeed));
        setPlaybackSpeedState(safeSpeed);
        writeStorage(`${LOCAL_STORAGE_PREFIX}speed`, String(safeSpeed));
        if (audioRef.current) {
          audioRef.current.defaultPlaybackRate = safeSpeed;
          audioRef.current.playbackRate = safeSpeed;
        }
      }
      if (
        payload.repeatMode === 'none' ||
        payload.repeatMode === 'one' ||
        payload.repeatMode === 'all'
      ) {
        setRepeatModeState(payload.repeatMode);
        writeStorage(`${LOCAL_STORAGE_PREFIX}repeat_mode`, payload.repeatMode);
      }
      if (typeof payload.playerTheme === 'string' && payload.playerTheme.trim()) {
        setPlayerThemeState(payload.playerTheme);
        writeStorage(`${LOCAL_STORAGE_PREFIX}player_theme`, payload.playerTheme);
      }
      if (payload.playerV2Prefs && typeof payload.playerV2Prefs === 'object') {
        const next = { ...DEFAULT_PLAYER_V2_PREFS, ...payload.playerV2Prefs };
        setPlayerV2PrefsState(next);
        savePlayerV2Prefs(next);
      }
      if (Array.isArray(payload.selectedSurahIds)) {
        const next = new Set(
          payload.selectedSurahIds
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id >= 1 && id <= 114)
        );
        setSelectedSurahIdsState(next);
        writeStorage(
          `${LOCAL_STORAGE_PREFIX}selected_surah_ids`,
          JSON.stringify([...next].sort((a, b) => a - b))
        );
      }
    },
    []
  );

  // Sleep Timer Countdown Effect
  useEffect(() => {
    if (sleepTimer === null) return;
    if (sleepTimer <= 0) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlaybackStatus('paused');
      setSleepTimer(null);
      return;
    }

    const interval = setInterval(() => {
      setSleepTimer((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          setPlaybackStatus('paused');
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimer]);

  // Next and Previous tracks playlist manager
  function playNextTrack() {
    if (!currentTrack) return;

    const slots = radioSlotQueueRef.current;
    if (slots?.length) {
      // Resync cursor with the track actually playing (surah + voice).
      const at = radioSlotIndexRef.current;
      const atSlot = slots[at];
      if (
        !atSlot ||
        atSlot.surahId !== currentTrack.surah.id ||
        atSlot.reciterId !== currentTrack.reciter.id
      ) {
        const found = slots.findIndex(
          (s) => s.surahId === currentTrack.surah.id && s.reciterId === currentTrack.reciter.id,
        );
        if (found >= 0) radioSlotIndexRef.current = found;
      }

      const list = recitersRef.current;
      for (let step = 1; step <= slots.length; step++) {
        let nextIndex = radioSlotIndexRef.current + step;
        if (nextIndex >= slots.length) {
          if (repeatModeRef.current === 'none') {
            setPlaybackStatus('paused');
            if (audioRef.current) audioRef.current.pause();
            return;
          }
          nextIndex = nextIndex % slots.length;
        }
        const slot = slots[nextIndex];
        const reciter = list.find((r) => r.id === slot.reciterId);
        if (!reciter) continue;
        const moshaf =
          reciter.moshaf.find((m) => /hafs/i.test(m.name)) ?? reciter.moshaf[0] ?? null;
        const surah = SURAHS.find((s) => s.id === slot.surahId);
        if (!moshaf || !surah) continue;
        radioSlotIndexRef.current = nextIndex;
        void playTrack(reciter, moshaf, surah);
        return;
      }
      return;
    }

    const allAvailable = getAvailableSurahs(currentTrack.reciter, currentTrack.moshaf);
    if (allAvailable.length === 0) return;

    // Use the checked selection when non-empty, otherwise fall back to all
    const selectedIds = selectedSurahIdsRef.current;
    let playlist = selectedIds.size > 0
      ? allAvailable.filter(s => selectedIds.has(s.id))
      : allAvailable;

    playlist = sortPlaylistByCustomOrder(playlist);

    if (playlist.length === 0) return;

    const currentIndex = playlist.findIndex(s => s.id === currentTrack.surah.id);
    let nextIndex = currentIndex + 1;
    
    if (nextIndex >= playlist.length) {
      if (repeatModeRef.current === 'none') {
        setPlaybackStatus('paused');
        if (audioRef.current) {
          audioRef.current.pause();
        }
        return;
      }
      nextIndex = 0; // Wrap around to the first Surah in the playlist
    }

    const nextSurah = playlist[nextIndex];
    playTrack(currentTrack.reciter, currentTrack.moshaf, nextSurah);
  };

  function playPrevTrack() {
    if (!currentTrack) return;

    const slots = radioSlotQueueRef.current;
    if (slots?.length) {
      const at = radioSlotIndexRef.current;
      const atSlot = slots[at];
      if (
        !atSlot ||
        atSlot.surahId !== currentTrack.surah.id ||
        atSlot.reciterId !== currentTrack.reciter.id
      ) {
        const found = slots.findIndex(
          (s) => s.surahId === currentTrack.surah.id && s.reciterId === currentTrack.reciter.id,
        );
        if (found >= 0) radioSlotIndexRef.current = found;
      }

      const list = recitersRef.current;
      for (let step = 1; step <= slots.length; step++) {
        let prevIndex = radioSlotIndexRef.current - step;
        while (prevIndex < 0) prevIndex += slots.length;
        const slot = slots[prevIndex];
        const reciter = list.find((r) => r.id === slot.reciterId);
        if (!reciter) continue;
        const moshaf =
          reciter.moshaf.find((m) => /hafs/i.test(m.name)) ?? reciter.moshaf[0] ?? null;
        const surah = SURAHS.find((s) => s.id === slot.surahId);
        if (!moshaf || !surah) continue;
        radioSlotIndexRef.current = prevIndex;
        void playTrack(reciter, moshaf, surah);
        return;
      }
      return;
    }

    const allAvailable = getAvailableSurahs(currentTrack.reciter, currentTrack.moshaf);
    if (allAvailable.length === 0) return;

    const selectedIds = selectedSurahIdsRef.current;
    let playlist = selectedIds.size > 0
      ? allAvailable.filter(s => selectedIds.has(s.id))
      : allAvailable;

    playlist = sortPlaylistByCustomOrder(playlist);

    if (playlist.length === 0) return;

    const currentIndex = playlist.findIndex(s => s.id === currentTrack.surah.id);
    let prevIndex = currentIndex - 1;
    
    if (prevIndex < 0) {
      prevIndex = playlist.length - 1; // Wrap around to the last Surah in the playlist
    }

    const prevSurah = playlist[prevIndex];
    playTrack(currentTrack.reciter, currentTrack.moshaf, prevSurah);
  };

  return (
    <AudioContext.Provider value={{
      currentTrack,
      playbackStatus,
      currentTime,
      duration,
      volume,
      playbackSpeed,
      repeatMode,
      sleepTimer,
      playerTheme,
      audioEffects,
      setAudioEffects,
      effectsSupported,
      remoteSession,
      setRemoteSession,
      takeOverRemoteSession,
      registerTakeOverHandler,
      suppressRemoteUntil,
      setSuppressRemoteUntil: setSuppressRemoteUntilSafe,
      getAccurateCurrentTime,
      isSeekingNow,
      
      reciters,
      isLoadingReciters,
      error,
      
      activeReciter,
      activeMoshaf,
      activeSurah,

      selectedSurahIds,
      setSelectedSurahIds,
      playerV2Prefs,
      setPlayerV2Prefs,
      hydrateCloudSettings,
      
      setActiveReciter,
      setActiveMoshaf,
      setActiveSurah,
      playTrack,
      playFromAyah,
      seekToAyah,
      hydratePlaybackState,
      togglePlay,
      pause,
      play,
      dismissTrack,
      seekTo,
      setVolume,
      setPlaybackSpeed,
      setRepeatMode,
      setCustomPlaylistOrder,
      setRadioSlotQueue,
      setSleepTimer,
      setPlayerTheme,
      playNextTrack,
      playPrevTrack,
      getAvailableSurahs,

      cachedUrls,
      downloadProgress,
      cacheInfo,
      batchDownload,
      downloadSurah,
      downloadSurahs,
      downloadAllSurahs,
      deleteAllSurahs,
      cancelBatchDownload,
      deleteSurah,
      clearCache
    }}>
      {children}
    </AudioContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
