import type { PlaybackStatus } from '../types';
import {
  findAyahAt,
  getTimingForAyah,
  type AyahTiming,
} from './ayahTiming';

/**
 * Conservative ayah for persistence. Wrong ayah is worse than none.
 */
export function resolveStableAyah(input: {
  timings: AyahTiming[];
  available: boolean;
  currentTime: number;
  playbackStatus: PlaybackStatus;
  isSeeking: boolean;
  trackSurahId: number;
  timingsSurahId: number | null;
}): number | null {
  if (!input.available || input.isSeeking) return null;
  if (input.playbackStatus === 'buffering' || input.playbackStatus === 'error') return null;
  if (input.timingsSurahId == null || input.trackSurahId !== input.timingsSurahId) return null;
  if (!input.timings.length) return null;
  if (!Number.isFinite(input.currentTime) || input.currentTime < 0) return null;

  const ayah = findAyahAt(input.timings, input.currentTime);
  if (ayah == null) return null;

  const timing = getTimingForAyah(input.timings, ayah);
  if (!timing) return null;

  const ms = input.currentTime * 1000;
  const last = input.timings[input.timings.length - 1];
  if (timing.ayah === last.ayah) {
    return ms >= timing.startMs ? ayah : null;
  }
  if (ms < timing.startMs || ms >= timing.endMs) return null;
  return ayah;
}
