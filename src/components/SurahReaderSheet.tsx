import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BookOpen, Bookmark, RefreshCw, Settings, X } from '../icons/motion';
import { useAudio } from '../context/AudioContext';
import { snippetFromAyah, useLibrary } from '../context/LibraryContext';
import { AyahNoteSheet } from './AyahNoteSheet';
import { getTimingForAyah, useAyahTiming } from '../hooks/useAyahTiming';
import { useActiveAyahForSurah } from '../hooks/useActiveAyah';
import { useQuranText } from '../hooks/useQuranText';
import type { Moshaf, Reciter, Surah } from '../types';
import { AyahPickerSheet } from './AyahPickerSheet';
import {
  READER_FONT_SCALES,
  useReaderPrefs,
  type ReaderFontScale,
} from './reader/readerPrefs';

/** Open / close motion duration — keep in sync with CSS (.player-reader-*) */
export const READER_MOTION_MS = 1100;
/** Fast dismiss when releasing after a drag */
const READER_DRAG_DISMISS_MS = 420;
/** Pause auto-scroll after the user scrolls the verse list */
const USER_SCROLL_PAUSE_MS = 2800;

const HEIGHT_FULL = 1;
const HEIGHT_COMPACT = 0.55;
/** Ignore tiny taps — only drag after this movement */
const DRAG_ACTIVATE_PX = 12;
/** px of downward drag (or velocity) that dismisses */
const DISMISS_DISTANCE = 160;
const DISMISS_VELOCITY = 0.9;

export type PlayerBarAnchor = {
  left: number;
  width: number;
  /** Distance from viewport bottom to the top edge of the player bar */
  bottom: number;
  borderRadius: string;
};

type SurahReaderSheetProps = {
  open: boolean;
  /** Parent-driven close animation flag */
  closing: boolean;
  surah: Surah;
  moshaf: Moshaf;
  reciter: Reciter;
  /** Ask parent to start closing (backdrop, Escape, X) */
  onRequestClose: () => void;
  /** Called after close animation finishes */
  onCloseComplete: () => void;
  /** Live geometry of the player bar — sheet matches its width & sits on its top edge */
  anchor: PlayerBarAnchor | null;
};

type DragSession = {
  startY: number;
  startRatio: number;
  lastY: number;
  lastT: number;
  velocity: number;
  /** true = dragging the sheet (not scrolling content) */
  active: boolean;
  fromHandle: boolean;
};

export const SurahReaderSheet: React.FC<SurahReaderSheetProps> = ({
  open,
  closing,
  surah,
  moshaf,
  reciter,
  onRequestClose,
  onCloseComplete,
  anchor,
}) => {
  const { seekTo } = useAudio();
  const { getBookmark, toggleBookmark, saveBookmarkNote, removeBookmark } = useLibrary();
  const [noteAyah, setNoteAyah] = useState<number | null>(null);
  const { ayahs, loading, error, retry } = useQuranText(open ? surah.id : null);
  const [prefs, setPrefs] = useReaderPrefs();
  const [showAyahPicker, setShowAyahPicker] = useState(false);
  const syncEnabled = open && !closing && prefs.syncHighlight;
  const timingEnabled = open && !closing;
  const { available: syncAvailable, timings } = useAyahTiming(
    moshaf,
    open ? surah.id : null,
    timingEnabled,
  );
  const { activeAyah, totalAyahs, ayahProgress } = useActiveAyahForSurah(
    moshaf,
    surah,
    timingEnabled && syncAvailable,
  );
  const highlightedAyah =
    syncEnabled && syncAvailable ? activeAyah : null;

  const [showOptions, setShowOptions] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const ayahRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const userScrollUntilRef = useRef(0);
  const programmaticScrollRef = useRef(false);

  const [heightRatio, setHeightRatio] = useState(HEIGHT_FULL);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragClosing, setDragClosing] = useState(false);
  const [entranceDone, setEntranceDone] = useState(false);
  const [handleTracking, setHandleTracking] = useState(false);
  const dragOffsetRef = useRef(0);
  const heightRatioRef = useRef(HEIGHT_FULL);
  const onCloseCompleteRef = useRef(onCloseComplete);
  const onRequestCloseRef = useRef(onRequestClose);
  onCloseCompleteRef.current = onCloseComplete;
  onRequestCloseRef.current = onRequestClose;

  useEffect(() => {
    heightRatioRef.current = heightRatio;
  }, [heightRatio]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !open) return;
    const onScroll = () => {
      if (programmaticScrollRef.current) return;
      userScrollUntilRef.current = performance.now() + USER_SCROLL_PAUSE_MS;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [open]);

  useEffect(() => {
    if (!open || highlightedAyah == null) return;
    if (performance.now() < userScrollUntilRef.current) return;
    const node = ayahRefs.current.get(highlightedAyah);
    if (!node) return;
    programmaticScrollRef.current = true;
    node.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const t = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 450);
    return () => window.clearTimeout(t);
  }, [highlightedAyah, open]);

  const onAyahClick = useCallback(
    (ayahNumber: number) => {
      if (!syncAvailable) return;
      const timing = getTimingForAyah(timings, ayahNumber);
      if (!timing) return;
      userScrollUntilRef.current = 0;
      seekTo(timing.startMs / 1000);
    },
    [seekTo, syncAvailable, timings],
  );

  useEffect(() => {
    if (!open) {
      setHeightRatio(HEIGHT_FULL);
      setDragOffset(0);
      dragOffsetRef.current = 0;
      setDragging(false);
      setDragClosing(false);
      setEntranceDone(false);
      setHandleTracking(false);
      setShowOptions(false);
      dragRef.current = null;
      userScrollUntilRef.current = 0;
      return;
    }
    if (closing) return;
    setHeightRatio(HEIGHT_FULL);
    setDragOffset(0);
    dragOffsetRef.current = 0;
    setDragging(false);
    setDragClosing(false);
    setHandleTracking(false);
    setShowOptions(false);
    setEntranceDone(false);
    scrollRef.current?.scrollTo({ top: 0 });
    const t = window.setTimeout(() => setEntranceDone(true), READER_MOTION_MS);
    return () => window.clearTimeout(t);
  }, [open, surah.id, closing]);

  // Keep close completion stable: parent re-renders (playback tick) must not
  // reset this timer or the invisible backdrop stays forever.
  useEffect(() => {
    if (!closing) return;
    const delay = dragClosing ? READER_DRAG_DISMISS_MS : READER_MOTION_MS;
    const t = window.setTimeout(() => {
      onCloseCompleteRef.current();
    }, delay);
    return () => window.clearTimeout(t);
  }, [closing, dragClosing]);

  useEffect(() => {
    if (!open || closing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onRequestCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closing]);

  const maxSheetPx = (() => {
    if (typeof window === 'undefined' || !anchor) return 420;
    const available = Math.max(220, window.innerHeight - anchor.bottom - 12);
    return Math.min(available * 0.92, window.innerHeight * 0.68, 36 * 16);
  })();

  const settleDrag = useCallback(
    (offset: number, velocity: number, startRatio: number) => {
      const shouldDismiss =
        offset >= DISMISS_DISTANCE || (velocity > DISMISS_VELOCITY && offset > 56);

      if (shouldDismiss) {
        setDragging(false);
        setHandleTracking(false);
        setDragClosing(true);
        const collapseTo = maxSheetPx * startRatio + 48;
        requestAnimationFrame(() => {
          dragOffsetRef.current = collapseTo;
          setDragOffset(collapseTo);
        });
        onRequestCloseRef.current();
        return;
      }

      setDragging(false);
      setHandleTracking(false);
      const projected = Math.max(
        HEIGHT_COMPACT,
        Math.min(HEIGHT_FULL, startRatio - offset / maxSheetPx),
      );

      let target = HEIGHT_FULL;
      if (velocity < -DISMISS_VELOCITY) {
        target = HEIGHT_FULL;
      } else if (projected < (HEIGHT_COMPACT + HEIGHT_FULL) / 2) {
        target = HEIGHT_COMPACT;
      }

      setHeightRatio(target);
      heightRatioRef.current = target;
      dragOffsetRef.current = 0;
      setDragOffset(0);
    },
    [maxSheetPx],
  );

  const onPointerDownHandle = (e: React.PointerEvent) => {
    if (closing || dragClosing) return;
    // Don't steal clicks on the close button (stopPropagation already), but
    // ignore pure taps: only arm tracking — drag starts after movement.
    dragRef.current = {
      startY: e.clientY,
      startRatio: heightRatio,
      lastY: e.clientY,
      lastT: performance.now(),
      velocity: 0,
      active: false,
      fromHandle: true,
    };
    setHandleTracking(true);
  };

  useEffect(() => {
    if (!handleTracking) return;

    const onMove = (e: PointerEvent) => {
      const session = dragRef.current;
      if (!session || closing || !session.fromHandle) return;

      const y = e.clientY;
      const dy = y - session.startY;
      const now = performance.now();
      const dt = Math.max(1, now - session.lastT);
      session.velocity = (y - session.lastY) / dt;
      session.lastY = y;
      session.lastT = now;

      if (!session.active) {
        if (Math.abs(dy) < DRAG_ACTIVATE_PX) return;
        session.active = true;
        setDragging(true);
      }

      const minOffset = -((HEIGHT_FULL - session.startRatio) * maxSheetPx);
      const maxOffset = session.startRatio * maxSheetPx * 0.95;
      const next = Math.max(minOffset, Math.min(maxOffset, dy));
      dragOffsetRef.current = next;
      setDragOffset(next);
    };

    const onUp = () => {
      const session = dragRef.current;
      dragRef.current = null;
      // Pure click / tiny movement — do nothing (no reset, no settle)
      if (!session || !session.active) {
        setDragging(false);
        setHandleTracking(false);
        dragOffsetRef.current = 0;
        setDragOffset(0);
        return;
      }
      settleDrag(dragOffsetRef.current, session.velocity, session.startRatio);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [handleTracking, closing, maxSheetPx, settleDrag]);

  if (!open || !anchor) return null;

  const rawHeight = maxSheetPx * heightRatio - dragOffset;
  const visualHeight = dragClosing
    ? Math.max(0, rawHeight)
    : Math.max(180, Math.min(maxSheetPx, rawHeight));
  const dismissProgress = Math.min(
    1,
    Math.max(0, dragOffset / Math.max(1, maxSheetPx * heightRatio * 0.85)),
  );

  const panelStyle: React.CSSProperties = {
    left: anchor.left,
    width: anchor.width,
    bottom: Math.max(0, anchor.bottom - 1),
    height: visualHeight,
    maxHeight: maxSheetPx,
    borderTopLeftRadius: anchor.borderRadius,
    borderTopRightRadius: anchor.borderRadius,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    opacity: dragClosing ? Math.max(0, 1 - dismissProgress) : undefined,
    transition: dragging
      ? 'none'
      : dragClosing
        ? `height ${READER_DRAG_DISMISS_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${READER_DRAG_DISMISS_MS}ms ease`
        : closing
          ? undefined
          : 'height 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
  };

  return (
    <>
    <div
      className="pointer-events-none fixed inset-0 z-[140]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="surah-reader-title"
    >
      <button
        type="button"
        className={`player-reader-backdrop absolute inset-0 bg-[#07111d]/68 backdrop-blur-[10px] ${
          closing || dragging || dragClosing
            ? 'pointer-events-none'
            : 'pointer-events-auto'
        } ${closing && !dragClosing ? 'is-closing' : ''} ${
          dragClosing ? 'is-drag-closing' : ''
        }`}
        style={
          dragging || dragClosing
            ? {
                opacity: Math.max(0, 1 - dismissProgress * 0.9),
                transition: dragClosing
                  ? `opacity ${READER_DRAG_DISMISS_MS}ms ease`
                  : 'none',
              }
            : undefined
        }
        aria-label="Fermer la lecture"
        onClick={() => onRequestCloseRef.current()}
        tabIndex={closing || dragging || dragClosing ? -1 : 0}
      />

      <div
        ref={panelRef}
        className={`player-reader-dock pointer-events-auto absolute z-10 flex flex-col overflow-hidden ${
          closing && !dragClosing ? 'is-closing' : ''
        } ${dragging ? 'is-dragging' : ''} ${dragClosing ? 'is-drag-closing' : ''} ${
          entranceDone && !closing ? 'is-settled' : ''
        }`}
        style={panelStyle}
      >
        <div
          className="quran-reader-header relative isolate shrink-0 touch-none select-none"
          onPointerDown={onPointerDownHandle}
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        >
          <div className="quran-reader-header__wash" aria-hidden />
          <div className="relative z-10 px-3 pt-1.5 pb-2 md:px-4">
            <div className="mb-1.5 flex justify-center">
              <span className="h-0.5 w-8 rounded-full bg-[#bfa078]/40" aria-hidden />
              <span className="sr-only">Glisser vers le bas pour redimensionner ou fermer</span>
            </div>

            <div className="flex items-center gap-2.5">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#bfa078]/28 bg-[#07111d]/55 text-[#bfa078]"
                aria-hidden
              >
                <BookOpen className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-baseline gap-2">
                  <h3
                    id="surah-reader-title"
                    className="truncate text-[0.95rem] font-black tracking-tight text-[#f6f8fb] md:text-base"
                  >
                    {surah.name}
                  </h3>
                  <p
                    className="quran-uthmani shrink-0 text-[1.05rem] leading-none text-[#e2d0ba]"
                    dir="rtl"
                    lang="ar"
                  >
                    {surah.arabicName}
                  </p>
                </div>
                <p className="mt-0.5 truncate text-[11px] font-medium text-[#7a8fa3]">
                  Sourate {surah.id}
                  {!loading && !error && ayahs.length > 0 ? (
                    <>
                      <span className="text-[#5f7388]"> · </span>
                      {ayahs.length} versets
                    </>
                  ) : null}
                  {syncAvailable && activeAyah != null && totalAyahs > 0 ? (
                    <>
                      <span className="text-[#5f7388]"> · </span>
                      <span className="tabular-nums text-[#bfa078]">
                        Verset {activeAyah} / {totalAyahs}
                      </span>
                    </>
                  ) : null}
                </p>
                {syncAvailable && ayahProgress != null && (
                  <div
                    className="mt-1.5 h-0.5 w-full max-w-[8rem] overflow-hidden rounded-full bg-[#162538]"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(ayahProgress * 100)}
                    aria-label={`Progression du verset ${activeAyah}`}
                  >
                    <div
                      className="h-full rounded-full bg-[#bfa078] transition-[width] duration-150 ease-linear"
                      style={{ width: `${Math.round(ayahProgress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {syncAvailable && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAyahPicker(true);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    disabled={closing}
                    className="flex h-8 items-center justify-center rounded-full border border-[#46607b]/45 bg-[#0a1420]/80 px-2.5 text-[10px] font-bold text-[#aab7c5] hover:border-[#bfa078]/35 hover:text-[#f6f8fb] disabled:opacity-50"
                    aria-label="Aller au verset"
                    title="Aller au verset"
                  >
                    #{activeAyah ?? '…'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOptions((v) => !v);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  disabled={closing}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border bg-[#0a1420]/80 disabled:opacity-50 ${
                    showOptions
                      ? 'border-[#bfa078]/45 text-[#e2d0ba]'
                      : 'border-[#46607b]/45 text-[#aab7c5] hover:border-[#bfa078]/35 hover:text-[#f6f8fb]'
                  }`}
                  aria-label="Options de lecture"
                  aria-expanded={showOptions}
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOptions(false);
                    onRequestClose();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  disabled={closing}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#46607b]/45 bg-[#0a1420]/80 text-[#aab7c5] hover:border-[#bfa078]/35 hover:text-[#f6f8fb] disabled:opacity-50"
                  aria-label="Fermer la lecture"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div
            className={`quran-reader-options-wrap ${showOptions ? 'is-open' : ''}`}
            aria-hidden={!showOptions}
          >
            <div className="quran-reader-options-clip">
              <div
                className="quran-reader-options relative z-20 border-t border-[#bfa078]/12 px-3 pb-3 pt-2.5 md:px-4"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#bfa078]/90">
                  Options de lecture
                </p>

                <div className="mb-3">
                  <p className="mb-1.5 text-[11px] font-semibold text-[#aab7c5]">Taille du texte</p>
                  <div className="flex items-center gap-1.5">
                    {READER_FONT_SCALES.map((scale) => (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => setPrefs({ fontScale: scale as ReaderFontScale })}
                        className={`flex h-8 flex-1 items-center justify-center rounded-xl border text-sm font-bold tap-feedback ${
                          prefs.fontScale === scale
                            ? 'border-[#bfa078]/45 bg-[#bfa078]/15 text-[#e2d0ba]'
                            : 'border-[#30455c] bg-[#07111d]/55 text-[#aab7c5]'
                        }`}
                        aria-pressed={prefs.fontScale === scale}
                        tabIndex={showOptions ? 0 : -1}
                      >
                        <span style={{ fontSize: `${0.75 + (scale - 0.9) * 0.55}rem` }}>A</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-3 space-y-1.5">
                  <p className="mb-1.5 text-[11px] font-semibold text-[#aab7c5]">Affichage</p>
                  {(
                    [
                      { key: 'showArabic' as const, label: 'Texte arabe' },
                      { key: 'showPhonetic' as const, label: 'Phonétique' },
                      { key: 'showFrench' as const, label: 'Traduction française' },
                    ] as const
                  ).map((row) => (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() => setPrefs({ [row.key]: !prefs[row.key] })}
                      className={`flex w-full items-center justify-center rounded-xl border px-3 py-2.5 text-center text-[12px] font-semibold tap-feedback ${
                        prefs[row.key]
                          ? 'border-[#bfa078]/45 bg-[#bfa078]/15 text-[#e2d0ba]'
                          : 'border-[#30455c] bg-[#07111d]/55 text-[#aab7c5]'
                      }`}
                      aria-pressed={prefs[row.key]}
                      tabIndex={showOptions ? 0 : -1}
                    >
                      {row.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPrefs({ autoOpenOnPlay: !prefs.autoOpenOnPlay })}
                  className={`mb-1.5 flex w-full items-center justify-center rounded-xl border px-3 py-2.5 text-center text-[12px] font-semibold leading-snug tap-feedback ${
                    prefs.autoOpenOnPlay
                      ? 'border-[#bfa078]/45 bg-[#bfa078]/15 text-[#e2d0ba]'
                      : 'border-[#30455c] bg-[#07111d]/55 text-[#aab7c5]'
                  }`}
                  aria-pressed={prefs.autoOpenOnPlay}
                  tabIndex={showOptions ? 0 : -1}
                >
                  Ouvrir auto au lancement d’une sourate
                </button>

                <button
                  type="button"
                  onClick={() => setPrefs({ syncHighlight: !prefs.syncHighlight })}
                  className={`flex w-full items-center justify-center rounded-xl border px-3 py-2.5 text-center text-[12px] font-semibold leading-snug tap-feedback ${
                    prefs.syncHighlight
                      ? 'border-[#bfa078]/45 bg-[#bfa078]/15 text-[#e2d0ba]'
                      : 'border-[#30455c] bg-[#07111d]/55 text-[#aab7c5]'
                  }`}
                  aria-pressed={prefs.syncHighlight}
                  tabIndex={showOptions ? 0 : -1}
                >
                  Illuminer le verset en cours
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="quran-reader-scroll relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3 md:px-5"
          style={{ ['--reader-font-scale' as string]: String(prefs.fontScale) }}
        >
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-[#aab7c5]">
              <RefreshCw className="h-6 w-6 animate-spin text-[#bfa078]" />
              <p className="text-sm">Chargement du texte…</p>
            </div>
          )}

          {error && !loading && (
            <div className="mx-auto max-w-sm rounded-2xl border border-[#30455c] bg-[#111d2d]/80 px-5 py-8 text-center">
              <p className="text-sm text-[#f08c8c]">{error}</p>
              <p className="mt-2 text-xs text-[#8899ad]">
                Vérifiez votre connexion, puis réessayez.
              </p>
              <button
                type="button"
                onClick={retry}
                className="brand-button-primary mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold tap-feedback"
              >
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </button>
            </div>
          )}

          {!loading && !error && ayahs.length > 0 && (
            <ol className="quran-ayah-list space-y-4 pb-3">
              {ayahs.map((ayah) => {
                const isActive = highlightedAyah === ayah.number;
                const canSeek = syncAvailable;
                return (
                  <li
                    key={ayah.key}
                    ref={(node) => {
                      if (node) ayahRefs.current.set(ayah.number, node);
                      else ayahRefs.current.delete(ayah.number);
                    }}
                    className={`quran-ayah-card ${isActive ? 'is-active' : ''} ${
                      canSeek ? 'is-seekable' : ''
                    }`}
                    onClick={canSeek ? () => onAyahClick(ayah.number) : undefined}
                    onKeyDown={
                      canSeek
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onAyahClick(ayah.number);
                            }
                          }
                        : undefined
                    }
                    role={canSeek ? 'button' : undefined}
                    tabIndex={canSeek ? 0 : undefined}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <div className="quran-ayah-card__glow" aria-hidden />
                    <div className="quran-ayah-card__rail" aria-hidden />

                    <div className="relative z-10 mb-3 flex items-center justify-between gap-2">
                      <span className="quran-ayah-badge" aria-label={`Verset ${ayah.number}`}>
                        <span className="quran-ayah-badge__ring" aria-hidden />
                        <span className="relative z-10 tabular-nums">{ayah.number}</span>
                      </span>
                      <button
                        type="button"
                        data-ayah-bookmark
                        onClick={(e) => {
                          e.stopPropagation();
                          const existing = getBookmark(surah.id, ayah.number);
                          if (existing) {
                            setNoteAyah(ayah.number);
                            return;
                          }
                          toggleBookmark({
                            surahId: surah.id,
                            ayah: ayah.number,
                            reciterId: reciter.id,
                            moshafId: moshaf.id,
                            ...snippetFromAyah(ayah),
                          });
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border tap-feedback ${
                          getBookmark(surah.id, ayah.number)
                            ? 'border-[#bfa078]/45 bg-[#e2d0ba]/15 text-[#e2d0ba]'
                            : 'border-[#46607b]/45 bg-[#0a1420]/80 text-[#aab7c5] hover:text-[#e2d0ba]'
                        }`}
                        aria-label={
                          getBookmark(surah.id, ayah.number)
                            ? `Note du verset ${ayah.number}`
                            : `Signer le verset ${ayah.number}`
                        }
                        aria-pressed={Boolean(getBookmark(surah.id, ayah.number))}
                      >
                        <Bookmark
                          className={`h-3.5 w-3.5 ${getBookmark(surah.id, ayah.number) ? 'fill-current' : ''}`}
                        />
                      </button>
                    </div>

                    {prefs.showArabic && (
                      <p
                        className="quran-ayah-arabic quran-uthmani relative z-10"
                        dir="rtl"
                        lang="ar"
                      >
                        {ayah.textUthmani}
                      </p>
                    )}

                    {prefs.showPhonetic && ayah.phonetic ? (
                      <p
                        className="quran-ayah-phonetic relative z-10"
                        dir="ltr"
                        lang="en"
                      >
                        {ayah.phonetic}
                      </p>
                    ) : null}

                    {prefs.showFrench && ayah.translationFr ? (
                      <div className="quran-ayah-translation relative z-10">
                        <p dir="ltr" lang="fr">
                          {ayah.translationFr}
                        </p>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>

    <AyahPickerSheet
      open={showAyahPicker}
      onClose={() => setShowAyahPicker(false)}
      surah={surah}
      moshaf={moshaf}
      reciter={reciter}
    />
    <AyahNoteSheet
      open={noteAyah != null}
      bookmark={noteAyah != null ? getBookmark(surah.id, noteAyah) ?? null : null}
      onClose={() => setNoteAyah(null)}
      onSave={(note) => {
        if (noteAyah == null) return;
        saveBookmarkNote(surah.id, noteAyah, note);
      }}
      onDelete={() => {
        if (noteAyah == null) return;
        removeBookmark(surah.id, noteAyah);
      }}
    />
    </>
  );
};

/** Measure the player bar so the reader can match its exact box. */
export function usePlayerBarAnchor(
  barRef: React.RefObject<HTMLElement | null>,
  active: boolean,
  options: {
    /** Force top radius (avoids 0 when the bar is visually joined) */
    topRadius?: string;
    deps?: unknown[];
  } = {},
): PlayerBarAnchor | null {
  const { topRadius, deps = [] } = options;
  const [anchor, setAnchor] = useState<PlayerBarAnchor | null>(null);

  useLayoutEffect(() => {
    if (!active) {
      setAnchor(null);
      return;
    }
    const el = barRef.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      const measured = cs.borderTopLeftRadius || '0px';
      setAnchor({
        left: r.left,
        width: r.width,
        bottom: Math.max(0, window.innerHeight - r.top),
        borderRadius: topRadius ?? measured,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, barRef, topRadius, ...deps]);

  return anchor;
}

export default SurahReaderSheet;
