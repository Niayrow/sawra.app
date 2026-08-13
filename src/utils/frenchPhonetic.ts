/**
 * Convertit la translittération quran.com (style anglais)
 * vers une phonétique lisible à la française.
 *
 * Ex. : "Bismi Allāhi" → "Bismi Allâhi"
 *       "ar-raḥmāni" → "ar-raḥmâni"
 *       "Al-ḥamdu" → "Al-ḥamdou"
 */
export function toFrenchPhonetic(raw: string): string {
  if (!raw.trim()) return '';

  let s = raw.normalize('NFC').trim();

  // Digraphes / voyelles longues (ordre important)
  s = s
    .replace(/All[aāáàâ]h/gi, 'Allâh')
    .replace(/ll[aāáàâ]h/gi, 'llâh')
    .replace(/sh/gi, 'ch')
    .replace(/ā|á|à/g, 'â')
    .replace(/Ā|Á|À/g, 'Â')
    .replace(/ī|í|ì/g, 'î')
    .replace(/Ī|Í|Ì/g, 'Î')
    .replace(/ū|ú|ù/g, 'ou')
    .replace(/Ū|Ú|Ù/g, 'Ou')
    .replace(/aa/gi, 'â')
    .replace(/ee/gi, 'î')
    .replace(/oo/gi, 'ou')
    // hamza / ayn
    .replace(/[ʿʿ]/g, '‘')
    .replace(/[ʾ'`]/g, '’')
    // ج anglais "j" → "dj" (début de mot / après séparateur)
    .replace(/(^|[\s\-’‘])j/gi, (_, p1: string) => `${p1}dj`)
    // damma finale typique -u / -hu → -ou / -hou (sauf mono-lettres)
    .replace(/([bcdfgḥḫklmnpqrstvwxyzḍṣṭẓšž])u\b/gi, '$1ou')
    .replace(/([bcdfgḥḫklmnpqrstvwxyzḍṣṭẓšž])U\b/g, '$1Ou')
    // nettoyage espaces
    .replace(/\s+/g, ' ')
    .trim();

  // Capitaliser le début de phrase
  if (s.length > 0) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }

  return s;
}
