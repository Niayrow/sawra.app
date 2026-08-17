import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, CloudDownload, X } from '../icons/motion';
import { useAudio } from '../context/AudioContext';

const RING_SIZE = 64;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const TOAST_MOTION_MS = 320;
const SCRIM_FADE_MS = 280;

type BatchSnapshot = NonNullable<ReturnType<typeof useAudio>['batchDownload']>;

/** Modal centré pendant un téléchargement de sourates — bloque scroll & interactions. */
export const BatchDownloadToast: React.FC = () => {
  const { batchDownload, cancelBatchDownload } = useAudio();

  const [snapshot, setSnapshot] = useState<BatchSnapshot | null>(null);
  const [phase, setPhase] = useState<'hidden' | 'enter' | 'shown' | 'exit'>('hidden');
  const [scrimOn, setScrimOn] = useState(false);
  const [scrimMounted, setScrimMounted] = useState(false);
  const exitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (batchDownload) {
      if (exitTimerRef.current != null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setSnapshot(batchDownload);
      setPhase((prev) => (prev === 'hidden' || prev === 'exit' ? 'enter' : prev === 'enter' ? 'enter' : 'shown'));
      return;
    }

    setPhase((prev) => {
      if (prev === 'hidden' || prev === 'exit') return prev;
      return 'exit';
    });
  }, [batchDownload]);

  useEffect(() => {
    if (batchDownload) setSnapshot(batchDownload);
  }, [batchDownload]);

  useEffect(() => {
    if (!batchDownload?.startedAt) return;
    setScrimMounted(true);
    const id = window.requestAnimationFrame(() => setScrimOn(true));
    return () => window.cancelAnimationFrame(id);
  }, [batchDownload?.startedAt]);

  useEffect(() => {
    if (phase === 'exit' || phase === 'hidden') setScrimOn(false);
  }, [phase]);

  useEffect(() => {
    if (scrimOn || !scrimMounted) return;
    const t = window.setTimeout(() => setScrimMounted(false), SCRIM_FADE_MS);
    return () => window.clearTimeout(t);
  }, [scrimOn, scrimMounted]);

  useEffect(() => {
    if (phase !== 'enter') return;
    const t = window.setTimeout(() => setPhase('shown'), TOAST_MOTION_MS);
    return () => window.clearTimeout(t);
  }, [phase, snapshot?.startedAt]);

  useEffect(() => {
    if (phase !== 'exit') return;
    exitTimerRef.current = window.setTimeout(() => {
      setSnapshot(null);
      setPhase('hidden');
      exitTimerRef.current = null;
    }, TOAST_MOTION_MS);
    return () => {
      if (exitTimerRef.current != null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [phase]);

  const locking = phase === 'enter' || phase === 'shown' || (phase === 'exit' && scrimMounted);

  // Bloque scroll + interactions derrière le modal
  useEffect(() => {
    if (!locking) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyTouch = body.style.touchAction;
    const prevPaddingRight = body.style.paddingRight;
    const scrollbarGap = window.innerWidth - html.clientWidth;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    if (scrollbarGap > 0) body.style.paddingRight = `${scrollbarGap}px`;

    const preventScroll = (event: Event) => {
      event.preventDefault();
    };

    document.addEventListener('wheel', preventScroll, { passive: false, capture: true });
    document.addEventListener('touchmove', preventScroll, { passive: false, capture: true });

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevBodyTouch;
      body.style.paddingRight = prevPaddingRight;
      document.removeEventListener('wheel', preventScroll, true);
      document.removeEventListener('touchmove', preventScroll, true);
    };
  }, [locking]);

  const display = batchDownload ?? snapshot;

  const rawPercent = useMemo(() => {
    if (!display || display.total <= 0) return 100;
    const { done, total, active, fileProgress } = display;
    if (!active) return 100;
    const file = Math.min(100, Math.max(0, fileProgress)) / 100;
    return Math.min(100, ((done + file) / total) * 100);
  }, [display]);

  const [smoothPercent, setSmoothPercent] = useState(0);
  const peakRef = useRef(0);
  const targetRef = useRef(0);
  const batchKeyRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const key = display?.startedAt;
    if (key !== batchKeyRef.current) {
      batchKeyRef.current = key;
      peakRef.current = 0;
      targetRef.current = 0;
      setSmoothPercent(0);
    }
  }, [display?.startedAt]);

  useEffect(() => {
    targetRef.current = rawPercent;
    peakRef.current = Math.max(peakRef.current, rawPercent);
  }, [rawPercent]);

  useEffect(() => {
    if (!display || phase === 'hidden' || phase === 'exit') return;

    if (!display.active) {
      peakRef.current = 100;
      targetRef.current = 100;
      setSmoothPercent(100);
      return;
    }

    let raf = 0;
    const tick = () => {
      const goal = Math.max(peakRef.current, targetRef.current);
      setSmoothPercent((prev) => {
        if (goal <= prev) return prev;
        const delta = goal - prev;
        const step = Math.max(0.12, delta * 0.2);
        return Math.min(goal, prev + step);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [display?.active, display?.startedAt, phase]);

  const showToast = Boolean(display && phase !== 'hidden');
  if (!showToast && !scrimMounted) return null;

  const { done, total, active, reciterName, currentSurahName } = display ?? {
    done: 0,
    total: 0,
    active: false,
    reciterName: '',
    fileProgress: 0,
    currentSurahName: undefined,
  };
  const isDone = !active;
  const alreadyUpToDate = isDone && total === 0;
  const percent = isDone ? 100 : Math.min(100, Math.round(smoothPercent));
  const barWidth = isDone ? 100 : Math.min(100, smoothPercent);
  const ringOffset = RING_CIRCUMFERENCE * (1 - barWidth / 100);
  const isExiting = phase === 'exit';

  const title = alreadyUpToDate
    ? 'Déjà à jour'
    : isDone
      ? done < total && total > 0
        ? 'Téléchargement arrêté'
        : 'Téléchargement terminé'
      : 'Téléchargement en cours';

  const subtitle = alreadyUpToDate
    ? reciterName || 'Récitateur'
    : isDone
      ? `${reciterName || 'Récitateur'}${total > 0 ? ` · ${done} / ${total}` : ''}`
      : currentSurahName
        ? `${currentSurahName} · ${done + 1} / ${total}`
        : `${reciterName || 'Récitateur'} · ${done} / ${total}`;

  return createPortal(
    <div
      className="batch-download-layer fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-download-title"
      data-batch-download-modal
    >
      {scrimMounted ? (
        <div
          className={`batch-toast-scrim${scrimOn ? ' is-on' : ''}`}
          aria-hidden
        />
      ) : null}

      {showToast && display ? (
        <div
          key={display.startedAt ?? 'batch-toast'}
          className={`batch-download-panel relative z-[1] w-full max-w-[22rem] ${
            phase === 'exit' ? 'batch-toast-exit' : phase === 'enter' ? 'batch-toast-enter' : ''
          }`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            className={`relative overflow-hidden rounded-[1.5rem] border shadow-[0_28px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl ${
              isDone
                ? 'border-[rgba(74,222,128,0.42)] bg-[linear-gradient(165deg,rgba(10,32,22,0.98),rgba(6,18,14,0.99))]'
                : 'border-[#30455c]/70 bg-[linear-gradient(165deg,rgba(16,27,42,0.98),rgba(8,15,24,0.99))]'
            }`}
          >
            <div
              className={`absolute inset-x-0 top-0 h-px ${
                isDone
                  ? 'bg-gradient-to-r from-transparent via-[#4ade80]/70 to-transparent'
                  : 'bg-gradient-to-r from-transparent via-[#e2d0ba]/50 to-transparent'
              }`}
              aria-hidden
            />

            {!isDone ? (
              <div
                className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(241,232,220,0.16)_0%,transparent_70%)]"
                aria-hidden
              />
            ) : null}

            <div className="relative flex flex-col items-center gap-4 px-5 pb-5 pt-6 text-center">
              <div className="relative h-16 w-16 shrink-0">
                <svg
                  width={RING_SIZE}
                  height={RING_SIZE}
                  viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                  className="absolute inset-0 -rotate-90"
                  aria-hidden
                >
                  <circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    fill="none"
                    stroke={isDone ? 'rgba(74,222,128,0.22)' : 'rgba(70,96,123,0.45)'}
                    strokeWidth={RING_STROKE}
                  />
                  <circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    fill="none"
                    stroke={isDone ? '#4ade80' : '#e2d0ba'}
                    strokeWidth={RING_STROKE}
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                    className="transition-[stroke-dashoffset] duration-150 ease-out"
                  />
                </svg>
                <span
                  className={`absolute inset-[6px] flex items-center justify-center rounded-full ${
                    isDone
                      ? 'bg-[#4ade80]/18 text-[#86efac]'
                      : 'bg-[#e2d0ba]/16 text-[#f1e8dc]'
                  }`}
                >
                  {isDone ? (
                    <Check className="h-6 w-6" strokeWidth={2.6} />
                  ) : (
                    <CloudDownload className="h-6 w-6" strokeWidth={2.35} />
                  )}
                </span>
              </div>

              <div className="w-full min-w-0">
                <p
                  id="batch-download-title"
                  className={`text-[1.05rem] font-black tracking-tight ${
                    isDone ? 'text-[#86efac]' : 'text-[#f6f8fb]'
                  }`}
                >
                  {title}
                </p>
                <p
                  className={`mt-1 truncate text-[12px] ${
                    isDone ? 'text-[#4ade80]/85' : 'text-[#95a7ba]'
                  }`}
                >
                  {subtitle}
                </p>

                {!alreadyUpToDate ? (
                  <p
                    className={`mt-3 text-[1.75rem] font-black tabular-nums leading-none tracking-tight ${
                      isDone ? 'text-[#4ade80]' : 'text-[#e2d0ba]'
                    }`}
                  >
                    {percent}
                    <span className="ml-0.5 text-[13px] font-bold opacity-75">%</span>
                  </p>
                ) : null}

                {!alreadyUpToDate ? (
                  <div
                    className={`relative mt-4 h-2 overflow-hidden rounded-full ${
                      isDone ? 'bg-[#4ade80]/18' : 'bg-[#162538]'
                    }`}
                  >
                    <div
                      className={`absolute inset-y-0 left-0 overflow-hidden rounded-full ${
                        isDone
                          ? 'bg-gradient-to-r from-[#22c55e] to-[#4ade80]'
                          : 'bg-gradient-to-r from-[#8a7350] via-[#bfa078] to-[#e2d0ba]'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    >
                      {!isDone ? (
                        <span
                          className="batch-toast-bar-sheen absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {active && !isExiting ? (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      cancelBatchDownload();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      cancelBatchDownload();
                    }}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#7a93ab]/40 bg-[#1b2d43]/90 px-4 text-[13px] font-bold text-[#e8eef5] transition-colors hover:border-[#95a7ba]/55 hover:bg-[#243850] tap-feedback"
                    aria-label="Arrêter le téléchargement"
                  >
                    <X className="h-4 w-4" strokeWidth={2.4} />
                    Arrêter
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body
  );
};
