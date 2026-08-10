import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAudio } from '../context/AudioContext';
import type { Surah } from '../types';
import {
  Search, Play, Pause, Disc, CloudDownload, CloudCheck,
  Repeat1, Repeat, X, Trash2, Check,
} from '../icons/motion';
import { getAudioUrl } from '../utils/audioUrl';
import { getSurahSuggestions, scoreSurahMatch } from '../utils/surahSearch';

interface SurahListProps {
  onChooseReciter?: () => void;
}

const LONG_PRESS_MS = 480;
const SWIPE_LOCK_PX = 8;
const SWIPE_MAX_RATIO = 0.45;
const SWIPE_TRIGGER_RATIO = 0.28;
const SWIPE_SNAP_MS = 320;

const clampSwipe = (dx: number, max: number) =>
  Math.max(-max, Math.min(max, dx));

export const SurahList: React.FC<SurahListProps> = ({ onChooseReciter }) => {
  const {
    activeReciter,
    activeMoshaf,
    getAvailableSurahs,
    currentTrack,
    playbackStatus,
    playTrack,
    togglePlay,
    repeatMode,
    setRepeatMode,
    selectedSurahIds,
    setSelectedSurahIds,
    cachedUrls,
    downloadProgress,
    downloadSurah,
    downloadSurahs,
    downloadAllSurahs,
    deleteAllSurahs,
    batchDownload,
    deleteSurah,
  } = useAudio();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(() => new Set());
  const deferredQuery = useDeferredValue(searchQuery);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const suppressClickRef = useRef(false);

  const availableSurahs = useMemo(() => {
    return getAvailableSurahs(activeReciter, activeMoshaf);
  }, [activeReciter, activeMoshaf, getAvailableSurahs]);

  const offlineOnlySurahs = useMemo(() => {
    if (!activeMoshaf || typeof navigator === 'undefined' || navigator.onLine) {
      return availableSurahs;
    }
    return availableSurahs.filter((surah) => cachedUrls.has(getAudioUrl(activeMoshaf, surah)));
  }, [activeMoshaf, availableSurahs, cachedUrls]);

  const suggestions = useMemo(
    () => getSurahSuggestions(offlineOnlySurahs, deferredQuery, 8),
    [offlineOnlySurahs, deferredQuery]
  );

  const showSuggestions = searchFocused && deferredQuery.trim().length > 0 && suggestions.length > 0;

  const filteredSurahs = useMemo(() => {
    if (!deferredQuery.trim()) return offlineOnlySurahs;
    return offlineOnlySurahs
      .map((surah) => ({ surah, score: scoreSurahMatch(surah, deferredQuery) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.surah.id - b.surah.id)
      .map((item) => item.surah);
  }, [offlineOnlySurahs, deferredQuery]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [deferredQuery]);

  useEffect(() => {
    setSelectMode(false);
    setCheckedIds(new Set());
  }, [activeReciter?.id, activeMoshaf?.id]);

  useEffect(() => {
    if (!showDeleteAllModal) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowDeleteAllModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showDeleteAllModal]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target || !searchWrapRef.current?.contains(target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, []);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setCheckedIds(new Set());
  };

  const enterSelectMode = (surahId: number) => {
    setSelectMode(true);
    setCheckedIds(new Set([surahId]));
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // ignore
      }
    }
  };

  const toggleChecked = (surahId: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(surahId)) next.delete(surahId);
      else next.add(surahId);
      return next;
    });
  };

  useEffect(() => {
    if (!selectMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exitSelectMode();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectMode]);

  const selectSuggestion = (surah: Surah) => {
    setSearchQuery('');
    setSearchFocused(false);
    if (activeReciter && activeMoshaf) {
      playTrack(activeReciter, activeMoshaf, surah);
    }
    requestAnimationFrame(() => {
      document.getElementById(`surah-row-${surah.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  };

  const playlistActive = selectedSurahIds.size > 0;

  const offlineReadyCount = useMemo(() => {
    if (!activeMoshaf) return 0;
    return availableSurahs.reduce((count, surah) => {
      const url = getAudioUrl(activeMoshaf, surah);
      return cachedUrls.has(url) ? count + 1 : count;
    }, 0);
  }, [activeMoshaf, availableSurahs, cachedUrls]);

  const allOffline = availableSurahs.length > 0 && offlineReadyCount === availableSurahs.length;


  const toggleInLoop = (id: number) => {
    setSelectedSurahIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePlay = (surah: Surah) => {
    if (!activeReciter || !activeMoshaf) return;
    const isCurrent =
      currentTrack?.surah.id === surah.id &&
      currentTrack?.reciter.id === activeReciter.id &&
      currentTrack?.moshaf.id === activeMoshaf.id;
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(activeReciter, activeMoshaf, surah);
    }
  };

  const applyLoopFromSelection = () => {
    if (checkedIds.size === 0) return;
    setSelectedSurahIds(new Set(checkedIds));
    exitSelectMode();
  };

  const downloadFromSelection = () => {
    if (!activeReciter || !activeMoshaf || checkedIds.size === 0) return;
    const toDownload = availableSurahs.filter(
      (surah) => checkedIds.has(surah.id) && !cachedUrls.has(getAudioUrl(activeMoshaf, surah))
    );
    exitSelectMode();
    if (toDownload.length === 0) return;
    void downloadSurahs(activeReciter, activeMoshaf, toDownload);
  };

  const deleteFromSelection = () => {
    if (!activeReciter || !activeMoshaf || checkedIds.size === 0) return;
    const toDelete = availableSurahs.filter(
      (surah) => checkedIds.has(surah.id) && cachedUrls.has(getAudioUrl(activeMoshaf, surah))
    );
    exitSelectMode();
    if (toDelete.length === 0) return;
    void (async () => {
      for (const surah of toDelete) {
        await deleteSurah(activeReciter, activeMoshaf, surah);
      }
    })();
  };

  const selectionDownloadCount = useMemo(() => {
    if (!activeMoshaf || checkedIds.size === 0) return 0;
    return availableSurahs.reduce((count, surah) => {
      if (!checkedIds.has(surah.id)) return count;
      return cachedUrls.has(getAudioUrl(activeMoshaf, surah)) ? count : count + 1;
    }, 0);
  }, [activeMoshaf, availableSurahs, cachedUrls, checkedIds]);

  const selectionDeleteCount = useMemo(() => {
    if (!activeMoshaf || checkedIds.size === 0) return 0;
    return availableSurahs.reduce((count, surah) => {
      if (!checkedIds.has(surah.id)) return count;
      return cachedUrls.has(getAudioUrl(activeMoshaf, surah)) ? count + 1 : count;
    }, 0);
  }, [activeMoshaf, availableSurahs, cachedUrls, checkedIds]);

  const touchStartYRef = useRef<number | null>(null);
  const swipeStartRef = useRef<{
    id: number;
    x: number;
    y: number;
    lock: 'none' | 'h' | 'v';
    maxPx: number;
    triggerPx: number;
  } | null>(null);
  const swipeXRef = useRef(0);
  const swipeRowElsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const swipeRevealElsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const swipeSnapTimerRef = useRef<number | null>(null);

  const clearSwipeSnapTimer = () => {
    if (swipeSnapTimerRef.current != null) {
      window.clearTimeout(swipeSnapTimerRef.current);
      swipeSnapTimerRef.current = null;
    }
  };

  const getSwipeLimits = (surahId: number) => {
    const width =
      swipeRowElsRef.current.get(surahId)?.offsetWidth ||
      swipeRevealElsRef.current.get(surahId)?.offsetWidth ||
      320;
    const maxPx = Math.max(48, Math.round(width * SWIPE_MAX_RATIO));
    const triggerPx = Math.max(36, Math.round(width * SWIPE_TRIGGER_RATIO));
    return { maxPx, triggerPx };
  };

  const paintSwipe = (id: number, x: number, animated: boolean) => {
    const row = swipeRowElsRef.current.get(id);
    const reveal = swipeRevealElsRef.current.get(id);
    if (row) {
      row.style.transition = animated
        ? `transform ${SWIPE_SNAP_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
        : 'none';
      row.style.transform = x === 0 ? 'translate3d(0,0,0)' : `translate3d(${x}px,0,0)`;
      row.style.willChange = x === 0 ? 'auto' : 'transform';
      if (x === 0) row.style.touchAction = 'pan-y';
    }
    if (reveal) {
      const abs = Math.abs(x);
      reveal.style.opacity = abs > 2 ? '1' : '0';
      const left = reveal.firstElementChild as HTMLElement | null;
      const right = reveal.lastElementChild as HTMLElement | null;
      if (left) left.style.opacity = x > 6 ? '1' : '0.55';
      if (right) right.style.opacity = x < -6 ? '1' : '0.55';
    }
    swipeXRef.current = x;
  };

  const resetSwipeVisual = (id?: number, animated = true) => {
    const targetId = id ?? swipeStartRef.current?.id;
    if (targetId != null) paintSwipe(targetId, 0, animated);
    swipeXRef.current = 0;
    swipeStartRef.current = null;
  };

  const commitSwipeAction = (surah: Surah, dx: number) => {
    if (!activeReciter || !activeMoshaf) {
      resetSwipeVisual(surah.id, true);
      return;
    }
    suppressClickRef.current = true;
    const limits = swipeStartRef.current?.id === surah.id
      ? { maxPx: swipeStartRef.current.maxPx, triggerPx: swipeStartRef.current.triggerPx }
      : getSwipeLimits(surah.id);
    const triggeredRight = dx >= limits.triggerPx;
    const triggeredLeft = dx <= -limits.triggerPx;

    if (triggeredRight || triggeredLeft) {
      const peak = triggeredRight ? limits.maxPx : -limits.maxPx;
      paintSwipe(surah.id, peak, true);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(10);
        } catch {
          // ignore
        }
      }
      if (triggeredRight) {
        const url = getAudioUrl(activeMoshaf, surah);
        if (!cachedUrls.has(url) && downloadProgress[url] === undefined && !batchDownload?.active) {
          void downloadSurah(activeReciter, activeMoshaf, surah);
        }
      } else {
        toggleInLoop(surah.id);
      }
      clearSwipeSnapTimer();
      swipeSnapTimerRef.current = window.setTimeout(() => {
        paintSwipe(surah.id, 0, true);
        swipeStartRef.current = null;
        swipeXRef.current = 0;
        swipeSnapTimerRef.current = null;
      }, 160);
      return;
    }

    resetSwipeVisual(surah.id, true);
  };

  const onRowTouchStart = (surahId: number, clientX: number, clientY: number) => {
    clearSwipeSnapTimer();
    touchStartYRef.current = clientY;
    longPressFiredRef.current = false;
    clearLongPressTimer();
    const limits = getSwipeLimits(surahId);
    swipeStartRef.current = {
      id: surahId,
      x: clientX,
      y: clientY,
      lock: 'none',
      maxPx: limits.maxPx,
      triggerPx: limits.triggerPx,
    };
    swipeXRef.current = 0;

    // Close any other open swipe
    swipeRowElsRef.current.forEach((_, id) => {
      if (id !== surahId) paintSwipe(id, 0, true);
    });

    if (selectMode) {
      longPressTimerRef.current = window.setTimeout(() => {
        longPressFiredRef.current = true;
        suppressClickRef.current = true;
        toggleChecked(surahId);
      }, LONG_PRESS_MS);
      return;
    }
    longPressTimerRef.current = window.setTimeout(() => {
      if (swipeStartRef.current?.lock === 'h') return;
      longPressFiredRef.current = true;
      suppressClickRef.current = true;
      resetSwipeVisual(surahId, true);
      enterSelectMode(surahId);
    }, LONG_PRESS_MS);
  };

  const onRowTouchMove = (surahId: number, clientX: number, clientY: number) => {
    const start = swipeStartRef.current;
    if (!start || start.id !== surahId) return;

    const dx = clientX - start.x;
    const dy = clientY - start.y;

    if (start.lock === 'none') {
      if (Math.abs(dx) < SWIPE_LOCK_PX && Math.abs(dy) < SWIPE_LOCK_PX) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        start.lock = 'v';
        clearLongPressTimer();
        touchStartYRef.current = null;
        paintSwipe(surahId, 0, false);
        return;
      }
      start.lock = 'h';
      clearLongPressTimer();
      touchStartYRef.current = null;
      const row = swipeRowElsRef.current.get(surahId);
      if (row) row.style.touchAction = 'none';
    }

    if (start.lock === 'v' || selectMode) return;

    paintSwipe(surahId, clampSwipe(dx, start.maxPx), false);
  };

  const onRowTouchEnd = (surah: Surah) => {
    clearLongPressTimer();
    touchStartYRef.current = null;
    const start = swipeStartRef.current;
    const dx = swipeXRef.current;
    if (
      start &&
      start.lock === 'h' &&
      start.id === surah.id &&
      !selectMode &&
      !longPressFiredRef.current
    ) {
      commitSwipeAction(surah, dx);
      return;
    }
    if (start?.id != null) resetSwipeVisual(start.id, true);
    else swipeStartRef.current = null;
  };

  const onRowClick = (surah: Surah) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (Math.abs(swipeXRef.current) > 4) {
      resetSwipeVisual(surah.id, true);
      return;
    }
    if (selectMode) {
      toggleChecked(surah.id);
      return;
    }
    handlePlay(surah);
  };

  useEffect(() => {
    return () => clearSwipeSnapTimer();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (mq.matches) exitSelectMode();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!activeReciter || !activeMoshaf) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center glass-panel rounded-3xl gap-4">
        <Disc className="w-12 h-12 text-[#46607b]" />
        <div>
          <h3 className="font-semibold text-lg text-[#f6f8fb]">Aucun récitateur sélectionné</h3>
          <p className="text-sm text-[#b4c0ce] max-w-xs mt-1">
            Choisissez un récitateur pour voir ses sourates.
          </p>
        </div>
        {onChooseReciter && (
          <button
            type="button"
            onClick={onChooseReciter}
            className="brand-button-primary px-5 py-2.5 rounded-xl font-semibold text-xs transition-colors tap-feedback"
          >
            Choisir un récitateur
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 md:gap-4 ${selectMode ? 'max-md:pb-36' : ''}`}>
      <div ref={searchWrapRef} className="relative z-40">
        <label htmlFor="surah-search" className="sr-only">
          Rechercher une sourate
        </label>
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-[#95a7ba] pointer-events-none" aria-hidden />
        <input
          id="surah-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onKeyDown={(e) => {
            if (!showSuggestions) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlightIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
              const pick = suggestions[highlightIndex];
              if (pick) {
                e.preventDefault();
                selectSuggestion(pick.surah);
              }
            } else if (e.key === 'Escape') {
              setSearchFocused(false);
            }
          }}
          placeholder={`Rechercher ${offlineOnlySurahs.length} sourates...`}
          aria-label="Rechercher une sourate"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls="surah-search-suggestions"
          autoComplete="off"
          className="w-full min-h-11 pl-12 pr-20 py-3 bg-[#111d2d]/78 hover:bg-[#162538]/88 focus:bg-[#162538] border border-[#30455c] focus:border-[#bfa078]/55 rounded-2xl text-[#e6edf5] placeholder:text-[#8295aa] text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#bfa078]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111d] transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSearchFocused(true);
            }}
            aria-label="Effacer la recherche"
            className="absolute right-3 top-1/2 -translate-y-1/2 min-h-9 min-w-9 text-xs text-[#b4c0ce] hover:text-[#f6f8fb] px-2 py-1 bg-[#1b2d43] rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078]"
          >
            Effacer
          </button>
        )}

        {showSuggestions && (
          <ul
            id="surah-search-suggestions"
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 max-h-72 overflow-y-auto rounded-2xl border border-[#30455c]/60 bg-[#0c1522] shadow-[0_18px_40px_rgba(0,0,0,0.55)] backdrop-blur-md"
          >
            {suggestions.map((item, index) => {
              const active = index === highlightIndex;
              return (
                <li key={item.surah.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => selectSuggestion(item.surah)}
                    className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                      active ? 'bg-[#e2d0ba]/12' : 'hover:bg-[#162538]/80'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums ${
                        active
                          ? 'bg-[#e2d0ba]/18 text-[#e6d5c2]'
                          : 'bg-[#111d2d] text-[#aab7c5] border border-[#30455c]/50'
                      }`}
                    >
                      {item.surah.id}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-[#f6f8fb]">
                        {item.surah.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[#95a7ba]">
                        {item.reason}
                      </span>
                    </span>
                    <span className="shrink-0 font-serif text-base text-[#d0d9e3] arabic-text">
                      {item.surah.arabicName}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {activeReciter && activeMoshaf && availableSurahs.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={allOffline || batchDownload?.active}
            onClick={() => downloadAllSurahs(activeReciter, activeMoshaf)}
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-bold transition-colors tap-feedback disabled:opacity-60 ${
              allOffline
                ? 'border-[#bfa078]/30 bg-[#e2d0ba]/10 text-[#e6d5c2]'
                : 'border-[#bfa078]/35 bg-[#e2d0ba]/12 text-[#e6d5c2] hover:bg-[#e2d0ba]/18'
            }`}
            title={
              allOffline
                ? 'Toutes les sourates sont déjà hors-ligne'
                : 'Télécharger toutes les sourates de ce récitateur'
            }
          >
            {allOffline ? (
              <CloudCheck className="h-4 w-4" />
            ) : (
              <CloudDownload className="h-4 w-4" />
            )}
            <span className="truncate">
              {allOffline
                ? 'Toutes hors-ligne'
                : batchDownload?.active
                  ? `En cours… ${batchDownload.done}/${batchDownload.total}`
                  : `Tout télécharger (${availableSurahs.length - offlineReadyCount})`}
            </span>
          </button>
          {offlineReadyCount > 0 && (
            <button
              type="button"
              disabled={batchDownload?.active}
              onClick={() => setShowDeleteAllModal(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#46607b]/55 bg-[#162538]/70 text-[#95a7ba] hover:border-[#46607b]/80 hover:bg-[#1b2d43] hover:text-[#d0d9e3] tap-feedback disabled:opacity-50"
              title="Supprimer toutes les sourates hors-ligne de ce récitateur"
              aria-label="Tout supprimer hors-ligne"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {showDeleteAllModal && activeReciter && activeMoshaf && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-all-offline-title"
        >
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-[#07111d]/72 backdrop-blur-xl"
            onClick={() => setShowDeleteAllModal(false)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-[#30455c]/70 bg-[#0c1522] shadow-[0_24px_80px_rgba(0,0,0,0.65)] animate-[page-enter_0.28s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-400/30 bg-red-500/12 text-red-300">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 id="delete-all-offline-title" className="text-lg font-black text-[#f6f8fb] leading-tight">
                    Tout supprimer ?
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#c8d1db]">
                    Supprimer les{' '}
                    <span className="font-bold text-[#f6f8fb]">{offlineReadyCount}</span> sourate
                    {offlineReadyCount > 1 ? 's' : ''} hors-ligne de{' '}
                    <span className="font-bold text-[#e6d5c2]">{activeReciter.name}</span> ?
                    Vous pourrez les retélécharger plus tard.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteAllModal(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#30455c] bg-[#111d2d] px-4 text-[13px] font-bold text-[#d0d9e3] hover:text-[#f6f8fb] tap-feedback"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteAllModal(false);
                    void deleteAllSurahs(activeReciter, activeMoshaf);
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-500/18 px-4 text-[13px] font-bold text-red-200 hover:bg-red-500/25 tap-feedback"
                >
                  <Trash2 className="h-4 w-4" />
                  Tout supprimer
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="flex items-center justify-between gap-3 px-0.5">
        <p className="min-w-0 truncate text-[11px] font-medium text-[#95a7ba]">
          {selectMode
            ? `${checkedIds.size} sélectionnée${checkedIds.size > 1 ? 's' : ''}`
            : playlistActive
              ? `Boucle · ${selectedSurahIds.size} sourate${selectedSurahIds.size > 1 ? 's' : ''}`
              : deferredQuery.trim()
                ? `${filteredSurahs.length} suggestion${filteredSurahs.length > 1 ? 's' : ''}`
                : (
                  <>
                    <span className="md:hidden">Glisse → télécharger · ← boucle</span>
                    <span className="hidden md:inline">Touche « Boucle » pour répéter une sélection</span>
                  </>
                )}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setRepeatMode(repeatMode === 'one' ? 'all' : 'one')}
            title={repeatMode === 'one' ? 'Répétition d’une seule sourate active' : 'Répéter la même sourate'}
            className={`h-8 w-8 rounded-full flex items-center justify-center transition-all border ${
              repeatMode === 'one'
                ? 'bg-[#e2d0ba]/16 border-[#bfa078]/45 text-[#e6d5c2]'
                : 'bg-transparent border-[#46607b]/70 text-[#aab7c5] hover:text-[#f6f8fb]'
            }`}
          >
            <Repeat1 className="w-3.5 h-3.5" />
          </button>
          {playlistActive && !selectMode && (
            <button
              type="button"
              onClick={() => setSelectedSurahIds(new Set())}
              className="inline-flex items-center gap-1 rounded-full border border-[#46607b]/70 px-2.5 py-1.5 text-[10px] font-semibold text-[#aab7c5] hover:text-[#f6f8fb]"
              title="Lire toutes les sourates"
            >
              <X className="w-3 h-3" />
              Tout
            </button>
          )}
        </div>
      </div>

      {filteredSurahs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center glass-panel rounded-3xl gap-2">
          <p className="text-[#b4c0ce]">Aucune sourate trouvée pour &quot;{searchQuery}&quot;</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 md:gap-3">
          {filteredSurahs.map((surah) => {
            const isCurrent =
              currentTrack?.surah.id === surah.id &&
              currentTrack?.reciter.id === activeReciter.id &&
              currentTrack?.moshaf.id === activeMoshaf.id;
            const isPlaying = isCurrent && playbackStatus === 'playing';
            const isBuffering = isCurrent && playbackStatus === 'buffering';
            const inLoop = selectedSurahIds.has(surah.id);
            const isDimmed = playlistActive && !inLoop && !selectMode;
            const url = getAudioUrl(activeMoshaf, surah);
            const isDownloaded = cachedUrls.has(url);
            const progress = downloadProgress[url];
            const isDownloading = progress !== undefined;
            const isChecked = checkedIds.has(surah.id);

            return (
              <div
                key={surah.id}
                id={`surah-row-${surah.id}`}
                className="relative overflow-hidden rounded-2xl md:overflow-visible"
              >
                {!selectMode && (
                  <div
                    ref={(node) => {
                      if (node) swipeRevealElsRef.current.set(surah.id, node);
                      else swipeRevealElsRef.current.delete(surah.id);
                    }}
                    className="pointer-events-none absolute inset-0 z-0 bg-[#111d2d] opacity-0 md:hidden"
                    aria-hidden
                  >
                    <div className="absolute inset-y-0 left-0 flex w-[45%] items-center gap-1.5 bg-[#e2d0ba]/22 px-3 text-[#e6d5c2] opacity-55">
                      <CloudDownload className="h-4 w-4 shrink-0" strokeWidth={2.4} />
                      <span className="truncate text-[11px] font-bold">
                        {isDownloaded ? 'Déjà hors ligne' : 'Télécharger'}
                      </span>
                    </div>
                    <div className="absolute inset-y-0 right-0 flex w-[45%] items-center justify-end gap-1.5 bg-[#bfa078]/20 px-3 text-[#e6d5c2] opacity-55">
                      <span className="truncate text-[11px] font-bold">
                        {inLoop ? 'Retirer boucle' : 'Boucle'}
                      </span>
                      <Repeat className="h-4 w-4 shrink-0" strokeWidth={2.4} />
                    </div>
                  </div>
                )}

                <div
                  ref={(node) => {
                    if (node) swipeRowElsRef.current.set(surah.id, node);
                    else swipeRowElsRef.current.delete(surah.id);
                  }}
                  role="button"
                  tabIndex={0}
                  onTouchStart={(e) =>
                    onRowTouchStart(surah.id, e.touches[0]?.clientX ?? 0, e.touches[0]?.clientY ?? 0)
                  }
                  onTouchMove={(e) => {
                    const touch = e.touches[0];
                    if (!touch) return;
                    onRowTouchMove(surah.id, touch.clientX, touch.clientY);
                    if (swipeStartRef.current?.lock === 'h') {
                      e.preventDefault();
                    }
                  }}
                  onTouchEnd={() => onRowTouchEnd(surah)}
                  onTouchCancel={() => onRowTouchEnd(surah)}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('[data-row-action]')) return;
                    onRowClick(surah);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowClick(surah);
                    }
                  }}
                  onContextMenu={(e) => {
                    if (window.matchMedia('(max-width: 767px)').matches) e.preventDefault();
                  }}
                  style={{ touchAction: 'pan-y' }}
                  className={`group relative z-[1] px-3 py-2.5 min-[390px]:px-3.5 min-[390px]:py-3 md:px-4 md:py-3.5 rounded-2xl flex items-center gap-2.5 md:gap-3.5 border select-none [-webkit-touch-callout:none] max-md:bg-[#111d2d] transition-[border-color,background-color,opacity] duration-200 will-change-transform ${
                    selectMode && isChecked
                      ? 'border-[#bfa078]/45 max-md:bg-[#162538] bg-[#e2d0ba]/[0.08]'
                      : isCurrent
                        ? 'surah-row-active'
                        : isDimmed
                          ? 'border-[#30455c]/20 max-md:bg-[#0d1622] bg-[#111d2d]/20 opacity-45'
                          : inLoop
                            ? 'border-[#bfa078]/28 max-md:bg-[#141f2e] bg-[#e2d0ba]/[0.05]'
                            : 'border-[#30455c]/45 max-md:bg-[#111d2d] bg-[#111d2d]/36 hover:bg-[#162538]/88 hover:border-[#46607b]/60'
                  }`}
                >
                {selectMode && (
                  <div
                    className={`md:hidden flex h-8 w-8 min-[390px]:h-9 min-[390px]:w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isChecked
                        ? 'border-[#bfa078] bg-[#e2d0ba] text-[#111d2d]'
                        : 'border-[#46607b]/80 bg-transparent text-transparent'
                    }`}
                    aria-hidden
                  >
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                )}

                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 text-left">
                  {!selectMode && (
                  <div className="relative flex items-center justify-center w-8 h-8 min-[390px]:w-9 min-[390px]:h-9 shrink-0">
                    <div
                      className={`absolute inset-0 rotate-45 rounded-md border transition-all duration-500 ${
                        isCurrent
                          ? 'border-transparent bg-[#07111d]/88 shadow-[0_0_0_1px_rgba(191,160,120,0.35)]'
                          : 'bg-[#07111d] border-[#46607b] group-hover:border-[#95a7ba]'
                      }`}
                      style={
                        isCurrent
                          ? {
                              backgroundImage:
                                'linear-gradient(rgba(7,17,29,0.92), rgba(7,17,29,0.92)), linear-gradient(135deg, rgba(241,232,220,0.72) 0%, rgba(191,160,120,0.46) 70%, rgba(121,144,161,0.4) 100%)',
                              backgroundOrigin: 'border-box',
                              backgroundClip: 'padding-box, border-box',
                              border: '1px solid transparent',
                            }
                          : undefined
                      }
                    />
                    <span
                      className={`relative z-10 text-[11px] font-bold tabular-nums transition-colors ${
                        isCurrent ? 'text-[#e6d5c2]' : 'text-[#aab7c5] group-hover:text-[#eef3f8]'
                      }`}
                    >
                      {isBuffering ? (
                        <div className="w-3.5 h-3.5 border-2 border-[#e2d0ba]/80 border-t-transparent rounded-full animate-spin" />
                      ) : isPlaying ? (
                        <div className="flex gap-0.5 items-end justify-center h-3 w-3">
                          <div className="w-0.5 bg-[#e2d0ba] animate-[shimmer_0.6s_infinite_alternate] h-full rounded-full" style={{ animationDelay: '0.1s' }} />
                          <div className="w-0.5 bg-white/80 animate-[shimmer_0.6s_infinite_alternate] h-2/3 rounded-full" style={{ animationDelay: '0.3s' }} />
                          <div className="w-0.5 bg-[#7990a1] animate-[shimmer_0.6s_infinite_alternate] h-full rounded-full" style={{ animationDelay: '0.5s' }} />
                        </div>
                      ) : (
                        surah.id
                      )}
                    </span>
                  </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h5
                      className={`font-bold text-sm leading-snug transition-colors flex items-center gap-1.5 ${
                        isCurrent ? 'text-[#f8fbff]' : 'text-[#f1f5f9] group-hover:text-[#ffffff]'
                      }`}
                    >
                      <span className="truncate">{surah.name}</span>
                      {isDownloading && (
                        <span
                          className="md:hidden shrink-0 text-[10px] font-black tabular-nums text-[#e2d0ba]"
                          aria-label={`Téléchargement ${progress}%`}
                        >
                          {progress}%
                        </span>
                      )}
                      {isDownloaded && !selectMode && !isDownloading && (
                        <button
                          type="button"
                          data-row-action
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSurah(activeReciter, activeMoshaf, surah);
                          }}
                          className="md:hidden group/rm flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#e8c4a8]/45 bg-[#f5dcc8]/15 text-[#e8c4a8] tap-feedback active:border-red-400/50 active:bg-red-500/15 active:text-red-300"
                          title="Supprimer le hors-ligne"
                          aria-label={`Supprimer ${surah.name} du hors-ligne`}
                        >
                          <CloudCheck className="h-3.5 w-3.5 group-active/rm:hidden" strokeWidth={2.25} />
                          <Trash2 className="hidden h-3.5 w-3.5 group-active/rm:block" strokeWidth={2.25} />
                        </button>
                      )}
                    </h5>
                    <p className="text-[11px] text-[#aab7c5]/85 truncate mt-1 font-medium leading-snug">
                      {surah.translation}
                    </p>
                  </div>

                  <span
                    className={`font-serif text-xl tracking-wide select-none arabic-text transition-colors shrink-0 hidden min-[420px]:inline ${
                      isCurrent ? 'text-[#e6d5c2]' : 'text-[#d0d9e3] group-hover:text-[#f8fbff]'
                    }`}
                  >
                    {surah.arabicName}
                  </span>
                </div>

                <button
                  type="button"
                  data-row-action
                  onClick={() => toggleInLoop(surah.id)}
                  className={`hidden md:inline-flex shrink-0 items-center gap-1 h-8 min-w-8 px-2 rounded-full text-[11px] font-semibold tracking-wide transition-all tap-feedback ${
                    inLoop
                      ? 'bg-[#e2d0ba] text-[#111d2d]'
                      : 'bg-transparent text-[#aab7c5] ring-1 ring-inset ring-[#46607b]/80 hover:text-[#e6d5c2] hover:ring-[#bfa078]/35'
                  }`}
                  title={inLoop ? 'Retirer de la boucle' : 'Ajouter à la boucle de répétition'}
                  aria-pressed={inLoop}
                  aria-label={inLoop ? `Retirer ${surah.name} de la boucle` : `Ajouter ${surah.name} à la boucle`}
                >
                  <Repeat className={`w-3.5 h-3.5 ${inLoop ? '' : 'opacity-80'}`} />
                  <span className="hidden min-[400px]:inline">{inLoop ? 'En boucle' : 'Boucle'}</span>
                </button>

                <button
                  type="button"
                  data-row-action
                  onClick={() => handlePlay(surah)}
                  className={`hidden md:flex w-9 h-9 rounded-full items-center justify-center transition-all shrink-0 tap-feedback ${
                    isCurrent
                      ? 'text-[#111d2d] shadow-[0_4px_14px_rgba(191,160,120,0.25)]'
                      : 'bg-[#162538] text-[#d0d9e3] group-hover:text-[#111d2d] group-hover:bg-[#e2d0ba] border border-[#46607b]'
                  }`}
                  style={
                    isCurrent
                      ? {
                          background:
                            'linear-gradient(135deg, #e2d0ba 0%, #bfa078 72%, #f7fbff 100%)',
                        }
                      : undefined
                  }
                  aria-label={isPlaying ? 'Pause' : 'Lire'}
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  data-row-action
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDownloading) return;
                    if (isDownloaded) {
                      deleteSurah(activeReciter, activeMoshaf, surah);
                      return;
                    }
                    downloadSurah(activeReciter, activeMoshaf, surah);
                  }}
                  disabled={isDownloading}
                  className={`hidden md:flex group/dl w-9 h-9 rounded-full items-center justify-center transition-all shrink-0 tap-feedback border ${
                    isDownloaded
                      ? 'border-[#e8c4a8]/60 bg-[#f5dcc8]/22 text-[#f5dcc8] shadow-[0_0_16px_rgba(230,190,155,0.30)] hover:border-red-400/60 hover:bg-red-500/15 hover:text-red-400 hover:shadow-[0_0_14px_rgba(239,68,68,0.25)]'
                      : isDownloading
                        ? 'border-[#bfa078]/35 bg-[#162538] text-[#e2d0ba]'
                        : 'border-[#46607b] bg-[#162538] text-[#e2d0ba] hover:border-[#bfa078]/50 hover:bg-[#e2d0ba]/14 hover:shadow-[0_0_12px_rgba(191,160,120,0.18)]'
                  }`}
                  title={
                    isDownloaded
                      ? 'Supprimer le téléchargement hors-ligne'
                      : isDownloading
                        ? 'Téléchargement…'
                        : 'Télécharger hors-ligne'
                  }
                  aria-label={
                    isDownloaded
                      ? `Supprimer ${surah.name} du hors-ligne`
                      : isDownloading
                        ? `Téléchargement de ${surah.name}`
                        : `Télécharger ${surah.name}`
                  }
                >
                  {isDownloading ? (
                    <span className="text-[10px] font-black tabular-nums tracking-tight">{progress}%</span>
                  ) : isDownloaded ? (
                    <>
                      <CloudCheck className="w-4 h-4 group-hover/dl:hidden" strokeWidth={2.25} />
                      <Trash2 className="w-4 h-4 hidden group-hover/dl:block" strokeWidth={2.25} />
                    </>
                  ) : (
                    <CloudDownload className="w-4 h-4" strokeWidth={2.25} />
                  )}
                </button>
              </div>
              </div>
            );
          })}
        </div>
      )}

      {selectMode &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 z-[55] md:hidden px-3"
            style={{
              bottom: 'calc(12.5rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-1.5 rounded-2xl border-2 border-[#e2d0ba]/55 bg-[#121f30] px-2 py-2.5 shadow-[0_-10px_40px_rgba(0,0,0,0.55),0_0_0_1px_rgba(241,232,220,0.12),0_0_28px_rgba(191,160,120,0.22)] backdrop-blur-xl">
              <button
                type="button"
                onClick={applyLoopFromSelection}
                disabled={checkedIds.size === 0}
                className="inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl bg-gradient-to-b from-[#f1e8dc] to-[#e8c4a4] px-2 py-2.5 text-[10px] font-black text-[#0c1522] shadow-[0_4px_16px_rgba(232,196,164,0.45)] transition-opacity disabled:opacity-40 tap-feedback"
              >
                <Repeat className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                <span className="truncate">Boucle</span>
              </button>
              <button
                type="button"
                onClick={downloadFromSelection}
                disabled={selectionDownloadCount === 0}
                className="inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border-2 border-[#e2d0ba]/70 bg-[#e2d0ba]/18 px-2 py-2.5 text-[10px] font-black text-[#f1e8dc] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_14px_rgba(191,160,120,0.2)] transition-opacity disabled:opacity-40 tap-feedback"
              >
                <CloudDownload className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                <span className="truncate">Télécharger</span>
              </button>
              <button
                type="button"
                onClick={deleteFromSelection}
                disabled={selectionDeleteCount === 0}
                className="inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border-2 border-[#7a93ab]/45 bg-[#1a2b40] px-2 py-2.5 text-[10px] font-black text-[#d0d9e3] transition-opacity disabled:opacity-40 tap-feedback"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                <span className="truncate">Supprimer</span>
              </button>
              <button
                type="button"
                onClick={exitSelectMode}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#7a93ab]/55 bg-[#1a2b40] text-[#e8eef5] tap-feedback"
                aria-label="Annuler"
              >
                <X className="h-4 w-4" strokeWidth={2.4} />
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
