import { useCallback, useEffect, useState } from 'react';
import type { QuranAyah } from '../types';

/** Hamidullah — traduction française (quran.com resource id) */
const FR_TRANSLATION_ID = 31;
/** Bump when payload / cleaning changes (invalidates in-memory cache) */
const TEXT_CACHE_VERSION = 3;

const ayahCache = new Map<string, QuranAyah[]>();

type ApiWord = {
  char_type_name?: string;
  transliteration?: { text?: string | null };
};

type ApiVerse = {
  verse_number: number;
  verse_key: string;
  text_uthmani?: string;
  translations?: Array<{ text?: string }>;
  words?: ApiWord[];
};

type ApiResponse = {
  verses?: ApiVerse[];
  pagination?: {
    total_pages?: number;
    next_page?: number | null;
  };
};

const stripHtml = (raw: string): string =>
  raw
    .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/(?:\[\d+\]|\(\d+\))\s*$/g, '')
    .replace(/\s+\d{1,2}\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const phoneticFromWords = (words: ApiWord[] | undefined): string => {
  if (!words?.length) return '';
  return words
    .filter((w) => (w.char_type_name ?? 'word') === 'word')
    .map((w) => w.transliteration?.text?.trim())
    .filter((t): t is string => Boolean(t))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const mapVerses = (verses: ApiVerse[]): QuranAyah[] =>
  verses.map((v) => ({
    number: v.verse_number,
    key: v.verse_key,
    textUthmani: v.text_uthmani ?? '',
    translationFr: stripHtml(v.translations?.[0]?.text ?? ''),
    phonetic: phoneticFromWords(v.words),
  }));

async function fetchSurahAyahs(surahId: number, signal?: AbortSignal): Promise<QuranAyah[]> {
  const key = `${TEXT_CACHE_VERSION}:${surahId}`;
  const cached = ayahCache.get(key);
  if (cached) return cached;

  const url =
    `https://api.quran.com/api/v4/verses/by_chapter/${surahId}` +
    `?language=fr&words=true&translations=${FR_TRANSLATION_ID}` +
    `&fields=text_uthmani&word_fields=text_uthmani,transliteration&per_page=300`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Impossible de charger la sourate (${res.status})`);
  }

  const data = (await res.json()) as ApiResponse;
  const ayahs = mapVerses(data.verses ?? []);
  if (ayahs.length === 0) {
    throw new Error('Aucun verset trouvé pour cette sourate');
  }

  ayahCache.set(key, ayahs);
  return ayahs;
}

export function useQuranText(surahId: number | null | undefined) {
  const [ayahs, setAyahs] = useState<QuranAyah[]>(() => {
    if (surahId == null) return [];
    return ayahCache.get(`${TEXT_CACHE_VERSION}:${surahId}`) ?? [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const retry = useCallback(() => {
    if (surahId != null) ayahCache.delete(`${TEXT_CACHE_VERSION}:${surahId}`);
    setRetryToken((n) => n + 1);
  }, [surahId]);

  useEffect(() => {
    if (surahId == null || surahId < 1 || surahId > 114) {
      setAyahs([]);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = ayahCache.get(`${TEXT_CACHE_VERSION}:${surahId}`);
    if (cached) {
      setAyahs(cached);
      setLoading(false);
      setError(null);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setError(null);
    setAyahs([]);

    fetchSurahAyahs(surahId, ac.signal)
      .then((data) => {
        if (ac.signal.aborted) return;
        setAyahs(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : 'Erreur de chargement du texte';
        setError(message);
        setLoading(false);
        setAyahs([]);
      });

    return () => ac.abort();
  }, [surahId, retryToken]);

  return { ayahs, loading, error, retry };
}
