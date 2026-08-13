import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type QuizClipStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

type ClipSource = {
  audioUrl: string;
  startMs: number;
  endMs: number;
} | null;

/**
 * Isolated ayah clip player for the quiz — does not touch the global track.
 * Call `onBeforePlay` to pause the app player before starting a clip.
 */
export function useQuizAyahClip(onBeforePlay?: () => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const endMsRef = useRef(0);
  const startMsRef = useRef(0);
  const clipKeyRef = useRef('');
  const [status, setStatus] = useState<QuizClipStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setStatus((s) => (s === 'idle' ? s : 'paused'));
  }, []);

  const unload = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    clipKeyRef.current = '';
    setStatus('idle');
    setError(null);
  }, []);

  const playFromStart = useCallback(async () => {
    const audio = ensureAudio();
    if (!audio.src) return;

    onBeforePlay?.();
    setError(null);
    setStatus('loading');

    try {
      const startSec = startMsRef.current / 1000;
      if (Math.abs(audio.currentTime - startSec) > 0.15) {
        audio.currentTime = startSec;
      }
      await audio.play();
      setStatus('playing');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setStatus('error');
      setError('Lecture impossible. Vérifiez votre connexion.');
    }
  }, [ensureAudio, onBeforePlay]);

  const loadClip = useCallback(
    async (clip: ClipSource, autoplay = true) => {
      if (!clip) {
        unload();
        return;
      }

      const key = `${clip.audioUrl}#${clip.startMs}-${clip.endMs}`;
      const audio = ensureAudio();
      startMsRef.current = clip.startMs;
      endMsRef.current = clip.endMs;

      const sameSource = clipKeyRef.current === key;
      clipKeyRef.current = key;

      if (!sameSource) {
        setStatus('loading');
        setError(null);
        audio.pause();
        audio.src = clip.audioUrl;
        audio.load();

        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error('Audio unavailable'));
          };
          const cleanup = () => {
            audio.removeEventListener('canplaythrough', onReady);
            audio.removeEventListener('loadeddata', onReady);
            audio.removeEventListener('error', onError);
          };
          if (audio.readyState >= 2) {
            resolve();
            return;
          }
          audio.addEventListener('canplaythrough', onReady, { once: true });
          audio.addEventListener('loadeddata', onReady, { once: true });
          audio.addEventListener('error', onError, { once: true });
        }).catch(() => {
          setStatus('error');
          setError('Audio indisponible pour ce verset.');
          throw new Error('Audio unavailable');
        });
      }

      audio.currentTime = clip.startMs / 1000;
      if (autoplay) {
        await playFromStart();
      } else {
        setStatus('paused');
      }
    },
    [ensureAudio, playFromStart, unload],
  );

  const toggle = useCallback(async () => {
    const audio = ensureAudio();
    if (status === 'playing') {
      audio.pause();
      setStatus('paused');
      return;
    }
    if (status === 'ended' || status === 'paused' || status === 'idle') {
      if (status === 'ended') {
        audio.currentTime = startMsRef.current / 1000;
      }
      await playFromStart();
    }
  }, [ensureAudio, playFromStart, status]);

  const replay = useCallback(async () => {
    const audio = ensureAudio();
    if (!audio.src) return;
    audio.pause();
    audio.currentTime = startMsRef.current / 1000;
    await playFromStart();
  }, [ensureAudio, playFromStart]);

  useEffect(() => {
    const audio = ensureAudio();

    const onTimeUpdate = () => {
      if (audio.paused) return;
      const endSec = endMsRef.current / 1000;
      if (endSec > 0 && audio.currentTime >= endSec - 0.04) {
        audio.pause();
        audio.currentTime = endSec;
        setStatus('ended');
      }
    };

    const onPlaying = () => setStatus('playing');
    const onWaiting = () => setStatus('loading');
    const onPause = () => {
      setStatus((s) => (s === 'ended' ? s : 'paused'));
    };
    const onError = () => {
      setStatus('error');
      setError('Erreur de lecture audio.');
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, [ensureAudio]);

  return useMemo(
    () => ({
      status,
      error,
      loadClip,
      toggle,
      replay,
      stop,
      unload,
      isPlaying: status === 'playing',
      isLoading: status === 'loading',
    }),
    [status, error, loadClip, toggle, replay, stop, unload],
  );
}
