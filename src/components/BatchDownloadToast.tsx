import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, CloudDownload, X } from '../icons/motion';
import { useAudio } from '../context/AudioContext';

const RING_SIZE = 36;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const TOAST_ENTER_MS = 520;
const TOAST_EXIT_MS = 420;

type BatchSnapshot = NonNullable<ReturnType<typeof useAudio>['batchDownload']>;

/** Toast non bloquant en haut de l’écran pendant un téléchargement de sourates. */
export const BatchDownloadToast: React.FC = () => {
  const { batchDownload, cancelBatchDownload } = useAudio();

  const [snapshot, setSnapshot] = useState<BatchSnapshot | null>(null);
  const [phase, setPhase] = useState<'hidden' | 'enter' | 'shown' | 'exit'>('hidden');
  const exitTimerRef = useRef<number | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);

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
    if (phase !== 'enter') return;
    const t = window.setTimeout(() => setPhase('shown'), TOAST_ENTER_MS);
    return () => window.clearTimeout(t);
  }, [phase, snapshot?.startedAt]);

  useEffect(() => {
    if (phase !== 'exit') return;
    exitTimerRef.current = window.setTimeout(() => {
      setSnapshot(null);
      setPhase('hidden');
      exitTimerRef.current = null;
    }, TOAST_EXIT_MS);
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

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!showToast || phase === 'exit') {
      root.removeAttribute('data-batch-download-banner');
      if (!showToast) root.style.removeProperty('--batch-download-banner-h');
      return;
    }

    const node = layerRef.current;
    if (!node) return;

    const sync = () => {
      root.style.setProperty('--batch-download-banner-h', `${node.offsetHeight}px`);
      root.setAttribute('data-batch-download-banner', '');
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [showToast, phase]);

  if (!showToast || !display) return null;

  const { done, total, active, reciterName, currentSurahName } = display;
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
      ref={layerRef}
      className="batch-download-layer pointer-events-none fixed inset-x-0 top-0 z-[100]"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-labelledby="batch-download-title"
    >
      <div
        key={display.startedAt ?? 'batch-toast'}
        className={`batch-download-panel pointer-events-auto w-full ${
          phase === 'exit' ? 'batch-toast-exit' : phase === 'enter' ? 'batch-toast-enter' : ''
        }`}
      >
        <div
          className={`relative overflow-hidden border-b backdrop-blur-xl ${
            isDone
              ? 'border-[rgba(74,222,128,0.42)] bg-[linear-gradient(180deg,rgba(10,32,22,0.98),rgba(6,18,14,0.99))]'
              : 'border-[#30455c]/70 bg-[linear-gradient(180deg,rgba(16,27,42,0.98),rgba(8,15,24,0.99))]'
          }`}
        >
          <div className="relative flex items-center gap-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] sm:pl-[max(1rem,env(safe-area-inset-left,0px))] sm:pr-[max(1rem,env(safe-area-inset-right,0px))]">
            <div className="relative h-9 w-9 shrink-0">
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
                className={`absolute inset-[5px] flex items-center justify-center rounded-full ${
                  isDone
                    ? 'bg-[#4ade80]/18 text-[#86efac]'
                    : 'bg-[#e2d0ba]/16 text-[#f1e8dc]'
                }`}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
                ) : (
                  <CloudDownload className="h-3.5 w-3.5" strokeWidth={2.35} />
                )}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p
                  id="batch-download-title"
                  className={`truncate text-[13px] font-black tracking-tight ${
                    isDone ? 'text-[#86efac]' : 'text-[#f6f8fb]'
                  }`}
                >
                  {title}
                </p>
                {!alreadyUpToDate ? (
                  <p
                    className={`shrink-0 text-[1.15rem] font-black tabular-nums leading-none ${
                      isDone ? 'text-[#4ade80]' : 'text-[#e2d0ba]'
                    }`}
                  >
                    {percent}
                    <span className="ml-0.5 text-[12px] font-bold opacity-75">%</span>
                  </p>
                ) : null}
              </div>
              <p
                className={`mt-0.5 truncate text-[11px] ${
                  isDone ? 'text-[#4ade80]/85' : 'text-[#95a7ba]'
                }`}
              >
                {subtitle}
              </p>
            </div>

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
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-[#7a93ab]/40 bg-[#1b2d43]/90 px-2.5 text-[11px] font-bold text-[#e8eef5] transition-colors hover:border-[#95a7ba]/55 hover:bg-[#243850] tap-feedback"
                aria-label="Arrêter le téléchargement"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                Arrêter
              </button>
            ) : null}
          </div>

          {!alreadyUpToDate ? (
            <div
              className={`relative h-0.5 overflow-hidden ${
                isDone ? 'bg-[#4ade80]/18' : 'bg-[#162538]'
              }`}
            >
              <div
                className={`absolute inset-y-0 left-0 overflow-hidden ${
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
        </div>
      </div>
    </div>,
    document.body
  );
};
