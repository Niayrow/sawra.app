/** Fisher–Yates shuffle (in-place copy). */
export function shuffleIds(ids: number[]): number[] {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Order surah ids for playback — shuffled or natural ascending. */
export function buildRadioQueue(surahIds: number[], shuffle: boolean): number[] {
  const unique = [...new Set(surahIds)].sort((a, b) => a - b);
  return shuffle ? shuffleIds(unique) : unique;
}
