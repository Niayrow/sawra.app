import { useCallback, useEffect, useRef, useState } from 'react';
import type { Moshaf, Reciter } from '../types';
import { useQuizAyahClip } from './useQuizAyahClip';
import {
  buildAyahWindow,
  clampLearnWindowSize,
  firstAyahNumber,
  LEARN_WINDOW_SIZE_MAX,
  loadSurahTimings,
  nextStartAyah,
  prevStartAyah,
  type LearnAyahWindow,
  type LearnConfig,
  type LearnRepeatCount,
  type LearnWindowSize,
} from '../utils/learnSession';
import type { AyahTiming } from '../utils/ayahTiming';
import type { LearnSpeed } from '../utils/learnPrefs';

export type LearnPhase =
  | 'idle'
  | 'loading'
  | 'idle_surah'
  | 'listening'
  | 'ready'
  | 'done'
  | 'error';

type UseLearnLoopArgs = {
  onBeforePlay?: () => void;
  initialAutoAdvance?: boolean;
  initialSpeed?: LearnSpeed;
};

export function useLearnLoop({
  onBeforePlay,
  initialAutoAdvance = false,
  initialSpeed = 1,
}: UseLearnLoopArgs = {}) {
  const clip = useQuizAyahClip(onBeforePlay);
  const [phase, setPhase] = useState<LearnPhase>('idle');
  const [config, setConfig] = useState<LearnConfig | null>(null);
  const [timings, setTimings] = useState<AyahTiming[]>([]);
  const [ayahWindow, setAyahWindow] = useState<LearnAyahWindow | null>(null);
  const [repIndex, setRepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [revealedAyahs, setRevealedAyahs] = useState<Set<number>>(() => new Set());
  const [allRevealed, setAllRevealed] = useState(false);
  const [autoAdvance, setAutoAdvanceState] = useState(initialAutoAdvance);
  const [speed, setSpeedState] = useState<LearnSpeed>(initialSpeed);
  const [reciterSwitching, setReciterSwitching] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const targetRepeatsRef = useRef<LearnRepeatCount>(1);
  const awaitEndedRef = useRef(false);
  const returnPhaseRef = useRef<LearnPhase | null>(null);
  const configRef = useRef<LearnConfig | null>(null);
  const timingsRef = useRef<AyahTiming[]>([]);
  const ayahWindowRef = useRef<LearnAyahWindow | null>(null);
  const autoAdvanceRef = useRef(initialAutoAdvance);

  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    timingsRef.current = timings;
  }, [timings]);
  useEffect(() => {
    ayahWindowRef.current = ayahWindow;
  }, [ayahWindow]);
  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);

  useEffect(() => {
    clip.setPlaybackRate(speed);
  }, [clip, speed]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    clip.unload();
    setPhase('idle');
    setConfig(null);
    setTimings([]);
    setAyahWindow(null);
    setRepIndex(0);
    setError(null);
    setRevealedAyahs(new Set());
    setAllRevealed(false);
    setReciterSwitching(false);
    awaitEndedRef.current = false;
    returnPhaseRef.current = null;
  }, [clip]);

  const openWindow = useCallback(
    (
      cfg: LearnConfig,
      allTimings: AyahTiming[],
      startAyah: number,
      opts?: { autoListen?: boolean },
    ) => {
      const win = buildAyahWindow(
        allTimings,
        startAyah,
        cfg.windowSize,
        cfg.moshaf,
        cfg.surah,
      );
      if (!win) {
        setPhase('done');
        setAyahWindow(null);
        return null;
      }
      setAyahWindow(win);
      setRepIndex(0);
      awaitEndedRef.current = false;
      returnPhaseRef.current = null;
      clip.stop();
      if (!opts?.autoListen) {
        setPhase('idle_surah');
      }
      return win;
    },
    [clip],
  );

  const playClip = useCallback(
    async (fromRep: number, winOverride?: LearnAyahWindow | null) => {
      const win = winOverride ?? ayahWindowRef.current;
      if (!win) return;
      setRepIndex(fromRep);
      setPhase('listening');
      awaitEndedRef.current = false;
      clip.setPlaybackRate(speed);
      await clip.loadClip(
        {
          audioUrl: win.audioUrl,
          startMs: win.startMs,
          endMs: win.endMs,
        },
        true,
      );
    },
    [clip, speed],
  );

  const start = useCallback(
    async (cfg: LearnConfig) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setError(null);
      setPhase('loading');
      setConfig(cfg);
      targetRepeatsRef.current = cfg.repeats;
      setRevealedAyahs(new Set());
      setAllRevealed(false);
      clip.unload();

      try {
        const loaded = await loadSurahTimings(cfg.moshaf, cfg.surah.id, ac.signal);
        if (ac.signal.aborted) return;
        if (!loaded.length) {
          setError('Timings introuvables pour cette sourate.');
          setPhase('error');
          return;
        }
        setTimings(loaded);
        const first = firstAyahNumber(loaded);
        if (first == null) {
          setError('Aucun verset disponible.');
          setPhase('error');
          return;
        }
        openWindow(cfg, loaded, first);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(
          err instanceof Error ? err.message : 'Impossible de démarrer la session.',
        );
        setPhase('error');
      }
    },
    [clip, openWindow],
  );

  /** Change voice mid-session — keeps surah, position and reveal state. */
  const changeReciter = useCallback(
    async (reciter: Reciter, moshaf: Moshaf) => {
      const cfg = configRef.current;
      const win = ayahWindowRef.current;
      if (!cfg || !win) return;
      if (reciter.id === cfg.reciter.id) return;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setReciterSwitching(true);
      setError(null);
      clip.stop();

      const nextCfg: LearnConfig = {
        ...cfg,
        reciter,
        moshaf,
      };

      try {
        const loaded = await loadSurahTimings(moshaf, cfg.surah.id, ac.signal);
        if (ac.signal.aborted) return;
        if (!loaded.length) {
          setError('Timings introuvables pour cette voix.');
          setReciterSwitching(false);
          return;
        }
        setConfig(nextCfg);
        setTimings(loaded);
        const hasStart = loaded.some((t) => t.ayah === win.startAyah && t.ayah > 0);
        const start = hasStart ? win.startAyah : firstAyahNumber(loaded);
        if (start == null) {
          setError('Aucun verset disponible pour cette voix.');
          setReciterSwitching(false);
          return;
        }
        const rebuilt = openWindow(nextCfg, loaded, start);
        setReciterSwitching(false);
        if (rebuilt) {
          returnPhaseRef.current = null;
          void playClip(0, rebuilt);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(
          err instanceof Error ? err.message : 'Impossible de changer de voix.',
        );
        setReciterSwitching(false);
      }
    },
    [clip, openWindow, playClip],
  );

  const listen = useCallback(() => {
    returnPhaseRef.current = null;
    void playClip(0);
  }, [playClip]);

  const resume = useCallback(() => {
    returnPhaseRef.current = null;
    void playClip(repIndex);
  }, [playClip, repIndex]);

  const replay = useCallback(() => {
    returnPhaseRef.current = 'ready';
    void playClip(0);
  }, [playClip]);

  useEffect(() => {
    if (phase !== 'listening') return;
    if (clip.status === 'playing' || clip.status === 'loading') {
      awaitEndedRef.current = true;
    }
  }, [clip.status, phase]);

  const goToAyah = useCallback(
    (ayahNumber: number, autoListen = true) => {
      const cfg = configRef.current;
      const all = timingsRef.current;
      if (!cfg || !all.length) return;
      const win = openWindow(cfg, all, ayahNumber, { autoListen });
      if (win && autoListen) {
        returnPhaseRef.current = null;
        void playClip(0, win);
      }
    },
    [openWindow, playClip],
  );

  const finishOrAdvance = useCallback(() => {
    const cfg = configRef.current;
    const win = ayahWindowRef.current;
    const all = timingsRef.current;
    if (!cfg || !win) {
      setPhase('ready');
      return;
    }
    const next = nextStartAyah(all, win.endAyah);
    if (next == null) {
      clip.unload();
      setPhase('done');
      return;
    }
    if (autoAdvanceRef.current) {
      goToAyah(next, true);
      return;
    }
    setPhase('ready');
  }, [clip, goToAyah]);

  useEffect(() => {
    if (phase !== 'listening') return;
    if (clip.status !== 'ended') return;
    if (!awaitEndedRef.current) return;

    awaitEndedRef.current = false;

    if (returnPhaseRef.current) {
      const next = returnPhaseRef.current;
      returnPhaseRef.current = null;
      setPhase(next);
      return;
    }

    const nextRep = repIndex + 1;
    const target = targetRepeatsRef.current;
    if (nextRep < target) {
      void playClip(nextRep);
      return;
    }
    finishOrAdvance();
  }, [clip.status, finishOrAdvance, phase, playClip, repIndex]);

  const goNext = useCallback(() => {
    const cfg = configRef.current;
    const win = ayahWindowRef.current;
    const all = timingsRef.current;
    if (!cfg || !win) return;
    const next = nextStartAyah(all, win.endAyah);
    if (next == null) {
      clip.unload();
      setPhase('done');
      return;
    }
    goToAyah(next, true);
  }, [clip, goToAyah]);

  const goPrev = useCallback(() => {
    const cfg = configRef.current;
    const win = ayahWindowRef.current;
    const all = timingsRef.current;
    if (!cfg || !win) return;
    const prev = prevStartAyah(all, win.startAyah, cfg.windowSize);
    if (prev == null) return;
    goToAyah(prev, true);
  }, [goToAyah]);

  const setRepeats = useCallback((n: LearnRepeatCount) => {
    targetRepeatsRef.current = n;
    setConfig((c) => (c ? { ...c, repeats: n } : c));
  }, []);

  const setWindowSize = useCallback(
    (n: LearnWindowSize) => {
      const cfg = configRef.current;
      const win = ayahWindowRef.current;
      const all = timingsRef.current;
      const maxAvail = all.filter((t) => t.ayah > 0).length || LEARN_WINDOW_SIZE_MAX;
      const clamped = clampLearnWindowSize(n, maxAvail);
      if (!cfg) {
        setConfig((c) => (c ? { ...c, windowSize: clamped } : c));
        return;
      }
      const nextCfg = { ...cfg, windowSize: clamped };
      setConfig(nextCfg);
      if (win && all.length) {
        openWindow(nextCfg, all, win.startAyah);
      }
    },
    [openWindow],
  );

  const setAutoAdvance = useCallback((value: boolean) => {
    autoAdvanceRef.current = value;
    setAutoAdvanceState(value);
  }, []);

  const setSpeed = useCallback((value: LearnSpeed) => {
    setSpeedState(value);
    clip.setPlaybackRate(value);
  }, [clip]);

  const isFocusAyah = useCallback(
    (ayahNumber: number) =>
      Boolean(ayahWindow?.ayahNumbers.includes(ayahNumber)),
    [ayahWindow],
  );

  const isAyahRevealed = useCallback(
    (ayahNumber: number) => allRevealed || revealedAyahs.has(ayahNumber),
    [allRevealed, revealedAyahs],
  );

  const revealFocus = useCallback(() => {
    const win = ayahWindowRef.current;
    if (!win) return;
    setRevealedAyahs((prev) => {
      const next = new Set(prev);
      win.ayahNumbers.forEach((n) => next.add(n));
      return next;
    });
  }, []);

  const revealAll = useCallback(() => {
    setAllRevealed(true);
  }, []);

  const blurAll = useCallback(() => {
    setAllRevealed(false);
    setRevealedAyahs(new Set());
  }, []);

  const blurFocus = useCallback(() => {
    const win = ayahWindowRef.current;
    if (!win) return;
    setAllRevealed(false);
    setRevealedAyahs((prev) => {
      const next = new Set(prev);
      win.ayahNumbers.forEach((n) => next.delete(n));
      return next;
    });
  }, []);

  const toggleAyahReveal = useCallback(
    (ayahNumber: number, allAyahNumbers: number[] = []) => {
      if (allRevealed) {
        setAllRevealed(false);
        const next = new Set(allAyahNumbers);
        next.delete(ayahNumber);
        setRevealedAyahs(next);
        return;
      }
      setRevealedAyahs((prev) => {
        const next = new Set(prev);
        if (next.has(ayahNumber)) next.delete(ayahNumber);
        else next.add(ayahNumber);
        return next;
      });
    },
    [allRevealed],
  );

  const isLastWindow = Boolean(
    ayahWindow && !nextStartAyah(timings, ayahWindow.endAyah),
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    phase,
    config,
    ayahWindow,
    timings,
    repIndex,
    repeats: (config?.repeats ?? 1) as LearnRepeatCount,
    windowSize: (config?.windowSize ?? 1) as LearnWindowSize,
    error,
    clip,
    autoAdvance,
    speed,
    reciterSwitching,
    isLastWindow,
    start,
    reset,
    listen,
    resume,
    replay,
    goNext,
    goPrev,
    goToAyah,
    setRepeats,
    setWindowSize,
    setAutoAdvance,
    setSpeed,
    changeReciter,
    isFocusAyah,
    isAyahRevealed,
    revealFocus,
    revealAll,
    blurAll,
    blurFocus,
    toggleAyahReveal,
    allRevealed,
    isPlaying: clip.isPlaying,
    isLoadingClip: clip.isLoading,
  };
}
