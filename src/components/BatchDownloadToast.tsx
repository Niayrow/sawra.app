import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, CloudDownload, X } from '../icons/motion';
import { useAudio } from '../context/AudioContext';

const RING_SIZE = 52;
const RING_STROKE = 3.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const TOAST_MOTION_MS = 850;
const SCRIM_FADE_MS = 450;

type BatchSnapshot = NonNullable<ReturnType<typeof useAudio>['batchDownload']>;

/** Persistent top-right toast while a batch surah download is running */
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

  // Assombrit à chaque nouveau batch
  useEffect(() => {
    if (!batchDownload?.startedAt) return;
    setScrimMounted(true);
    // next frame so CSS transition runs
    const id = window.requestAnimationFrame(() => setScrimOn(true));
    return () => window.cancelAnimationFrame(id);
  }, [batchDownload?.startedAt]);

  // Retire l’assombrissement à la sortie de la notif
  useEffect(() => {
    if (phase === 'exit' || phase === 'hidden') setScrimOn(false);
  }, [phase]);

  useEffect(() => {
    if (scrimOn || !scrimMounted) return;
    const t = window.setTimeout(() => setScrimMounted(false), SCRIM_FADE_MS);
    return () => window.clearTimeout(t);
  }, [scrimOn, scrimMounted]);

  // Clic n’importe où → désassombrir (la notif reste)
  useEffect(() => {
    if (!scrimOn) return;
    let armed = false;
    const armTimer = window.setTimeout(() => {
      armed = true;
    }, 320);
    const dismiss = () => {
      if (!armed) return;
      setScrimOn(false);
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => {
      window.clearTimeout(armTimer);
      document.removeEventListener('pointerdown', dismiss, true);
    };
  }, [scrimOn]);

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
    <>
      {scrimMounted ? (
        <div
          className={`batch-toast-scrim${scrimOn ? ' is-on' : ''}`}
          aria-hidden
        />
      ) : null}

      {showToast && display ? (
        <div
          key={display.startedAt ?? 'batch-toast'}
          className={`${
            phase === 'exit' ? 'batch-toast-exit' : phase === 'enter' ? 'batch-toast-enter' : ''
          } pointer-events-none fixed inset-x-0 top-0 z-[80] w-full md:inset-x-auto md:right-6 md:top-6 md:w-[min(19.5rem,calc(100vw-1.5rem))]`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            className={`pointer-events-auto relative overflow-hidden border shadow-[0_20px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl rounded-none border-x-0 border-t-0 pt-[env(safe-area-inset-top)] md:rounded-[1.35rem] md:border md:pt-0 ${
              isDone
                ? 'border-[rgba(74,222,128,0.42)] bg-[linear-gradient(165deg,rgba(10,32,22,0.97),rgba(6,18,14,0.98))]'
                : 'border-[#30455c]/65 bg-[linear-gradient(165deg,rgba(16,27,42,0.97),rgba(8,15,24,0.98))]'
            }`}
          >
            <div
              className={`absolute inset-x-0 top-0 h-px ${
                isDone
                  ? 'bg-gradient-to-r from-transparent via-[#4ade80]/70 to-transparent'
                  : 'bg-gradient-to-r from-transparent via-[#e4ccb4]/50 to-transparent'
              }`}
              aria-hidden
            />

            {!isDone ? (
              <div
                className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(240,209,188,0.14)_0%,transparent_70%)]"
                aria-hidden
              />
            ) : null}

            <div className="relative flex items-center gap-3.5 px-3.5 py-3.5">
              <div className="relative h-[52px] w-[52px] shrink-0">
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
                    stroke={isDone ? '#4ade80' : '#e4ccb4'}
                    strokeWidth={RING_STROKE}
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                    className="transition-[stroke-dashoffset] duration-150 ease-out"
                  />
                </svg>
                <span
                  className={`absolute inset-[5px] flex items-center justify-center rounded-full ${
                    isDone
                      ? 'bg-[#4ade80]/18 text-[#86efac]'
                      : 'bg-[#e4ccb4]/16 text-[#f0e2d0]'
                  }`}
                >
                  {isDone ? (
                    <Check className="h-5 w-5" strokeWidth={2.6} />
                  ) : (
                    <CloudDownload className="h-5 w-5" strokeWidth={2.35} />
                  )}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={`truncate text-[13px] font-bold tracking-tight ${
                        isDone ? 'text-[#86efac]' : 'text-[#f6f8fb]'
                      }`}
                    >
                      {title}
                    </p>
                    <p
                      className={`mt-0.5 truncate text-[11px] ${
                        isDone ? 'text-[#4ade80]/80' : 'text-[#95a7ba]'
                      }`}
                    >
                      {subtitle}
                    </p>
                  </div>

                  {!alreadyUpToDate ? (
                    <span
                      className={`shrink-0 pt-0.5 text-[18px] font-black tabular-nums leading-none tracking-tight ${
                        isDone ? 'text-[#4ade80]' : 'text-[#e4ccb4]'
                      }`}
                    >
                      {percent}
                      <span className="ml-0.5 text-[11px] font-bold opacity-75">%</span>
                    </span>
                  ) : null}
                </div>

                {!alreadyUpToDate ? (
                  <div
                    className={`relative mt-2.5 h-1.5 overflow-hidden rounded-full ${
                      isDone ? 'bg-[#4ade80]/18' : 'bg-[#162538]'
                    }`}
                  >
                    <div
                      className={`absolute inset-y-0 left-0 overflow-hidden rounded-full ${
                        isDone
                          ? 'bg-gradient-to-r from-[#22c55e] to-[#4ade80]'
                          : 'bg-gradient-to-r from-[#9c6c3c] via-[#c9a06a] to-[#e4ccb4]'
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
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[#7a93ab]/40 bg-[#1b2d43]/80 px-2.5 py-1.5 text-[12px] font-bold text-[#e8eef5] transition-colors hover:border-[#95a7ba]/55 hover:bg-[#243850] tap-feedback"
                    aria-label="Arrêter le téléchargement"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                    Arrêter
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>,
    document.body
  );
};
