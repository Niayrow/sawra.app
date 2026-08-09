import React, { useEffect, useState } from 'react';
import type { Moshaf, Reciter } from '../types';
import {
  isTimingCatalogReady,
  moshafHasAyahTiming,
  reciterHasAyahTiming,
  subscribeTimingCatalog,
} from '../utils/ayahTiming';

export function useTimingCatalogReady(): boolean {
  const [ready, setReady] = useState(isTimingCatalogReady);

  useEffect(() => subscribeTimingCatalog(() => setReady(isTimingCatalogReady())), []);

  return ready;
}

export function useReciterHasAyahSync(reciter: Reciter | null | undefined): boolean {
  const ready = useTimingCatalogReady();
  if (!ready || !reciter) return false;
  return reciterHasAyahTiming(reciter);
}

export function useMoshafHasAyahSync(moshaf: Moshaf | null | undefined): boolean {
  const ready = useTimingCatalogReady();
  if (!ready || !moshaf) return false;
  return moshafHasAyahTiming(moshaf);
}

type AyahSyncBadgeProps = {
  reciter?: Reciter | null;
  /** Prefer when checking the playing moshaf specifically */
  moshaf?: Moshaf | null;
  className?: string;
  /** Compact label for tight player chrome */
  compact?: boolean;
};

/** Small badge: this reciter/moshaf supports verse-by-verse highlighting. */
export const AyahSyncBadge: React.FC<AyahSyncBadgeProps> = ({
  reciter,
  moshaf,
  className = '',
  compact = false,
}) => {
  const ready = useTimingCatalogReady();
  const supported = ready
    ? moshaf
      ? moshafHasAyahTiming(moshaf)
      : reciter
        ? reciterHasAyahTiming(reciter)
        : false
    : false;

  if (!supported) return null;

  return (
    <span
      className={`ayah-sync-badge inline-flex shrink-0 items-center rounded-md border border-[#cea687]/40 bg-[#cea687]/12 font-bold uppercase tracking-[0.08em] text-[#f0d1bc] ${
        compact ? 'px-1 py-px text-[8px] leading-none' : 'px-1.5 py-0.5 text-[9px] leading-none'
      } ${className}`}
      title="Verset par verset disponible"
      aria-label="Verset par verset disponible"
    >
      Versets
    </span>
  );
};

export default AyahSyncBadge;
