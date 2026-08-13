import { SURAHS } from '../data/surahs';
import type { Moshaf, Reciter, Surah } from '../types';
import { getAudioUrl } from './audioUrl';
import {
  fetchAyahTimings,
  moshafHasAyahTiming,
  reciterHasAyahTiming,
  resolveTimingReadId,
  type AyahTiming,
} from './ayahTiming';

export const QUIZ_LENGTHS = [5, 10, 15] as const;
export type QuizLength = (typeof QUIZ_LENGTHS)[number];

export const QUIZ_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type QuizDifficulty = (typeof QUIZ_DIFFICULTIES)[number];

export const QUIZ_DIFFICULTY_META: Record<
  QuizDifficulty,
  { label: string; hint: string }
> = {
  easy: {
    label: 'Facile',
    hint: 'Uniquement le Juz Amma (78–114)',
  },
  medium: {
    label: 'Moyen',
    hint: 'Juz Amma + versets connus d’autres sourates',
  },
  hard: {
    label: 'Difficile',
    hint: 'N’importe quel verset du Coran',
  },
};

/** Juz Amma starts at An-Naba (78). */
export const JUZ_AMMA_START = 78;

/**
 * Quiz voices only — curated Hafs reciters with reliable ayah timings.
 * Everyone else is excluded from the quiz pool.
 */
export const QUIZ_RECITER_IDS = [
  221, // Raad Al-Kurdi
  137, // Ahmad Talib bin Humaid
  245, // Mansour Al-Salemi
  31, // Saoud Al-Shuraim
  86, // Nasser Al-Qatami
  20, // Khaled Al-Jalil
  54, // Abderrahmane Al-Soudais
  92, // Yasser Al-Dossary
  109, // Mohamed Ayyoub
] as const;

const QUIZ_RECITER_ID_SET = new Set<number>(QUIZ_RECITER_IDS);

/**
 * Versets très connus hors Juz Amma — utilisés en difficulté moyenne
 * (en plus de tout le Juz Amma).
 */
const FAMOUS_VERSES_OUTSIDE_JUZ_AMMA: ReadonlyArray<{ surahId: number; ayah: number }> = [
  // Al-Fatihah
  { surahId: 1, ayah: 1 },
  { surahId: 1, ayah: 2 },
  { surahId: 1, ayah: 5 },
  { surahId: 1, ayah: 6 },
  { surahId: 1, ayah: 7 },
  // Al-Baqarah
  { surahId: 2, ayah: 1 },
  { surahId: 2, ayah: 2 },
  { surahId: 2, ayah: 163 },
  { surahId: 2, ayah: 255 }, // Ayat al-Kursi
  { surahId: 2, ayah: 256 },
  { surahId: 2, ayah: 285 },
  { surahId: 2, ayah: 286 },
  // Al-Imran
  { surahId: 3, ayah: 8 },
  { surahId: 3, ayah: 26 },
  { surahId: 3, ayah: 190 },
  { surahId: 3, ayah: 191 },
  // An-Nisa
  { surahId: 4, ayah: 36 },
  { surahId: 4, ayah: 59 },
  // Al-Ma'idah
  { surahId: 5, ayah: 3 },
  { surahId: 5, ayah: 35 },
  // Al-An'am
  { surahId: 6, ayah: 162 },
  // Al-A'raf
  { surahId: 7, ayah: 23 },
  { surahId: 7, ayah: 206 },
  // Yunus
  { surahId: 10, ayah: 57 },
  // Yusuf
  { surahId: 12, ayah: 64 },
  { surahId: 12, ayah: 87 },
  // Ar-Ra'd
  { surahId: 13, ayah: 28 },
  // Ibrahim
  { surahId: 14, ayah: 7 },
  // Al-Isra
  { surahId: 17, ayah: 23 },
  { surahId: 17, ayah: 24 },
  { surahId: 17, ayah: 110 },
  // Al-Kahf
  { surahId: 18, ayah: 1 },
  { surahId: 18, ayah: 10 },
  { surahId: 18, ayah: 110 },
  // Maryam
  { surahId: 19, ayah: 1 },
  { surahId: 19, ayah: 65 },
  // Ta-Ha
  { surahId: 20, ayah: 14 },
  { surahId: 20, ayah: 25 },
  // Al-Anbiya
  { surahId: 21, ayah: 87 },
  // Al-Hajj
  { surahId: 22, ayah: 77 },
  // An-Nur
  { surahId: 24, ayah: 35 },
  // Ash-Shu'ara
  { surahId: 26, ayah: 88 },
  { surahId: 26, ayah: 89 },
  // Ar-Rum
  { surahId: 30, ayah: 21 },
  // Luqman
  { surahId: 31, ayah: 13 },
  // Al-Ahzab
  { surahId: 33, ayah: 56 },
  { surahId: 33, ayah: 70 },
  // Ya-Sin
  { surahId: 36, ayah: 1 },
  { surahId: 36, ayah: 36 },
  { surahId: 36, ayah: 58 },
  { surahId: 36, ayah: 83 },
  // As-Saffat
  { surahId: 37, ayah: 180 },
  { surahId: 37, ayah: 181 },
  { surahId: 37, ayah: 182 },
  // Az-Zumar
  { surahId: 39, ayah: 53 },
  // Fussilat
  { surahId: 41, ayah: 30 },
  // Ash-Shura
  { surahId: 42, ayah: 36 },
  // Ad-Dukhan
  { surahId: 44, ayah: 58 },
  // Al-Hujurat
  { surahId: 49, ayah: 10 },
  { surahId: 49, ayah: 13 },
  // Qaf
  { surahId: 50, ayah: 16 },
  // Adh-Dhariyat
  { surahId: 51, ayah: 56 },
  // Ar-Rahman
  { surahId: 55, ayah: 1 },
  { surahId: 55, ayah: 13 },
  { surahId: 55, ayah: 26 },
  { surahId: 55, ayah: 27 },
  // Al-Waqi'ah
  { surahId: 56, ayah: 1 },
  { surahId: 56, ayah: 96 },
  // Al-Hadid
  { surahId: 57, ayah: 4 },
  // Al-Hashr
  { surahId: 59, ayah: 22 },
  { surahId: 59, ayah: 23 },
  { surahId: 59, ayah: 24 },
  // As-Saff
  { surahId: 61, ayah: 13 },
  // Al-Jumu'ah
  { surahId: 62, ayah: 9 },
  // At-Talaq
  { surahId: 65, ayah: 2 },
  { surahId: 65, ayah: 3 },
  // Al-Mulk
  { surahId: 67, ayah: 1 },
  { surahId: 67, ayah: 2 },
  { surahId: 67, ayah: 29 },
  // Al-Qalam
  { surahId: 68, ayah: 4 },
  // Nuh
  { surahId: 71, ayah: 10 },
  // Al-Jinn
  { surahId: 72, ayah: 18 },
  // Al-Muzzammil
  { surahId: 73, ayah: 1 },
  // Al-Muddaththir
  { surahId: 74, ayah: 1 },
];

type VerseTarget =
  | { kind: 'any'; surah: Surah }
  | { kind: 'fixed'; surah: Surah; ayah: number };

export type QuizQuestion = {
  id: string;
  reciter: Reciter;
  moshaf: Moshaf;
  surah: Surah;
  /** First ayah of the clip (inclusive). */
  ayah: number;
  /** Last ayah of the clip (inclusive) — usually ayah + 1. */
  ayahEnd: number;
  startMs: number;
  endMs: number;
  audioUrl: string;
  choices: Surah[];
};

export type QuizSession = {
  difficulty: QuizDifficulty;
  questions: QuizQuestion[];
};

const isHafsMoshaf = (moshaf: Moshaf): boolean => /hafs/i.test(moshaf.name);

const pickRandom = <T,>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const parseSurahIds = (moshaf: Moshaf): number[] =>
  moshaf.surah_list
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));

/** Hafs moshaf that has ayah timings — preferred for quiz clips. */
export function getTimedHafsMoshaf(reciter: Reciter): Moshaf | null {
  const hafsTimed = reciter.moshaf.filter(
    (m) => isHafsMoshaf(m) && moshafHasAyahTiming(m),
  );
  if (hafsTimed.length === 0) return null;
  return (
    hafsTimed.find((m) => parseSurahIds(m).length >= 100) ?? hafsTimed[0]
  );
}

export function getQuizEligibleReciters(reciters: Reciter[]): Reciter[] {
  return reciters.filter(
    (r) =>
      QUIZ_RECITER_ID_SET.has(r.id) &&
      reciterHasAyahTiming(r) &&
      getTimedHafsMoshaf(r) != null,
  );
}

function moshafHasSurah(moshaf: Moshaf, surahId: number): boolean {
  return parseSurahIds(moshaf).includes(surahId);
}

function surahById(id: number): Surah | undefined {
  return SURAHS.find((s) => s.id === id);
}

function juzAmmaSurahs(): Surah[] {
  return SURAHS.filter((s) => s.id >= JUZ_AMMA_START);
}

function buildVersePool(difficulty: QuizDifficulty): VerseTarget[] {
  if (difficulty === 'easy') {
    return juzAmmaSurahs().map((surah) => ({ kind: 'any', surah }));
  }

  if (difficulty === 'medium') {
    const juz = juzAmmaSurahs().map((surah) => ({ kind: 'any' as const, surah }));
    const famous = FAMOUS_VERSES_OUTSIDE_JUZ_AMMA.flatMap((v) => {
      const surah = surahById(v.surahId);
      if (!surah) return [];
      return [{ kind: 'fixed' as const, surah, ayah: v.ayah }];
    });
    return [...juz, ...famous];
  }

  return SURAHS.map((surah) => ({ kind: 'any', surah }));
}

function choicePoolForDifficulty(difficulty: QuizDifficulty): Surah[] {
  if (difficulty === 'easy') return juzAmmaSurahs();
  if (difficulty === 'medium') {
    const ids = new Set<number>([
      ...juzAmmaSurahs().map((s) => s.id),
      ...FAMOUS_VERSES_OUTSIDE_JUZ_AMMA.map((v) => v.surahId),
    ]);
    return SURAHS.filter((s) => ids.has(s.id));
  }
  return SURAHS;
}

function buildChoices(correct: Surah, pool: Surah[]): Surah[] {
  const distractors = shuffle(pool.filter((s) => s.id !== correct.id)).slice(0, 3);
  while (distractors.length < 3) {
    const filler = pickRandom(SURAHS.filter((s) => s.id !== correct.id));
    if (!distractors.some((d) => d.id === filler.id) && filler.id !== correct.id) {
      distractors.push(filler);
    }
    if (distractors.length >= 3) break;
  }
  return shuffle([correct, ...distractors.slice(0, 3)]);
}

/**
 * Always prefer a 2-ayah window so short openings (Alif Lam Mim, etc.)
 * are not played alone — they appear in several surahs.
 */
function pickTwoAyahClip(
  timings: AyahTiming[],
  preferredAyah?: number,
): { start: AyahTiming; end: AyahTiming } | null {
  const sorted = [...timings]
    .filter((t) => t.endMs > t.startMs)
    .sort((a, b) => a.ayah - b.ayah || a.startMs - b.startMs);

  if (!sorted.length) return null;
  if (sorted.length === 1) return { start: sorted[0], end: sorted[0] };

  if (preferredAyah != null) {
    const idx = sorted.findIndex((t) => t.ayah === preferredAyah);
    if (idx >= 0) {
      if (idx < sorted.length - 1) {
        return { start: sorted[idx], end: sorted[idx + 1] };
      }
      // Last ayah of the surah → include the previous one
      return { start: sorted[idx - 1], end: sorted[idx] };
    }
  }

  // Prefer starts that leave room for a following ayah
  const startCandidates = sorted.slice(0, -1);
  const usable = startCandidates.filter(
    (t, i) => sorted[i + 1].endMs - t.startMs >= 1200,
  );
  const start = pickRandom(usable.length ? usable : startCandidates);
  const startIdx = sorted.indexOf(start);
  const end = sorted[Math.min(startIdx + 1, sorted.length - 1)];
  return { start, end };
}

type EligibleVoice = { reciter: Reciter; moshaf: Moshaf };

function voicesForSurah(
  eligible: EligibleVoice[],
  surahId: number,
): EligibleVoice[] {
  return eligible.filter((v) => moshafHasSurah(v.moshaf, surahId));
}

async function buildQuestionFromTarget(
  target: VerseTarget,
  voice: EligibleVoice,
  choicePool: Surah[],
  signal?: AbortSignal,
): Promise<QuizQuestion | null> {
  const { reciter, moshaf } = voice;
  const readId = await resolveTimingReadId(moshaf, signal);
  if (readId == null) return null;

  const timings = await fetchAyahTimings(readId, target.surah.id, signal);
  const clip = pickTwoAyahClip(
    timings,
    target.kind === 'fixed' ? target.ayah : undefined,
  );
  if (!clip) return null;

  return {
    id: `${reciter.id}:${target.surah.id}:${clip.start.ayah}-${clip.end.ayah}:${clip.start.startMs}`,
    reciter,
    moshaf,
    surah: target.surah,
    ayah: clip.start.ayah,
    ayahEnd: clip.end.ayah,
    startMs: clip.start.startMs,
    endMs: clip.end.endMs,
    audioUrl: getAudioUrl(moshaf, target.surah),
    choices: buildChoices(target.surah, choicePool),
  };
}

/**
 * Build a quiz session: random timed reciter per question,
 * verse pool shaped by difficulty, distinct surahs when possible.
 */
export async function createQuizSession(
  reciters: Reciter[],
  length: QuizLength,
  difficulty: QuizDifficulty,
  signal?: AbortSignal,
): Promise<QuizSession> {
  const eligibleReciters = getQuizEligibleReciters(reciters);
  if (eligibleReciters.length === 0) {
    throw new Error('Aucun récitateur avec sync verset disponible.');
  }

  const eligible: EligibleVoice[] = eligibleReciters.flatMap((reciter) => {
    const moshaf = getTimedHafsMoshaf(reciter);
    return moshaf ? [{ reciter, moshaf }] : [];
  });

  const pool = buildVersePool(difficulty);
  const choices = choicePoolForDifficulty(difficulty);
  if (pool.length < 4 || choices.length < 4) {
    throw new Error('Pas assez de sourates pour ce niveau.');
  }

  // Distinct surahs first; keep extra candidates as fallback if some timings fail.
  const bySurah = new Map<number, VerseTarget[]>();
  for (const target of shuffle(pool)) {
    const list = bySurah.get(target.surah.id) ?? [];
    list.push(target);
    bySurah.set(target.surah.id, list);
  }
  const distinctSurahIds = shuffle([...bySurah.keys()]);
  const targetCount = Math.min(length, distinctSurahIds.length);
  const candidateIds = distinctSurahIds.slice(
    0,
    Math.min(distinctSurahIds.length, targetCount + 10),
  );

  let lastReciterId: number | null = null;
  const planned: Array<{ target: VerseTarget; voice: EligibleVoice }> = [];

  for (const surahId of candidateIds) {
    const options = bySurah.get(surahId);
    if (!options?.length) continue;
    const target = pickRandom(options);
    const voices = voicesForSurah(eligible, surahId);
    if (!voices.length) continue;

    const preferred: EligibleVoice[] =
      voices.length > 1 && lastReciterId != null
        ? voices.filter((v) => v.reciter.id !== lastReciterId)
        : voices;
    const voice: EligibleVoice = pickRandom(preferred.length ? preferred : voices);
    lastReciterId = voice.reciter.id;
    planned.push({ target, voice });
  }

  const built = await Promise.all(
    planned.map(async ({ target, voice }) => {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      try {
        return await buildQuestionFromTarget(target, voice, choices, signal);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        return null;
      }
    }),
  );

  const questions: QuizQuestion[] = [];
  const usedSurahIds = new Set<number>();
  for (const question of built) {
    if (!question || usedSurahIds.has(question.surah.id)) continue;
    usedSurahIds.add(question.surah.id);
    questions.push(question);
    if (questions.length >= targetCount) break;
  }

  if (questions.length === 0) {
    throw new Error('Impossible de préparer les questions. Réessayez.');
  }

  return { difficulty, questions };
}

/** Warm browser cache for the next clip while the user answers. */
export function prefetchQuizAudio(url: string): void {
  if (typeof Audio === 'undefined') return;
  try {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
  } catch {
    // ignore
  }
}
