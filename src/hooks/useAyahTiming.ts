import { useEffect, useState } from 'react';
import type { Moshaf } from '../types';
import {
  fetchAyahTimings,
  resolveTimingReadId,
  type AyahTiming,
} from '../utils/ayahTiming';

export type UseAyahTimingResult = {
  available: boolean;
  timings: AyahTiming[];
  loading: boolean;
};

const EMPTY: UseAyahTimingResult = {
  available: false,
  timings: [],
  loading: false,
};

/**
 * Load verse timestamps for the current moshaf+surah when the reader is open.
 * `available` is false when this recitation has no mp3quran timing data.
 */
export function useAyahTiming(
  moshaf: Moshaf | null | undefined,
  surahId: number | null | undefined,
  enabled: boolean,
): UseAyahTimingResult {
  const [state, setState] = useState<UseAyahTimingResult>(EMPTY);
  const moshafId = moshaf?.id;
  const moshafServer = moshaf?.server;

  useEffect(() => {
    if (!enabled || !moshaf || !surahId) {
      setState(EMPTY);
      return;
    }

    const ac = new AbortController();
    setState({ available: false, timings: [], loading: true });

    (async () => {
      try {
        const readId = await resolveTimingReadId(moshaf, ac.signal);
        if (ac.signal.aborted) return;
        if (readId == null) {
          setState({ available: false, timings: [], loading: false });
          return;
        }
        const timings = await fetchAyahTimings(readId, surahId, ac.signal);
        if (ac.signal.aborted) return;
        setState({
          available: timings.length > 0,
          timings,
          loading: false,
        });
      } catch (err) {
        if (ac.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState({ available: false, timings: [], loading: false });
      }
    })();

    return () => ac.abort();
    // moshaf object identity is unstable — key on id + server
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, moshafId, moshafServer, surahId]);

  return state;
}

export { findAyahAt, getTimingForAyah } from '../utils/ayahTiming';
