import type { Moshaf, Surah } from '../types';
import type { AyahTiming } from './ayahTiming';
import { getAudioUrl } from './audioUrl';
import type { LearnAyahWindow } from './learnSession';

/** Ayat al-Kursi — Al-Baqarah 2:255 */
export const AYAT_AL_KURSI = {
  surahId: 2,
  ayah: 255,
  title: 'Ayat al-Kursi',
  arabicTitle: 'آية الكرسي',
  teaser:
    'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ …',
} as const;

/** Découpage pédagogique en phrases naturelles (poids ≈ longueur arabe). */
export const KURSI_PHRASES = [
  {
    ar: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ',
    phonetic: 'Allâhou lâ ilâha illâ houwa al-ḥayyou al-qayyoum',
    fr: 'Allah — nul dieu sauf Lui, le Vivant, l’Immutant',
  },
  {
    ar: 'لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ',
    phonetic: 'Lâ ta’khouḍouhou sinatoun wa lâ nawm',
    fr: 'Ni somnolence ni sommeil ne Le prennent',
  },
  {
    ar: 'لَّهُۥ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ',
    phonetic: 'Lahou mâ fî as-samâwâti wa mâ fî al-arḍ',
    fr: 'À Lui ce qui est dans les cieux et sur la terre',
  },
  {
    ar: 'مَن ذَا ٱلَّذِى يَشْفَعُ عِندَهُۥٓ إِلَّا بِإِذْنِهِۦ',
    phonetic: 'Man ḏâ alladhî yachfa‘ou ‘indahou illâ bi-idhnihi',
    fr: 'Qui peut intercéder auprès de Lui sans Sa permission ?',
  },
  {
    ar: 'يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ',
    phonetic: 'Ya‘lamou mâ bayna aydîhim wa mâ khalfahoum',
    fr: 'Il sait ce qui est devant eux et derrière eux',
  },
  {
    ar: 'وَلَا يُحِيطُونَ بِشَىْءٍ مِّنْ عِلْمِهِۦٓ إِلَّا بِمَا شَآءَ',
    phonetic: 'Wa lâ youḥîṭouna bi-chay’in min ‘ilmihi illâ bi-mâ châ’',
    fr: 'Ils n’embrassent de Sa science que ce qu’Il veut',
  },
  {
    ar: 'وَسِعَ كُرْسِيُّهُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ',
    phonetic: 'Wasi‘a koursiyyouhou as-samâwâti wa al-arḍ',
    fr: 'Son Trône embrasse les cieux et la terre',
  },
  {
    ar: 'وَلَا يَـُٔودُهُۥ حِفْظُهُمَا ۚ وَهُوَ ٱلْعَلِىُّ ٱلْعَظِيمُ',
    phonetic: 'Wa lâ ya’ôudouhou ḥifẓuhoumâ, wa houwa al-‘aliyyou al-‘aẓîm',
    fr: 'Leur garde ne Lui pèse pas — Il est le Très-Haut, le Sublime',
  },
] as const;

const MIN_SEGMENT_MS = 900;

function phraseWeight(ar: string): number {
  return Math.max(8, ar.replace(/\s/g, '').length);
}

/**
 * Découpe le timing du verset 255 en plusieurs fenêtres audio
 * proportionnelles à la longueur de chaque phrase.
 */
export function buildKursiSegments(
  ayahTiming: AyahTiming,
  moshaf: Moshaf,
  surah: Surah,
): LearnAyahWindow[] {
  const span = Math.max(0, ayahTiming.endMs - ayahTiming.startMs);
  if (span < MIN_SEGMENT_MS) {
    return [
      {
        startAyah: AYAT_AL_KURSI.ayah,
        endAyah: AYAT_AL_KURSI.ayah,
        ayahNumbers: [AYAT_AL_KURSI.ayah],
        startMs: ayahTiming.startMs,
        endMs: ayahTiming.endMs,
        audioUrl: getAudioUrl(moshaf, surah),
        segmentIndex: 0,
        segmentCount: 1,
        phraseAr: AYAT_AL_KURSI.teaser,
        phraseFr: AYAT_AL_KURSI.title,
        phrasePhonetic: KURSI_PHRASES[0].phonetic,
      },
    ];
  }

  const weights = KURSI_PHRASES.map((p) => phraseWeight(p.ar));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const audioUrl = getAudioUrl(moshaf, surah);
  const count = KURSI_PHRASES.length;

  let cursor = ayahTiming.startMs;
  const segments: LearnAyahWindow[] = [];

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const rawEnd = isLast
      ? ayahTiming.endMs
      : cursor + (span * weights[i]) / totalWeight;
    let endMs = Math.round(rawEnd);

    // Keep a usable duration; fold leftover into last segments if needed
    if (!isLast && endMs - cursor < MIN_SEGMENT_MS) {
      endMs = Math.min(ayahTiming.endMs, cursor + MIN_SEGMENT_MS);
    }
    if (isLast) endMs = ayahTiming.endMs;
    if (endMs <= cursor) endMs = Math.min(ayahTiming.endMs, cursor + MIN_SEGMENT_MS);

    segments.push({
      startAyah: AYAT_AL_KURSI.ayah,
      endAyah: AYAT_AL_KURSI.ayah,
      ayahNumbers: [AYAT_AL_KURSI.ayah],
      startMs: Math.round(cursor),
      endMs,
      audioUrl,
      segmentIndex: i,
      segmentCount: count,
      phraseAr: KURSI_PHRASES[i].ar,
      phraseFr: KURSI_PHRASES[i].fr,
      phrasePhonetic: KURSI_PHRASES[i].phonetic,
    });

    cursor = endMs;
  }

  return segments;
}

export function findKursiTiming(timings: AyahTiming[]): AyahTiming | null {
  const hit = timings.find(
    (t) => t.ayah === AYAT_AL_KURSI.ayah && t.endMs > t.startMs,
  );
  return hit ?? null;
}
