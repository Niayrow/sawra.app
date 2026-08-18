import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { useAudio } from './AudioContext';
import { useActiveAyah } from '../hooks/useActiveAyah';
import { usePageHidden } from '../hooks/usePageHidden';
import { requestAuthPrompt } from '../utils/appEvents';
import { capturePostHogEvent } from '../utils/posthog';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  BOOKMARK_PAGE_SIZE,
  NOTE_MAX_LENGTH,
  bookmarkKey,
  clipSnippet,
  progressKey,
  type AyahBookmark,
  type ListenDay,
  type SurahProgress,
} from '../utils/libraryTypes';
import {
  loadLocalBookmarks,
  loadLocalListenDays,
  loadLocalProgress,
  loadPushedListenDays,
  saveLocalBookmarks,
  saveLocalListenDays,
  saveLocalProgress,
  savePushedListenDays,
} from '../utils/libraryStorage';
import {
  applyListenDeltasToRemote,
  listenDayDeltas,
  mergeBookmarks,
  mergeProgress,
} from '../utils/mergeGuestLibrary';
import { localDayKey, tzOffsetMinutes } from '../utils/localDay';
import { resolveStableAyah } from '../utils/stableAyah';
import {
  computeStreak,
  lastSevenDays,
  secondsThisWeek,
  secondsToday,
  sumListenSeconds,
} from '../utils/listenStats';
import type { QuranAyah } from '../types';

const PROGRESS_FLUSH_MS = 6500;
const PROGRESS_FLUSH_HIDDEN_MS = 20_000;
const LISTEN_FLUSH_MS = 3000;
const LISTEN_FLUSH_HIDDEN_MS = 15_000;
const LISTEN_TICK_MS = 1000;
const LISTEN_TICK_HIDDEN_MS = 5000;
const MAX_TICK_DELTA_S = 5;

type PendingListen = {
  day: string;
  addSeconds: number;
  addSessions: number;
  tzOffsetMinutes: number | null;
};

const emptyPending = (): PendingListen => ({
  day: localDayKey(),
  addSeconds: 0,
  addSessions: 0,
  tzOffsetMinutes: tzOffsetMinutes(),
});

type LibraryContextValue = {
  bookmarks: AyahBookmark[];
  bookmarkMap: Map<string, AyahBookmark>;
  progress: SurahProgress[];
  listenDays: ListenDay[];
  streak: number;
  secondsToday: number;
  secondsWeek: number;
  secondsTotal: number;
  weekDays: ReturnType<typeof lastSevenDays>;
  libraryReady: boolean;
  bookmarkTotal: number;
  getBookmark: (surahId: number, ayah: number) => AyahBookmark | undefined;
  getProgress: (reciterId: number, moshafId: number, surahId: number) => SurahProgress | undefined;
  toggleBookmark: (payload: {
    surahId: number;
    ayah: number;
    reciterId?: number | null;
    moshafId?: number | null;
    snippetAr?: string;
    snippetFr?: string;
  }) => AyahBookmark | null;
  saveBookmarkNote: (surahId: number, ayah: number, note: string) => void;
  removeBookmark: (surahId: number, ayah: number) => void;
  visibleBookmarkCount: number;
  showMoreBookmarks: () => void;
  resetBookmarkPage: () => void;
};

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

const newId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    fetchAyahBookmarks,
    upsertAyahBookmark,
    deleteAyahBookmark,
    fetchSurahProgress,
    upsertSurahProgress,
    fetchListenDays,
    applyListenDayDelta,
    sessionReady,
  } = useAuth();
  const {
    currentTrack,
    playbackStatus,
    getAccurateCurrentTime,
    isSeekingNow,
  } = useAudio();
  const ayahSync = useActiveAyah({ enabled: Boolean(currentTrack) });
  const pageHidden = usePageHidden();

  const [bookmarks, setBookmarks] = useState<AyahBookmark[]>(() => loadLocalBookmarks());
  const [progress, setProgress] = useState<SurahProgress[]>(() => loadLocalProgress());
  const [listenDays, setListenDays] = useState<ListenDay[]>([]);
  const [libraryReady, setLibraryReady] = useState(!isSupabaseConfigured);
  const [bookmarkPage, setBookmarkPage] = useState(BOOKMARK_PAGE_SIZE);
  const mergeLockRef = useRef(false);
  const cloudDaysRef = useRef<ListenDay[]>([]);
  const pendingListenRef = useRef<PendingListen>(emptyPending());
  const flushInFlightRef = useRef(false);

  const bookmarksRef = useRef(bookmarks);
  bookmarksRef.current = bookmarks;
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const listenDaysRef = useRef(listenDays);
  listenDaysRef.current = listenDays;
  const lastStableAyahRef = useRef<number | null>(null);
  const lastProgressFlushRef = useRef(0);
  const lastListenFlushRef = useRef(0);
  const listenAccRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const sessionCountedDayRef = useRef<string | null>(null);
  const pendingSessionRef = useRef(false);

  useEffect(() => {
    lastStableAyahRef.current = null;
  }, [currentTrack?.reciter.id, currentTrack?.surah.id, currentTrack?.moshaf.id]);

  const persistBookmarks = (rows: AyahBookmark[]) => {
    bookmarksRef.current = rows;
    setBookmarks(rows);
    saveLocalBookmarks(rows);
  };
  const persistProgress = (rows: SurahProgress[]) => {
    progressRef.current = rows;
    setProgress(rows);
    saveLocalProgress(rows);
  };
  const lastDaysUiFlushRef = useRef(0);

  const paintListenDays = (immediateUi = true) => {
    const pending = pendingListenRef.current;
    const deltas =
      pending.addSeconds > 0 || pending.addSessions > 0
        ? [{
            day: pending.day,
            addSeconds: pending.addSeconds,
            addSessions: pending.addSessions,
            tzOffsetMinutes: pending.tzOffsetMinutes,
          }]
        : [];
    const rows = applyListenDeltasToRemote(
      cloudDaysRef.current,
      deltas,
      new Date().toISOString(),
    );
    listenDaysRef.current = rows;
    if (immediateUi) {
      setListenDays(rows);
      lastDaysUiFlushRef.current = Date.now();
    }
  };

  const bookmarkMap = useMemo(() => {
    const map = new Map<string, AyahBookmark>();
    for (const row of bookmarks) map.set(bookmarkKey(row.surahId, row.ayah), row);
    return map;
  }, [bookmarks]);

  const getBookmark = useCallback(
    (surahId: number, ayah: number) => bookmarkMap.get(bookmarkKey(surahId, ayah)),
    [bookmarkMap],
  );

  const getProgress = useCallback(
    (reciterId: number, moshafId: number, surahId: number) =>
      progress.find((row) => row.reciterId === reciterId && row.moshafId === moshafId && row.surahId === surahId),
    [progress],
  );

  const toggleBookmark = useCallback((payload: {
    surahId: number;
    ayah: number;
    reciterId?: number | null;
    moshafId?: number | null;
    snippetAr?: string;
    snippetFr?: string;
  }): AyahBookmark | null => {
    const existing = bookmarksRef.current.find(
      (row) => row.surahId === payload.surahId && row.ayah === payload.ayah,
    );
    if (existing) return existing;

    if (!user) requestAuthPrompt();

    const now = new Date().toISOString();
    const created: AyahBookmark = {
      id: newId(),
      surahId: payload.surahId,
      ayah: payload.ayah,
      reciterId: payload.reciterId ?? null,
      moshafId: payload.moshafId ?? null,
      note: '',
      snippetAr: clipSnippet(payload.snippetAr ?? ''),
      snippetFr: clipSnippet(payload.snippetFr ?? ''),
      createdAt: now,
      updatedAt: now,
    };
    capturePostHogEvent('ayah_bookmark_added', {
      surah_id: payload.surahId,
      ayah_number: payload.ayah,
      reciter_id: payload.reciterId ?? null,
      moshaf_id: payload.moshafId ?? null,
    });
    persistBookmarks([created, ...bookmarksRef.current]);
    if (user) {
      void upsertAyahBookmark(created).then((saved) => {
        if (!saved) return;
        persistBookmarks(
          bookmarksRef.current.map((row) =>
            row.surahId === saved.surahId && row.ayah === saved.ayah ? saved : row,
          ),
        );
      });
    }
    return created;
  }, [upsertAyahBookmark, user]);

  const saveBookmarkNote = useCallback((surahId: number, ayah: number, note: string) => {
    const trimmed = note.slice(0, NOTE_MAX_LENGTH);
    const now = new Date().toISOString();
    const next = bookmarksRef.current.map((row) =>
      row.surahId === surahId && row.ayah === ayah
        ? { ...row, note: trimmed, updatedAt: now }
        : row,
    );
    persistBookmarks(next);
    const saved = next.find((row) => row.surahId === surahId && row.ayah === ayah);
    if (user && saved) void upsertAyahBookmark(saved);
  }, [upsertAyahBookmark, user]);

  const removeBookmark = useCallback((surahId: number, ayah: number) => {
    capturePostHogEvent('ayah_bookmark_removed', {
      surah_id: surahId,
      ayah_number: ayah,
    });
    persistBookmarks(
      bookmarksRef.current.filter((row) => !(row.surahId === surahId && row.ayah === ayah)),
    );
    if (user) void deleteAyahBookmark(surahId, ayah);
  }, [deleteAyahBookmark, user]);

  const writeProgress = useCallback((row: SurahProgress, toCloud: boolean) => {
    const key = progressKey(row.reciterId, row.moshafId, row.surahId);
    const next = [
      row,
      ...progressRef.current.filter(
        (item) => progressKey(item.reciterId, item.moshafId, item.surahId) !== key,
      ),
    ];
    persistProgress(next);
    if (toCloud && user) void upsertSurahProgress(row);
  }, [upsertSurahProgress, user]);

  const flushListenToCloud = useCallback(async () => {
    if (!user || mergeLockRef.current || flushInFlightRef.current) return;
    const pending = pendingListenRef.current;
    if (pending.addSeconds <= 0 && pending.addSessions <= 0) return;

    flushInFlightRef.current = true;
    const sentSeconds = Math.floor(pending.addSeconds);
    const sentSessions = pending.addSessions;
    if (sentSeconds <= 0 && sentSessions <= 0) {
      flushInFlightRef.current = false;
      return;
    }
    const sent: PendingListen = {
      day: pending.day,
      addSeconds: sentSeconds,
      addSessions: sentSessions,
      tzOffsetMinutes: pending.tzOffsetMinutes,
    };
    pendingListenRef.current = {
      day: sent.day,
      addSeconds: pending.addSeconds - sentSeconds,
      addSessions: 0,
      tzOffsetMinutes: sent.tzOffsetMinutes,
    };

    const saved = await applyListenDayDelta({
      day: sent.day,
      addSeconds: sent.addSeconds,
      addSessions: sent.addSessions,
      tzOffsetMinutes: sent.tzOffsetMinutes,
    });

    if (!saved) {
      const current = pendingListenRef.current;
      pendingListenRef.current = {
        day: current.day === sent.day ? current.day : sent.day,
        addSeconds: (current.day === sent.day ? current.addSeconds : 0) + sent.addSeconds,
        addSessions: (current.day === sent.day ? current.addSessions : 0) + sent.addSessions,
        tzOffsetMinutes: current.tzOffsetMinutes ?? sent.tzOffsetMinutes,
      };
      flushInFlightRef.current = false;
      paintListenDays(true);
      return;
    }

    cloudDaysRef.current = [
      saved,
      ...cloudDaysRef.current.filter((row) => row.day !== saved.day),
    ];
    flushInFlightRef.current = false;
    lastListenFlushRef.current = Date.now();
    paintListenDays(true);
  }, [applyListenDayDelta, user]);

  const creditListenSeconds = useCallback((addSeconds: number, addSession: boolean) => {
    if (!user) return;
    if (addSeconds <= 0 && !addSession) return;
    const day = localDayKey();
    const pending = pendingListenRef.current;
    if (pending.day !== day && (pending.addSeconds > 0 || pending.addSessions > 0)) {
      void flushListenToCloud();
    }
    const latest = pendingListenRef.current;
    if (latest.day !== day) {
      pendingListenRef.current = {
        day,
        addSeconds: Math.max(0, addSeconds),
        addSessions: addSession ? 1 : 0,
        tzOffsetMinutes: tzOffsetMinutes(),
      };
    } else {
      pendingListenRef.current = {
        day,
        addSeconds: latest.addSeconds + Math.max(0, addSeconds),
        addSessions: latest.addSessions + (addSession ? 1 : 0),
        tzOffsetMinutes: latest.tzOffsetMinutes ?? tzOffsetMinutes(),
      };
    }
    paintListenDays(!(typeof document !== 'undefined' && document.visibilityState === 'hidden'));
  }, [flushListenToCloud, user]);

  const snapshotProgress = useCallback((force: boolean) => {
    const track = currentTrack;
    if (!track || playbackStatus === 'idle') return;
    const position = getAccurateCurrentTime();
    if (!Number.isFinite(position) || position < 0) return;

    const stable = resolveStableAyah({
      timings: ayahSync.timings,
      available: ayahSync.available,
      currentTime: position,
      playbackStatus,
      isSeeking: isSeekingNow(),
      trackSurahId: track.surah.id,
      timingsSurahId: track.surah.id,
    });
    if (stable != null) lastStableAyahRef.current = stable;
    const ayah = isSeekingNow() || playbackStatus === 'buffering'
      ? lastStableAyahRef.current
      : stable;

    const now = Date.now();
    if (!force && now - lastProgressFlushRef.current < PROGRESS_FLUSH_MS) return;
    lastProgressFlushRef.current = now;

    writeProgress({
      reciterId: track.reciter.id,
      moshafId: track.moshaf.id,
      surahId: track.surah.id,
      positionSeconds: position,
      ayah,
      updatedAt: new Date().toISOString(),
    }, Boolean(user) && !mergeLockRef.current);
  }, [
    ayahSync.available,
    ayahSync.timings,
    currentTrack,
    getAccurateCurrentTime,
    isSeekingNow,
    playbackStatus,
    user,
    writeProgress,
  ]);

  // Guest → account merge (bookmarks / progress) + cloud listen days
  useEffect(() => {
    if (!sessionReady) {
      setLibraryReady(false);
      return;
    }

    if (!user) {
      cloudDaysRef.current = [];
      pendingListenRef.current = emptyPending();
      listenDaysRef.current = [];
      setListenDays([]);
      setLibraryReady(true);
      return;
    }

    let cancelled = false;
    mergeLockRef.current = true;
    setLibraryReady(false);

    const run = async () => {
      const localBookmarks = loadLocalBookmarks();
      const localProgress = loadLocalProgress();
      const localDays = loadLocalListenDays();

      const [remoteBookmarks, remoteProgress, remoteDays] = await Promise.all([
        fetchAyahBookmarks(),
        fetchSurahProgress(),
        fetchListenDays(),
      ]);
      if (cancelled) return;

      const mergedBookmarks = mergeBookmarks(localBookmarks, remoteBookmarks);
      const mergedProgress = mergeProgress(localProgress, remoteProgress);

      persistBookmarks(mergedBookmarks);
      persistProgress(mergedProgress);

      for (const row of mergedBookmarks) {
        const remote = remoteBookmarks.find((item) => item.surahId === row.surahId && item.ayah === row.ayah);
        if (
          !remote ||
          remote.note !== row.note ||
          remote.reciterId !== row.reciterId ||
          remote.updatedAt !== row.updatedAt
        ) {
          await upsertAyahBookmark(row);
        }
      }

      for (const row of mergedProgress) {
        const remote = remoteProgress.find(
          (item) =>
            item.reciterId === row.reciterId &&
            item.moshafId === row.moshafId &&
            item.surahId === row.surahId,
        );
        if (!remote || remote.updatedAt !== row.updatedAt) {
          await upsertSurahProgress(row);
        }
      }

      if (!remoteDays.ok) {
        if (!cancelled) {
          mergeLockRef.current = false;
          setLibraryReady(true);
        }
        return;
      }

      const pushed = loadPushedListenDays();
      const deltas = listenDayDeltas(localDays, pushed);
      cloudDaysRef.current = remoteDays.days;
      paintListenDays(true);

      for (const delta of deltas) {
        if (cancelled) return;
        const saved = await applyListenDayDelta(delta);
        if (saved) {
          cloudDaysRef.current = [
            saved,
            ...cloudDaysRef.current.filter((row) => row.day !== saved.day),
          ];
        }
      }
      if (cancelled) return;
      paintListenDays(true);
      saveLocalListenDays([]);
      savePushedListenDays({});

      if (!cancelled) {
        mergeLockRef.current = false;
        setLibraryReady(true);
      }
    };

    void run().catch((err) => {
      console.warn('library merge failed', err);
      mergeLockRef.current = false;
      setLibraryReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [
    applyListenDayDelta,
    fetchAyahBookmarks,
    fetchListenDays,
    fetchSurahProgress,
    sessionReady,
    upsertAyahBookmark,
    upsertSurahProgress,
    user?.id,
  ]);

  // Listen accumulator
  useEffect(() => {
    if (playbackStatus === 'playing') {
      if (lastTickRef.current == null) lastTickRef.current = Date.now();
      const day = localDayKey();
      if (sessionCountedDayRef.current !== day) {
        pendingSessionRef.current = true;
        sessionCountedDayRef.current = day;
      }
    } else {
      lastTickRef.current = null;
      paintListenDays(true);
      void flushListenToCloud();
    }

    if (playbackStatus !== 'playing') return;

    const timer = window.setInterval(() => {
      const now = Date.now();
      const prev = lastTickRef.current ?? now;
      const delta = Math.min(MAX_TICK_DELTA_S, Math.max(0, (now - prev) / 1000));
      lastTickRef.current = now;
      if (delta <= 0) return;
      listenAccRef.current += delta;
      const addSession = pendingSessionRef.current;
      pendingSessionRef.current = false;
      creditListenSeconds(delta, addSession);

      if (now - lastListenFlushRef.current >= (document.visibilityState === 'hidden' ? LISTEN_FLUSH_HIDDEN_MS : LISTEN_FLUSH_MS)) {
        lastListenFlushRef.current = now;
        void flushListenToCloud();
      }
    }, pageHidden ? LISTEN_TICK_HIDDEN_MS : LISTEN_TICK_MS);

    return () => window.clearInterval(timer);
  }, [creditListenSeconds, flushListenToCloud, pageHidden, playbackStatus]);

  useEffect(() => {
    if (playbackStatus !== 'playing') return;
    snapshotProgress(false);
    const timer = window.setInterval(
      () => snapshotProgress(false),
      pageHidden ? PROGRESS_FLUSH_HIDDEN_MS : PROGRESS_FLUSH_MS,
    );
    return () => window.clearInterval(timer);
  }, [pageHidden, playbackStatus, snapshotProgress]);

  useEffect(() => {
    if (playbackStatus === 'paused') {
      snapshotProgress(true);
    }
  }, [playbackStatus, snapshotProgress]);

  useEffect(() => {
    const flush = () => {
      if (listenAccRef.current > 0 || pendingSessionRef.current) {
        creditListenSeconds(0, pendingSessionRef.current);
        pendingSessionRef.current = false;
      }
      snapshotProgress(true);
      void flushListenToCloud();
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [creditListenSeconds, flushListenToCloud, snapshotProgress]);

  const sortedBookmarks = useMemo(
    () => [...bookmarks].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [bookmarks],
  );

  const value = useMemo<LibraryContextValue>(() => ({
    bookmarks: sortedBookmarks.slice(0, bookmarkPage),
    bookmarkMap,
    progress,
    listenDays,
    streak: computeStreak(listenDays),
    secondsToday: secondsToday(listenDays),
    secondsWeek: secondsThisWeek(listenDays),
    secondsTotal: sumListenSeconds(listenDays),
    weekDays: lastSevenDays(listenDays),
    libraryReady,
    bookmarkTotal: sortedBookmarks.length,
    getBookmark,
    getProgress,
    toggleBookmark,
    saveBookmarkNote,
    removeBookmark,
    visibleBookmarkCount: Math.min(bookmarkPage, sortedBookmarks.length),
    showMoreBookmarks: () => setBookmarkPage((n) => n + BOOKMARK_PAGE_SIZE),
    resetBookmarkPage: () => setBookmarkPage(BOOKMARK_PAGE_SIZE),
  }), [
    bookmarkMap,
    bookmarkPage,
    getBookmark,
    getProgress,
    libraryReady,
    listenDays,
    progress,
    removeBookmark,
    saveBookmarkNote,
    sortedBookmarks,
    toggleBookmark,
  ]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLibrary = () => {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within a LibraryProvider');
  return ctx;
};

export const snippetFromAyah = (ayah: QuranAyah) => ({
  snippetAr: clipSnippet(ayah.textUthmani),
  snippetFr: clipSnippet(ayah.translationFr),
});
