'use client';

import { useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioContext';
import {
  applyAppOptionsToDocument,
  getAppOptions,
  useAppOptions,
} from '../utils/appOptions';
import { setPostHogOptOut } from '../utils/posthog';

/** Applique wake lock, a11y document et sync analytics. */
export function AppOptionsEffects() {
  const [opts] = useAppOptions();
  const { playbackStatus } = useAudio();
  const playingRef = useRef(playbackStatus === 'playing');
  playingRef.current = playbackStatus === 'playing';

  useEffect(() => {
    applyAppOptionsToDocument(opts);
  }, [opts]);

  useEffect(() => {
    setPostHogOptOut(opts.analyticsOptOut);
  }, [opts.analyticsOptOut]);

  useEffect(() => {
    applyAppOptionsToDocument(getAppOptions());
  }, []);

  useEffect(() => {
    if (!opts.wakeLockWhilePlaying || playbackStatus !== 'playing') return;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let cancelled = false;
    let lock: WakeLockSentinel | null = null;

    const request = async () => {
      if (cancelled || !playingRef.current) return;
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        // Permission / battery / unsupported
      }
    };

    void request();

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && playingRef.current) {
        void request();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void lock?.release().catch(() => undefined);
    };
  }, [opts.wakeLockWhilePlaying, playbackStatus]);

  return null;
}
