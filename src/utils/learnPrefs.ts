import type { LearnRepeatCount } from './learnSession';
import { clampLearnWindowSize, LEARN_REPEAT_COUNTS } from './learnSession';

const STORAGE_KEY = 'sawra_learn_prefs_v1';

export const LEARN_SPEEDS = [0.75, 1, 1.25] as const;
export type LearnSpeed = (typeof LEARN_SPEEDS)[number];

export type LearnPrefs = {
  reciterId: number | null;
  surahId: number | null;
  windowSize: number;
  repeats: LearnRepeatCount;
  showPhonetic: boolean;
  showFr: boolean;
  autoAdvance: boolean;
  speed: LearnSpeed;
};

export const DEFAULT_LEARN_PREFS: LearnPrefs = {
  reciterId: null,
  surahId: null,
  windowSize: 1,
  repeats: 2,
  showPhonetic: true,
  showFr: true,
  autoAdvance: false,
  speed: 1,
};

const isRepeat = (n: unknown): n is LearnRepeatCount =>
  typeof n === 'number' && (LEARN_REPEAT_COUNTS as readonly number[]).includes(n);

const isSpeed = (n: unknown): n is LearnSpeed =>
  typeof n === 'number' && (LEARN_SPEEDS as readonly number[]).includes(n);

export function loadLearnPrefs(): LearnPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LEARN_PREFS };
    const parsed = JSON.parse(raw) as Partial<LearnPrefs>;
    return {
      reciterId: typeof parsed.reciterId === 'number' ? parsed.reciterId : null,
      surahId: typeof parsed.surahId === 'number' ? parsed.surahId : null,
      windowSize: clampLearnWindowSize(
        typeof parsed.windowSize === 'number' ? parsed.windowSize : 1,
      ),
      repeats: isRepeat(parsed.repeats) ? parsed.repeats : 2,
      showPhonetic: parsed.showPhonetic !== false,
      showFr: parsed.showFr !== false,
      autoAdvance: Boolean(parsed.autoAdvance),
      speed: isSpeed(parsed.speed) ? parsed.speed : 1,
    };
  } catch {
    return { ...DEFAULT_LEARN_PREFS };
  }
}

export function saveLearnPrefs(prefs: LearnPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / private mode
  }
}
