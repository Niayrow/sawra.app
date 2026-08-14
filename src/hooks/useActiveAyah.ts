import { useMemo } from 'react';
import { useAudio } from '../context/AudioContext';
import { findAyahAt, getAyahProgress, useAyahTiming } from './useAyahTiming';
import type { Moshaf, Surah } from '../types';

export type UseActiveAyahOptions = {
  /** When false, skip timing fetch and return empty state */
  enabled?: boolean;
  /** Override moshaf (defaults to current track moshaf) */
  moshaf?: Moshaf | null;
  /** Override surah id (defaults to current track surah id) */
  surahId?: number | null;
};

export type UseActiveAyahResult = {
  available: boolean;
  loading: boolean;
  activeAyah: number | null;
  totalAyahs: number;
  ayahProgress: number | null;
  timings: ReturnType<typeof useAyahTiming>['timings'];
};

const EMPTY: UseActiveAyahResult = {
  available: false,
  loading: false,
  activeAyah: null,
  totalAyahs: 0,
  ayahProgress: null,
  timings: [],
};

/**
 * Derives the active ayah and intra-ayah progress from playback position.
 * Works in the global player and reader when verse sync is available.
 */
export function useActiveAyah(options: UseActiveAyahOptions = {}): UseActiveAyahResult {
  const { currentTrack, currentTime } = useAudio();
  const enabled = options.enabled !== false;

  const moshaf = options.moshaf ?? currentTrack?.moshaf ?? null;
  const surahId = options.surahId ?? currentTrack?.surah.id ?? null;
  const syncEnabled = enabled && Boolean(moshaf && surahId);

  const { available, timings, loading } = useAyahTiming(moshaf, surahId, syncEnabled);

  return useMemo(() => {
    if (!syncEnabled || !available || !timings.length) {
      return loading ? { ...EMPTY, loading: true } : EMPTY;
    }

    const activeAyah = findAyahAt(timings, currentTime);
    const ayahProgress = getAyahProgress(timings, currentTime);

    return {
      available: true,
      loading,
      activeAyah,
      totalAyahs: timings.length,
      ayahProgress,
      timings,
    };
  }, [syncEnabled, available, timings, loading, currentTime]);
}

/** Convenience wrapper when moshaf + surah are known (e.g. reader sheet). */
export function useActiveAyahForSurah(
  moshaf: Moshaf,
  surah: Surah,
  enabled: boolean,
): UseActiveAyahResult {
  return useActiveAyah({ moshaf, surahId: surah.id, enabled });
}
