import { SURAHS } from '../data/surahs';
import type { Moshaf, Reciter, Surah } from '../types';
import { getAudioUrl } from './audioUrl';
import {
  fetchAyahTimings,
  resolveTimingReadId,
  type AyahTiming,
} from './ayahTiming';
import {
  getQuizEligibleReciters,
  getTimedHafsMoshaf,
  QUIZ_RECITER_IDS,
} from './quizQuestions';

export const LEARN_WINDOW_SIZE_MIN = 1;
export const LEARN_WINDOW_SIZE_MAX = 50;

/** How many consecutive ayahs to play — free choice (clamped). */
export type LearnWindowSize = number;

export const LEARN_REPEAT_COUNTS = [1, 2, 3, 5] as const;
export type LearnRepeatCount = (typeof LEARN_REPEAT_COUNTS)[number];

export function clampLearnWindowSize(n: number, maxAvailable = LEARN_WINDOW_SIZE_MAX): LearnWindowSize {
  const max = Math.max(LEARN_WINDOW_SIZE_MIN, Math.min(LEARN_WINDOW_SIZE_MAX, maxAvailable));
  if (!Number.isFinite(n)) return LEARN_WINDOW_SIZE_MIN;
  return Math.min(max, Math.max(LEARN_WINDOW_SIZE_MIN, Math.round(n)));
}

export type LearnAyahWindow = {
  startAyah: number;
  endAyah: number;
  ayahNumbers: number[];
  startMs: number;
  endMs: number;
  audioUrl: string;
};

export type LearnConfig = {
  reciter: Reciter;
  moshaf: Moshaf;
  surah: Surah;
  windowSize: LearnWindowSize;
  repeats: LearnRepeatCount;
};

export { QUIZ_RECITER_IDS as LEARN_RECITER_IDS };

export function getLearnEligibleReciters(reciters: Reciter[]): Reciter[] {
  return getQuizEligibleReciters(reciters);
}

const parseSurahIds = (moshaf: Moshaf): number[] =>
  moshaf.surah_list
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));

export function getLearnSurahsForReciter(reciter: Reciter): Surah[] {
  const moshaf = getTimedHafsMoshaf(reciter);
  if (!moshaf) return [];
  const ids = new Set(parseSurahIds(moshaf));
  return SURAHS.filter((s) => ids.has(s.id));
}

export function getLearnMoshaf(reciter: Reciter): Moshaf | null {
  return getTimedHafsMoshaf(reciter);
}

/**
 * Build an audio window of `count` consecutive ayahs starting at `startAyah`.
 * Truncates at end of surah if fewer ayahs remain.
 */
export function buildAyahWindow(
  timings: AyahTiming[],
  startAyah: number,
  count: number,
  moshaf: Moshaf,
  surah: Surah,
): LearnAyahWindow | null {
  const sorted = [...timings]
    .filter((t) => t.ayah > 0 && t.endMs > t.startMs)
    .sort((a, b) => a.ayah - b.ayah || a.startMs - b.startMs);

  if (!sorted.length) return null;

  const startIdx = sorted.findIndex((t) => t.ayah === startAyah);
  if (startIdx < 0) return null;

  const slice = sorted.slice(startIdx, startIdx + Math.max(1, count));
  if (!slice.length) return null;

  const first = slice[0];
  const last = slice[slice.length - 1];

  return {
    startAyah: first.ayah,
    endAyah: last.ayah,
    ayahNumbers: slice.map((t) => t.ayah),
    startMs: first.startMs,
    endMs: last.endMs,
    audioUrl: getAudioUrl(moshaf, surah),
  };
}

export async function loadSurahTimings(
  moshaf: Moshaf,
  surahId: number,
  signal?: AbortSignal,
): Promise<AyahTiming[]> {
  const readId = await resolveTimingReadId(moshaf, signal);
  if (readId == null) return [];
  return fetchAyahTimings(readId, surahId, signal);
}

export function nextStartAyah(
  timings: AyahTiming[],
  currentEndAyah: number,
): number | null {
  const sorted = [...timings]
    .filter((t) => t.ayah > 0)
    .sort((a, b) => a.ayah - b.ayah);
  const next = sorted.find((t) => t.ayah > currentEndAyah);
  return next?.ayah ?? null;
}

/** Previous window start: step back by `windowSize` ayahs (or to first). */
export function prevStartAyah(
  timings: AyahTiming[],
  currentStartAyah: number,
  windowSize: number,
): number | null {
  const sorted = [...timings]
    .filter((t) => t.ayah > 0)
    .sort((a, b) => a.ayah - b.ayah);
  const idx = sorted.findIndex((t) => t.ayah === currentStartAyah);
  if (idx <= 0) return null;
  const prevIdx = Math.max(0, idx - Math.max(1, windowSize));
  return sorted[prevIdx]?.ayah ?? null;
}

export function firstAyahNumber(timings: AyahTiming[]): number | null {
  const sorted = [...timings]
    .filter((t) => t.ayah > 0)
    .sort((a, b) => a.ayah - b.ayah);
  return sorted[0]?.ayah ?? null;
}
