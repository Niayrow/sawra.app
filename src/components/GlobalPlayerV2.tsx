import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAudio } from '../context/AudioContext';
import {
  ChevronDown, VolumeX, Volume2,
  Disc, ListMusic, Search, X, Settings, Sparkles, Check, Moon, Repeat,
  Repeat1, Clock, RotateCcw, RotateCw, Gauge, MonitorSmartphone,
  Headphones, Play, Pause, SkipBack, SkipForward, SlidersHorizontal,
  BookOpenText, AudioLines,
} from '../icons/motion';
import { PLAYER_THEMES, PLAYER_THEME_IDS, type PlayerThemeId } from './player/playerThemes';
import {
  type PlayerBarDensity,
  type PlayerV2Prefs,
  type SeekStepSeconds,
} from './player/playerV2Prefs';
import { AudioEffectsPanel } from './player/AudioEffectsPanel';
import { PlayerTooltip } from './player/PlayerTooltip';
import { AUDIO_EFFECT_PRESETS, effectsNeedProcessing } from '../audio/effectsTypes';
import { ReciterPortrait } from './ReciterPortrait';
import { SURAHS } from '../data/surahs';
import type { Moshaf, Reciter } from '../types';
import { SurahReaderSheet, usePlayerBarAnchor, READER_MOTION_MS } from './SurahReaderSheet';
import { OPEN_READER_EVENT } from '../utils/appEvents';
import { useReaderPrefs } from './reader/readerPrefs';
import { AyahSyncBadge } from './AyahSyncBadge';
import { useActiveAyah } from '../hooks/useActiveAyah';
import { AyahPickerSheet } from './AyahPickerSheet';
import { AyahProgressIndicator } from './AyahProgressIndicator';

const formatTime = (time: number) => {
  if (!Number.isFinite(time) || time < 0) return '–:––';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDuration = (time: number) => {
  if (!Number.isFinite(time) || time <= 0) return '–:––';
  return formatTime(time);
};

const formatSleepTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
};

const moshafHasSurah = (moshaf: Moshaf, surahId: number): boolean => {
  return moshaf.surah_list
    .split(',')
    .some((part) => parseInt(part.trim(), 10) === surahId);
};

/** Prefer Hafs when several moshafs include the surah. */
const pickMoshafForSurah = (reciter: Reciter, surahId: number): Moshaf | null => {
  const matches = reciter.moshaf.filter((m) => moshafHasSurah(m, surahId));
  if (!matches.length) return null;
  return matches.find((m) => /hafs/i.test(m.name)) ?? matches[0] ?? null;
};

/** Scrolls left when the label overflows its container */
const MarqueeText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const label = textRef.current;
    if (!container || !label) return;

    const measure = () => {
      const distance = Math.max(0, label.scrollWidth - container.clientWidth);
      container.style.setProperty('--marquee-distance', `${distance}px`);
      setOverflowing(distance > 2);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [text]);

  return (
    <span ref={containerRef} className={`min-w-0 overflow-hidden ${className}`}>
      <span
        ref={textRef}
        className={overflowing ? 'player-marquee-text is-overflowing' : 'block truncate'}
      >
        {text}
      </span>
    </span>
  );
};

const DENSITY_META: Record<
  PlayerBarDensity,
  {
    label: string;
    barClass: string;
    padClass: string;
    coverClass: string;
    rowGapClass: string;
    toolsClass: string;
    playBtnClass: string;
    skipBtnClass: string;
    discIconClass: string;
  }
> = {
  compact: {
    label: 'Compacte',
    barClass: '',
    padClass: 'px-2.5 pt-1.5 pb-1 md:px-4 md:py-1.5',
    coverClass: 'w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl',
    rowGapClass: 'gap-2 md:gap-3 lg:gap-4',
    toolsClass: 'px-2.5 pb-1.5 pt-0 gap-2',
    playBtnClass: 'w-9 h-9 md:h-9 md:w-9',
    skipBtnClass: 'w-8 h-8',
    discIconClass: 'w-4 h-4 md:w-5 md:h-5',
  },
  comfortable: {
    label: 'Confort',
    barClass: '',
    padClass: 'px-3 pt-2.5 pb-1.5 md:px-5 md:py-2.5',
    coverClass: 'w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl',
    rowGapClass: 'gap-3 md:gap-5 lg:gap-8',
    toolsClass: 'px-3 pb-2.5 pt-0.5 gap-2.5',
    playBtnClass: 'w-11 h-11 md:h-11 md:w-11',
    skipBtnClass: 'w-10 h-10',
    discIconClass: 'w-5 h-5 md:w-7 md:h-7',
  },
  expanded: {
    label: 'Large',
    barClass: 'md:min-h-[6.75rem]',
    padClass: 'px-3.5 pt-3 pb-2 md:px-6 md:py-3.5',
    coverClass: 'w-14 h-14 md:w-[4.75rem] md:h-[4.75rem] rounded-xl md:rounded-2xl',
    rowGapClass: 'gap-3.5 md:gap-6 lg:gap-10',
    toolsClass: 'px-3.5 pb-3.5 pt-1 gap-3',
    playBtnClass: 'w-12 h-12 md:h-12 md:w-12',
    skipBtnClass: 'w-11 h-11',
    discIconClass: 'w-6 h-6 md:w-8 md:h-8',
  },
};

export const GlobalPlayerV2: React.FC<{
  /** Sync with navbar: dock = floating player, classic = full-bleed bottom bar */
  desktopChrome?: 'dock' | 'classic';
  onDesktopChromeChange?: (style: 'dock' | 'classic') => void;
  /** Mobile chrome: full mini-bar vs idle pill (for shell padding / nav dock). */
  onMobileChromeChange?: (chrome: 'full' | 'pill') => void;
}> = ({ desktopChrome, onDesktopChromeChange, onMobileChromeChange }) => {
  const {
    currentTrack,
    playbackStatus,
    currentTime,
    duration,
    volume,
    playbackSpeed,
    togglePlay,
    dismissTrack,
    seekTo,
    setVolume,
    setPlaybackSpeed,
    playNextTrack,
    playPrevTrack,
    playTrack,
    getAvailableSurahs,
    repeatMode,
    setRepeatMode,
    sleepTimer,
    setSleepTimer,
    playerTheme,
    setPlayerTheme,
    remoteSession,
    takeOverRemoteSession,
    reciters,
    playerV2Prefs: prefs,
    setPlayerV2Prefs,
    selectedSurahIds,
    setSelectedSurahIds,
    audioEffects,
    setAudioEffects,
    effectsSupported,
  } = useAudio();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [isReaderClosing, setIsReaderClosing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlistClosing, setPlaylistClosing] = useState(false);
  const [playlistEntranceDone, setPlaylistEntranceDone] = useState(false);
  const [showReciterPicker, setShowReciterPicker] = useState(false);
  const [reciterPickerClosing, setReciterPickerClosing] = useState(false);
  const [reciterPickerEntranceDone, setReciterPickerEntranceDone] = useState(false);
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [showVolumePopover, setShowVolumePopover] = useState(false);
  const [showAyahPicker, setShowAyahPicker] = useState(false);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  /** Keep full mini-bar while paused after user expands the pill. */
  const [mobileBarPinned, setMobileBarPinned] = useState(false);
  /** Wait a few seconds after pause before collapsing to the pill. */
  const [idleCollapseReady, setIdleCollapseReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsNarrowViewport(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (playbackStatus === 'playing' || playbackStatus === 'buffering') {
      setMobileBarPinned(false);
      setIdleCollapseReady(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setIdleCollapseReady(true);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [playbackStatus]);

  const openReader = () => {
    if (isReaderClosing) return;
    setIsExpanded(false);
    setShowPlaylist(false);
    setPlaylistClosing(false);
    setShowReciterPicker(false);
    setReciterPickerClosing(false);
    setShowPersonalize(false);
    setShowEffects(false);
    setShowVolumePopover(false);
    setIsReaderClosing(false);
    setIsReaderOpen(true);
  };

  const beginCloseReader = () => {
    if (!isReaderOpen || isReaderClosing) return;
    setIsReaderClosing(true);
  };

  const finishCloseReader = () => {
    setIsReaderOpen(false);
    setIsReaderClosing(false);
  };

  const toggleReader = () => {
    if (isReaderOpen) beginCloseReader();
    else openReader();
  };

  useEffect(() => {
    const onOpen = () => {
      if (currentTrack) openReader();
    };
    window.addEventListener(OPEN_READER_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_READER_EVENT, onOpen);
  }, [currentTrack]);

  /** Chrome join only while fully open — restores during close (no late snap) */
  const readerDockJoined =
    (isReaderOpen && !isReaderClosing) ||
    (showPlaylist && !playlistClosing) ||
    (showReciterPicker && !reciterPickerClosing);
  const [readerPrefs] = useReaderPrefs();
  const autoOpenedSurahRef = useRef<number | null>(null);

  useEffect(() => {
    if (!readerPrefs.autoOpenOnPlay || !currentTrack) return;
    if (playbackStatus !== 'playing' && playbackStatus !== 'buffering') return;
    const surahId = currentTrack.surah.id;
    if (autoOpenedSurahRef.current === surahId) return;
    autoOpenedSurahRef.current = surahId;
    if (!isReaderOpen && !isReaderClosing) {
      openReader();
    }
  }, [
    readerPrefs.autoOpenOnPlay,
    currentTrack?.surah.id,
    playbackStatus,
    isReaderOpen,
    isReaderClosing,
  ]);
  const [localDocked, setLocalDocked] = useState(false);
  const docked =
    desktopChrome !== undefined ? desktopChrome === 'classic' : localDocked;
  const toggleDocked = () => {
    if (onDesktopChromeChange) {
      onDesktopChromeChange(docked ? 'dock' : 'classic');
      return;
    }
    setLocalDocked((d) => !d);
  };
  const [drawerSearch, setDrawerSearch] = useState('');
  const [reciterSearch, setReciterSearch] = useState('');
  const currentSurahRowRef = useRef<HTMLButtonElement | null>(null);
  const currentReciterRowRef = useRef<HTMLButtonElement | null>(null);
  const volumeWrapRef = useRef<HTMLDivElement | null>(null);
  const volumeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [volumePopoverPos, setVolumePopoverPos] = useState<{ bottom: number; right: number } | null>(null);
  const playerBarRef = useRef<HTMLDivElement | null>(null);

  const swipeStartYRef = useRef<number | null>(null);
  const [liveRemotePos, setLiveRemotePos] = useState(0);
  const remoteClockAnchorRef = useRef<{ pos: number; at: number; key: string } | null>(null);

  const theme = PLAYER_THEMES[(playerTheme as PlayerThemeId)] || PLAYER_THEMES.amber;
  const density = DENSITY_META[prefs.density] || DENSITY_META.compact;
  const isCompactBar = prefs.density === 'compact';
  const ayahBarVariant = prefs.density === 'comfortable' ? 'link' : 'full';
  const readerTopRadius =
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 768px)').matches &&
    !docked
      ? '1.75rem'
      : '0px';
  const playerBarAnchor = usePlayerBarAnchor(
    playerBarRef,
    isReaderOpen || showPlaylist || showReciterPicker,
    {
      topRadius: readerTopRadius,
      deps: [
        docked,
        density.barClass,
        remoteSession,
        isExpanded,
        prefs.density,
        isReaderClosing,
        showPlaylist,
        playlistClosing,
        showReciterPicker,
        reciterPickerClosing,
      ],
    }
  );
  const hasCover = Boolean(currentTrack);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const {
    available: ayahSyncAvailable,
    activeAyah,
    totalAyahs,
    ayahProgress,
  } = useActiveAyah({ enabled: Boolean(currentTrack) });
  const openAyahPicker = () => setShowAyahPicker(true);
  const speedOptions = [0.75, 0.9, 1, 1.25, 1.5, 1.75, 2];

  const showMobilePill =
    isNarrowViewport &&
    !isExpanded &&
    !isReaderOpen &&
    !showPlaylist &&
    !showReciterPicker &&
    playbackStatus !== 'playing' &&
    playbackStatus !== 'buffering' &&
    !mobileBarPinned &&
    idleCollapseReady;

  useEffect(() => {
    onMobileChromeChange?.(showMobilePill ? 'pill' : 'full');
  }, [showMobilePill, onMobileChromeChange]);

  useEffect(() => {
    return () => onMobileChromeChange?.('full');
  }, [onMobileChromeChange]);

  const onMiniBarTouchStart = (e: React.TouchEvent) => {
    if (showMobilePill) {
      swipeStartYRef.current = null;
      return;
    }
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, [data-player-transport]')) {
      swipeStartYRef.current = null;
      return;
    }
    swipeStartYRef.current = e.touches[0]?.clientY ?? null;
  };

  const onMiniBarTouchEnd = (e: React.TouchEvent) => {
    const startY = swipeStartYRef.current;
    swipeStartYRef.current = null;
    if (startY == null) return;
    const endY = e.changedTouches[0]?.clientY;
    if (endY == null) return;
    // Swipe up opens fullscreen player
    if (startY - endY > 52) {
      setIsExpanded(true);
    }
  };

  // Smooth second-by-second clock for remote playback banner
  useEffect(() => {
    if (!remoteSession) {
      remoteClockAnchorRef.current = null;
      setLiveRemotePos(0);
      return;
    }

    const key = `${remoteSession.deviceId}:${remoteSession.surahId}:${remoteSession.reciterId}`;
    const serverPos = Math.max(0, remoteSession.positionSeconds || 0);
    const serverAt = Date.parse(remoteSession.updatedAt) || Date.now();
    const prev = remoteClockAnchorRef.current;

    if (!prev || prev.key !== key) {
      remoteClockAnchorRef.current = { pos: serverPos, at: serverAt, key };
    } else {
      const estimatedNow = prev.pos + (Date.now() - prev.at) / 1000;
      // Resync only on meaningful drift to avoid second jumps
      if (Math.abs(estimatedNow - serverPos) > 1.25) {
        remoteClockAnchorRef.current = { pos: serverPos, at: serverAt, key };
      }
    }

    const tick = () => {
      const anchor = remoteClockAnchorRef.current;
      if (!anchor) return;
      setLiveRemotePos(Math.max(0, anchor.pos + (Date.now() - anchor.at) / 1000));
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [remoteSession]);

  const filteredSurahs = useMemo(() => {
    if (!currentTrack) return [];
    const available = getAvailableSurahs(currentTrack.reciter, currentTrack.moshaf);
    if (!drawerSearch.trim()) return available;
    const query = drawerSearch.toLowerCase().trim();
    return available.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.translation.toLowerCase().includes(query) ||
        s.id.toString().includes(query) ||
        s.arabicName.includes(query)
    );
  }, [currentTrack, drawerSearch, getAvailableSurahs]);

  const filteredReciters = useMemo(() => {
    if (!currentTrack) return [];
    const surahId = currentTrack.surah.id;
    const withSurah = reciters.filter((r) => pickMoshafForSurah(r, surahId));
    const query = reciterSearch.toLowerCase().trim();
    const filtered = query
      ? withSurah.filter(
          (r) =>
            r.name.toLowerCase().includes(query) ||
            String(r.id).includes(query),
        )
      : withSurah;
    return [...filtered].sort((a, b) => {
      if (a.id === currentTrack.reciter.id) return -1;
      if (b.id === currentTrack.reciter.id) return 1;
      return a.name.localeCompare(b.name, 'fr');
    });
  }, [currentTrack, reciters, reciterSearch]);

  useEffect(() => {
    if (!showPlaylist && !showPersonalize && !showEffects && !showReciterPicker) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showPlaylist) {
        setPlaylistClosing(true);
        window.setTimeout(() => {
          setShowPlaylist(false);
          setPlaylistClosing(false);
          setDrawerSearch('');
        }, 240);
      } else if (showReciterPicker) {
        setReciterPickerClosing(true);
        window.setTimeout(() => {
          setShowReciterPicker(false);
          setReciterPickerClosing(false);
          setReciterSearch('');
        }, 240);
      } else if (showEffects) {
        setShowEffects(false);
      } else {
        setShowPersonalize(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [showPlaylist, showPersonalize, showEffects, showReciterPicker]);

  useEffect(() => {
    if (!currentTrack || remoteSession) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (showPlaylist || showPersonalize || showEffects || showReciterPicker) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePlay();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seekTo(Math.max(0, currentTime - prefs.seekStep));
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        seekTo(Math.min(duration || Number.POSITIVE_INFINITY, currentTime + prefs.seekStep));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    currentTrack,
    remoteSession,
    showPlaylist,
    showPersonalize,
    showEffects,
    showReciterPicker,
    togglePlay,
    seekTo,
    currentTime,
    duration,
    prefs.seekStep,
  ]);

  useEffect(() => {
    if (!showPlaylist) return;
    const id = window.requestAnimationFrame(() => {
      currentSurahRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [showPlaylist]);

  useLayoutEffect(() => {
    if (!showVolumePopover) {
      setVolumePopoverPos(null);
      return;
    }

    const updatePos = () => {
      const btn = volumeBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setVolumePopoverPos({
        bottom: window.innerHeight - rect.top + 10,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [showVolumePopover]);

  useEffect(() => {
    if (!showVolumePopover) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const wrap = volumeWrapRef.current;
      const popover = document.getElementById('player-volume-popover');
      if (wrap?.contains(target) || popover?.contains(target)) return;
      setShowVolumePopover(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [showVolumePopover]);

  useEffect(() => {
    if (!isExpanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [isExpanded]);

  if (!currentTrack) return null;

  const updatePref = <K extends keyof PlayerV2Prefs>(key: K, value: PlayerV2Prefs[K]) => {
    setPlayerV2Prefs((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSurahInPlaylist = (surahId: number) => {
    setSelectedSurahIds((prev) => {
      const next = new Set(prev);
      if (next.has(surahId)) next.delete(surahId);
      else next.add(surahId);
      return next;
    });
  };

  const jumpBy = (delta: number) => {
    seekTo(Math.max(0, Math.min(duration || 0, currentTime + delta)));
  };

  const cycleRepeat = () => {
    const order = ['all', 'one', 'none'] as const;
    const idx = order.indexOf(repeatMode);
    setRepeatMode(order[(idx + 1) % order.length]);
  };

  const toggleMute = () => {
    if (isMuted || volume === 0) {
      setVolume(prevVolume || 0.8);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const openPlaylist = () => {
    setIsReaderOpen(false);
    setIsReaderClosing(false);
    setShowReciterPicker(false);
    setReciterPickerClosing(false);
    setShowPersonalize(false);
    setShowVolumePopover(false);
    setPlaylistClosing(false);
    setPlaylistEntranceDone(false);
    setShowPlaylist(true);
  };

  const togglePlaylist = () => {
    if (showPlaylist && !playlistClosing) {
      closePlaylist();
      return;
    }
    openPlaylist();
  };

  const closePlaylist = () => {
    if (playlistClosing) return;
    setPlaylistClosing(true);
    window.setTimeout(() => {
      setShowPlaylist(false);
      setPlaylistClosing(false);
      setPlaylistEntranceDone(false);
      setDrawerSearch('');
    }, READER_MOTION_MS);
  };

  const openReciterPicker = () => {
    if (remoteSession) return;
    setIsExpanded(false);
    setIsReaderOpen(false);
    setIsReaderClosing(false);
    setShowPlaylist(false);
    setPlaylistClosing(false);
    setShowPersonalize(false);
    setShowEffects(false);
    setShowVolumePopover(false);
    setReciterPickerClosing(false);
    setReciterPickerEntranceDone(false);
    setShowReciterPicker(true);
  };

  const closeReciterPicker = () => {
    if (reciterPickerClosing) return;
    setReciterPickerClosing(true);
    window.setTimeout(() => {
      setShowReciterPicker(false);
      setReciterPickerClosing(false);
      setReciterPickerEntranceDone(false);
      setReciterSearch('');
    }, READER_MOTION_MS);
  };

  const selectReciter = (reciter: Reciter) => {
    if (!currentTrack || remoteSession) return;
    const moshaf = pickMoshafForSurah(reciter, currentTrack.surah.id);
    if (!moshaf) return;
    const resumeAt = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0;
    void playTrack(reciter, moshaf, currentTrack.surah, resumeAt);
    closeReciterPicker();
  };

  useEffect(() => {
    if (!showPlaylist || playlistClosing) return;
    setPlaylistEntranceDone(false);
    const t = window.setTimeout(() => setPlaylistEntranceDone(true), READER_MOTION_MS);
    return () => window.clearTimeout(t);
  }, [showPlaylist, playlistClosing]);

  useEffect(() => {
    if (!showReciterPicker || reciterPickerClosing) return;
    setReciterPickerEntranceDone(false);
    const t = window.setTimeout(() => setReciterPickerEntranceDone(true), READER_MOTION_MS);
    return () => window.clearTimeout(t);
  }, [showReciterPicker, reciterPickerClosing]);

  useEffect(() => {
    if (!showReciterPicker || reciterPickerClosing) return;
    const id = window.requestAnimationFrame(() => {
      currentReciterRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [showReciterPicker, reciterPickerClosing, currentTrack?.reciter.id]);

  const openPersonalize = () => {
    setIsReaderOpen(false);
    setIsReaderClosing(false);
    setShowPlaylist(false);
    setPlaylistClosing(false);
    setShowReciterPicker(false);
    setReciterPickerClosing(false);
    setShowVolumePopover(false);
    setShowEffects(false);
    setShowPersonalize(true);
  };

  const openEffects = () => {
    setIsReaderOpen(false);
    setIsReaderClosing(false);
    setShowPlaylist(false);
    setPlaylistClosing(false);
    setShowReciterPicker(false);
    setReciterPickerClosing(false);
    setShowVolumePopover(false);
    setShowPersonalize(false);
    setShowEffects(true);
  };

  const effectsActive = effectsNeedProcessing(audioEffects);
  const activeEffectLabel =
    AUDIO_EFFECT_PRESETS.find((p) => p.id === audioEffects.preset)?.label ??
    (audioEffects.preset === 'custom' ? 'Perso' : null);
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  const remoteSurahName = remoteSession
    ? currentTrack?.surah.id === remoteSession.surahId
      ? currentTrack.surah.name
      : SURAHS.find((s) => s.id === remoteSession.surahId)?.name
    : null;
  const remoteReciterName = remoteSession
    ? currentTrack?.reciter.id === remoteSession.reciterId
      ? currentTrack.reciter.name
      : reciters.find((r) => r.id === remoteSession.reciterId)?.name
    : null;
  const remoteTrackLabel = [remoteSurahName, remoteReciterName].filter(Boolean).join(' · ');
  const remoteAyahLabel =
    remoteSession?.ayah != null ? ` · v. ${remoteSession.ayah}` : '';

  return (
    <>
      {/* ── Mobile idle pill (paused / no active playback) ── */}
      {showMobilePill && currentTrack && (
        <div
          className="fixed z-[50] md:hidden left-3 right-3 bottom-[calc(4.35rem+env(safe-area-inset-bottom,0px)+0.45rem)] flex items-center gap-1.5 rounded-2xl border border-[#bfa078]/35 bg-[#0c1522]/95 px-2 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
          role="region"
          aria-label="Lecture en pause"
        >
          <button
            type="button"
            onClick={() => setMobileBarPinned(true)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-0.5 text-left tap-feedback"
            aria-label="Ouvrir le lecteur"
          >
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[#bfa078]/30 bg-[#07111d]">
              <ReciterPortrait reciter={currentTrack.reciter} alt="" />
            </div>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-[#f6f8fb] leading-tight">
                {currentTrack.surah.name}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-[#95a7ba] leading-tight">
                {currentTrack.reciter.name}
              </span>
            </span>
          </button>
          <button
            type="button"
            disabled={Boolean(remoteSession)}
            onClick={(e) => {
              e.stopPropagation();
              if (remoteSession) return;
              togglePlay();
            }}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full tap-feedback disabled:pointer-events-none disabled:grayscale ${
              remoteSession
                ? 'bg-[#30455c] text-[#95a7ba]'
                : `${theme.accent} text-[#111d2d] shadow-md ${theme.accentShadow}`
            }`}
            aria-label="Lecture"
          >
            <Play size={16} color="currentColor" className="ml-0.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dismissTrack();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#30455c]/70 bg-[#111d2d]/90 text-[#aab7c5] tap-feedback hover:text-[#f6f8fb]"
            aria-label="Fermer le lecteur"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Mini bar: full-width on mobile, large desktop player bar ── */}
      <div
        ref={playerBarRef}
        data-player-density={prefs.density}
        className={`fixed z-[50] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]
          max-md:left-0 max-md:right-0 max-md:w-full max-md:max-w-none
          max-md:bottom-[calc(4.35rem+env(safe-area-inset-bottom,0px))]
          md:z-[51] rounded-none
          mobile-dock-chrome mobile-dock-player glass-panel-opaque player-bar-gold
          border-0 max-md:border-t max-md:border-[#bfa078]/28
          md:border md:border-[#bfa078]/35
          overflow-hidden md:overflow-visible
          ${remoteSession && !isExpanded ? 'md:min-h-0' : density.barClass}
          ${prefs.showGlow ? `bg-gradient-to-r ${theme.accentGlow} via-transparent to-transparent` : ''}
          ${isExpanded ? 'opacity-0 pointer-events-none translate-y-3 md:opacity-100 md:pointer-events-auto md:translate-y-0' : 'opacity-100'}
          ${showMobilePill ? 'max-md:opacity-0 max-md:pointer-events-none max-md:translate-y-3' : ''}
          ${readerDockJoined ? '!z-[141] !border-t-0 reader-dock-joined' : ''}
        `}
        style={typeof window !== 'undefined' && window.matchMedia('(min-width:768px)').matches ? {
          bottom: docked ? 0 : '1.5rem',
          left: docked ? 0 : '2rem',
          right: docked ? 0 : '2rem',
          maxWidth: docked ? '100%' : '72rem',
          marginInline: 'auto',
          borderRadius: docked ? 0 : '1.75rem',
          boxShadow: docked
            ? 'none'
            : '0 24px 60px rgba(0,0,0,0.45), 0 0 48px rgba(191,160,120,0.14), inset 0 1px 0 rgba(241,232,220,0.16)',
        } : undefined}
        onTouchStart={onMiniBarTouchStart}
        onTouchEnd={onMiniBarTouchEnd}
      >
        {/* Integrated remote strip — part of the player (mobile + desktop) */}
        {remoteSession && !isExpanded && (
          <div className="flex items-center gap-2 px-3 md:px-5 pt-2.5 md:pt-2.5 pb-1.5 md:pb-2 border-b border-[#bfa078]/25 bg-[#e2d0ba]/[0.08]">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#bfa078]/45" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#e2d0ba]" />
            </span>
            <MonitorSmartphone className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#e2d0ba] shrink-0" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[11px] md:text-xs font-semibold text-[#f6f8fb] truncate">
                {remoteTrackLabel || 'Autre appareil'}
                {remoteAyahLabel}
                <span className="font-mono text-[#e6d5c2] tabular-nums font-medium">
                  {' · '}{formatTime(liveRemotePos)}
                </span>
              </p>
              <p className="text-[9px] md:text-[10px] text-[#aab7c5] truncate">
                Autre appareil
                {remoteSession.deviceLabel ? ` · ${remoteSession.deviceLabel}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void takeOverRemoteSession();
              }}
              className="brand-button-primary shrink-0 rounded-full px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-[11px] font-bold tap-feedback"
            >
              Basculer ici
            </button>
          </div>
        )}

        <div className="relative flex flex-col md:block">
        <div
          className={`relative flex items-center md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.9fr)_minmax(0,1.15fr)] md:items-center ${density.rowGapClass} ${density.padClass} ${
            remoteSession ? 'pt-2 md:pt-2' : ''
          }`}
        >
        {/* Track info */}
        <div className={`flex items-center min-w-0 flex-1 md:col-span-1 md:pt-0 ${density.rowGapClass}`}>
          <PlayerTooltip label="Changer de récitateur" accentColor={theme.sliderAccentColor} className="inline-flex shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (showReciterPicker && !reciterPickerClosing) closeReciterPicker();
                else openReciterPicker();
              }}
              className="group/disc relative shrink-0"
              aria-label="Changer de récitateur"
              aria-expanded={showReciterPicker && !reciterPickerClosing}
            >
              <span
                className="pointer-events-none absolute -inset-0.5 rounded-[0.85rem] bg-[#e2d0ba]/0 ring-1 ring-[#e2d0ba]/0 transition-all duration-300 group-hover/disc:bg-[#e2d0ba]/[0.07] group-hover/disc:ring-[#e2d0ba]/25 group-active/disc:scale-95"
                aria-hidden
              />
              <span
                className="player-disc-hint pointer-events-none absolute -inset-[3px] rounded-[0.9rem] ring-1 ring-[#e2d0ba]/25 md:hidden"
                aria-hidden
              />
              <div className={`relative ${density.coverClass} bg-[#07111d] border border-[#46607b]/50 md:border-[#bfa078]/30 overflow-hidden flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[width,height] duration-300 group-active/disc:scale-95 md:shadow-[0_8px_24px_rgba(0,0,0,0.35)]`}>
                {hasCover && currentTrack ? (
                  <ReciterPortrait reciter={currentTrack.reciter} alt="" />
                ) : (
                  <Disc className={`${density.discIconClass} ${theme.glowDisc} ${playbackStatus === 'playing' ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
                )}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#bfa078]/35 bg-[#111d2d] text-[#e6d5c2]/90 shadow-md"
                aria-hidden
              >
                <Headphones className="w-2.5 h-2.5" strokeWidth={2.5} />
              </span>
            </button>
          </PlayerTooltip>

          <PlayerTooltip label="Liste des sourates" accentColor={theme.sliderAccentColor} className="min-w-0 flex-1 md:hidden">
            <button
              type="button"
              onClick={togglePlaylist}
              className="min-w-0 w-full overflow-hidden text-left rounded-xl px-0.5 py-1"
              aria-label="Ouvrir la liste des sourates"
            >
            <div className="flex min-w-0 items-center gap-1.5">
              <MarqueeText
                text={currentTrack.surah.name}
                className="min-w-0 flex-1 text-[15px] font-semibold text-[#f6f8fb] leading-tight"
              />
              <AyahSyncBadge moshaf={currentTrack.moshaf} compact className="shrink-0" />
            </div>
            <p className="mt-1 min-w-0 overflow-hidden text-[12px] leading-tight text-[#aab7c5]">
              <MarqueeText
                text={currentTrack.reciter.name}
                className="min-w-0"
              />
            </p>
            </button>
          </PlayerTooltip>

          <PlayerTooltip label="Liste des sourates" accentColor={theme.sliderAccentColor} className="hidden md:block min-w-0 flex-1">
            <button
              type="button"
              onClick={togglePlaylist}
              className="w-full min-w-0 text-left rounded-2xl px-1.5 py-1 tap-feedback hover:bg-[#111d2d]/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078]"
              aria-label="Ouvrir la liste des sourates"
            >
              <p className={`text-[15px] font-bold text-[#f6f8fb] truncate leading-tight ${theme.accentTextHover}`}>
                {String(currentTrack.surah.id).padStart(3, '0')}. {currentTrack.surah.name}
              </p>
              <p className="mt-0.5 flex min-w-0 items-center gap-2 text-[13px] text-[#aab7c5]">
                <span className="truncate">{currentTrack.reciter.name}</span>
                <AyahSyncBadge moshaf={currentTrack.moshaf} compact />
              </p>
            </button>
          </PlayerTooltip>

          {/* Mobile transport — prev / play / next only (tools sit on progress row) */}
          <div
            className={`relative z-[1] flex shrink-0 items-center gap-1.5 md:hidden ${remoteSession ? 'opacity-40' : ''}`}
            data-player-transport
          >
            <button
              type="button"
              disabled={Boolean(remoteSession)}
              onClick={(e) => {
                e.stopPropagation();
                if (remoteSession) return;
                playPrevTrack();
              }}
              className={`${density.skipBtnClass} rounded-full bg-[#111d2d] border border-[#30455c] text-[#e6edf5] flex items-center justify-center tap-feedback disabled:pointer-events-none disabled:grayscale transition-[width,height] duration-300`}
              aria-label="Précédent"
            >
              <SkipBack size={16} color="currentColor" />
            </button>
            <button
              type="button"
              disabled={Boolean(remoteSession)}
              onClick={(e) => {
                e.stopPropagation();
                if (remoteSession) return;
                togglePlay();
              }}
              className={`${density.playBtnClass} rounded-full flex items-center justify-center tap-feedback disabled:pointer-events-none disabled:grayscale transition-[width,height] duration-300 ${
                remoteSession
                  ? 'bg-[#30455c] text-[#95a7ba] shadow-none'
                  : `${theme.accent} text-[#111d2d] shadow-md ${theme.accentShadow}`
              }`}
              aria-label={playbackStatus === 'playing' ? 'Pause' : 'Lecture'}
            >
              {playbackStatus === 'playing' ? (
                <Pause size={18} color="currentColor" />
              ) : (
                <Play size={18} color="currentColor" className="ml-0.5" />
              )}
            </button>
            <button
              type="button"
              disabled={Boolean(remoteSession)}
              onClick={(e) => {
                e.stopPropagation();
                if (remoteSession) return;
                playNextTrack();
              }}
              className={`${density.skipBtnClass} rounded-full bg-[#111d2d] border border-[#30455c] text-[#e6edf5] flex items-center justify-center tap-feedback disabled:pointer-events-none disabled:grayscale transition-[width,height] duration-300`}
              aria-label="Suivant"
            >
              <SkipForward size={16} color="currentColor" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismissTrack();
              }}
              className={`${density.skipBtnClass} rounded-full bg-[#111d2d]/80 border border-[#30455c]/70 text-[#95a7ba] flex items-center justify-center tap-feedback hover:text-[#f6f8fb] transition-[width,height] duration-300`}
              aria-label="Fermer le lecteur"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center controls — desktop (compact, aligned) */}
        <div
          className={`hidden md:flex flex-col items-center justify-center gap-1.5 col-span-1 w-full max-w-[17.5rem] justify-self-center ${
            remoteSession ? 'opacity-40' : ''
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              disabled={Boolean(remoteSession)}
              onClick={() => {
                if (remoteSession) return;
                playPrevTrack();
              }}
              className="h-10 w-10 text-[#c8d1db] hover:text-[#f6f8fb] rounded-full hover:bg-[#111d2d]/70 disabled:pointer-events-none flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078]"
              aria-label="Précédent"
            >
              <SkipBack size={20} color="currentColor" />
            </button>
            <button
              type="button"
              disabled={Boolean(remoteSession)}
              onClick={() => {
                if (remoteSession) return;
                togglePlay();
              }}
              className={`${density.playBtnClass} rounded-full flex items-center justify-center tap-feedback disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078] transition-[width,height] duration-300 ${
                remoteSession
                  ? 'bg-[#30455c] text-[#95a7ba] shadow-none'
                  : `${theme.accent} text-[#111d2d] shadow-lg ${theme.accentShadow}`
              }`}
              aria-label={playbackStatus === 'playing' ? 'Pause' : 'Lecture'}
            >
              {playbackStatus === 'playing' ? (
                <Pause size={20} color="currentColor" />
              ) : (
                <Play size={20} color="currentColor" className="ml-0.5" />
              )}
            </button>
            <button
              type="button"
              disabled={Boolean(remoteSession)}
              onClick={() => {
                if (remoteSession) return;
                playNextTrack();
              }}
              className="h-10 w-10 text-[#c8d1db] hover:text-[#f6f8fb] rounded-full hover:bg-[#111d2d]/70 disabled:pointer-events-none flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078]"
              aria-label="Suivant"
            >
              <SkipForward size={20} color="currentColor" />
            </button>
          </div>
          {!remoteSession && (
            <div className="flex w-full flex-col gap-1">
              <div className="flex w-full items-center gap-2 text-[10px] font-mono font-semibold text-[#95a7ba]">
                <span className="w-9 shrink-0 text-right tabular-nums text-[#e6d5c2]">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => seekTo(parseFloat(e.target.value))}
                  className="min-w-0 flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-[#162538]"
                  style={{ background: theme.sliderBackground(progressPercent), accentColor: theme.sliderAccentColor }}
                  aria-label="Position de lecture"
                  aria-valuemin={0}
                  aria-valuemax={Math.floor(duration || 0)}
                  aria-valuenow={Math.floor(currentTime)}
                  aria-valuetext={`${formatTime(currentTime)} sur ${formatDuration(duration)}`}
                />
                <span className="w-9 shrink-0 tabular-nums">{formatDuration(duration)}</span>
              </div>
              {!isCompactBar ? (
                <AyahProgressIndicator
                  available={ayahSyncAvailable}
                  activeAyah={activeAyah}
                  totalAyahs={totalAyahs}
                  ayahProgress={ayahProgress}
                  onOpenPicker={openAyahPicker}
                  accentColor={theme.sliderAccentColor}
                  variant={ayahBarVariant}
                  className="px-9"
                />
              ) : null}
            </div>
          )}
        </div>

        {/* Right tools — desktop: essentials only */}
        <div className="hidden md:flex items-center justify-end gap-1 shrink-0 md:col-span-1 min-w-0">
          {sleepTimer !== null && (
            <PlayerTooltip label="Minuteur sommeil" accentColor={theme.sliderAccentColor} className="hidden lg:inline-flex">
              <span
                className={`inline-flex h-9 items-center gap-1 rounded-xl border px-2 text-[11px] font-mono font-bold ${theme.accentBgLight} ${theme.accentBorder} ${theme.accentText}`}
              >
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                {formatSleepTime(sleepTimer)}
              </span>
            </PlayerTooltip>
          )}

          <PlayerTooltip label={isReaderOpen ? 'Fermer la lecture' : 'Lire le Coran'} accentColor={theme.sliderAccentColor} className="inline-flex shrink-0">
            <button
              type="button"
              onClick={toggleReader}
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078] ${
                isReaderOpen && !isReaderClosing
                  ? `${theme.accentText} ${theme.accentBgLight}`
                  : 'text-[#aab7c5] hover:text-[#f6f8fb] hover:bg-[#111d2d]/70'
              }`}
              aria-label={isReaderOpen ? 'Fermer la lecture' : 'Lire le Coran'}
              aria-pressed={isReaderOpen && !isReaderClosing}
            >
              <BookOpenText size={18} color="currentColor" />
            </button>
          </PlayerTooltip>

          <div ref={volumeWrapRef} className="relative shrink-0">
            <PlayerTooltip label="Volume" accentColor={theme.sliderAccentColor} className="inline-flex shrink-0" disabled={showVolumePopover}>
              <button
                ref={volumeBtnRef}
                type="button"
                onClick={() => setShowVolumePopover((open) => !open)}
                className={`h-10 w-10 rounded-xl flex items-center justify-center text-[#aab7c5] hover:text-[#f6f8fb] hover:bg-[#111d2d]/70 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078] ${
                  showVolumePopover || isMuted || volume === 0 ? theme.accentText : ''
                }`}
                aria-label="Volume"
                aria-expanded={showVolumePopover}
                aria-haspopup="dialog"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 size={18} color="currentColor" />}
              </button>
            </PlayerTooltip>

            {showVolumePopover &&
              volumePopoverPos &&
              !isExpanded &&
              createPortal(
                <div
                  id="player-volume-popover"
                  role="dialog"
                  aria-label="Réglage du volume"
                  className="fixed z-[150] flex w-52 items-center gap-2.5 rounded-2xl border border-[#bfa078]/30 bg-[#0c1522] p-3 shadow-[0_18px_44px_rgba(0,0,0,0.55),0_0_24px_rgba(191,160,120,0.12)]"
                  style={{
                    bottom: volumePopoverPos.bottom,
                    right: volumePopoverPos.right,
                  }}
                >
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`h-9 w-9 shrink-0 rounded-xl border border-[#30455c] flex items-center justify-center hover:bg-[#111d2d] ${
                      isMuted || volume === 0 ? theme.accentText : 'text-[#d0d9e3]'
                    }`}
                    aria-label={isMuted || volume === 0 ? 'Activer le son' : 'Couper le son'}
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 size={16} color="currentColor" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted || volume === 0 ? 0 : volume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      setIsMuted(v === 0);
                    }}
                    className="min-w-0 flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-[#162538]"
                    style={{
                      accentColor: theme.sliderAccentColor,
                      background: `linear-gradient(to right, ${theme.sliderAccentColor} 0%, ${theme.sliderAccentColor} ${(isMuted || volume === 0 ? 0 : volume) * 100}%, #162538 ${(isMuted || volume === 0 ? 0 : volume) * 100}%, #162538 100%)`,
                    }}
                    aria-label="Volume"
                  />
                  <span className="w-8 shrink-0 text-right text-[10px] font-mono font-bold tabular-nums text-[#e6d5c2]">
                    {Math.round((isMuted || volume === 0 ? 0 : volume) * 100)}
                  </span>
                </div>,
                document.body
              )}
          </div>

          <PlayerTooltip label="Effets audio" accentColor={theme.sliderAccentColor} className="inline-flex shrink-0">
            <button
              type="button"
              onClick={openEffects}
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078] ${
                showEffects
                  ? `${theme.accentText} ${theme.accentBgLight}`
                  : 'text-[#aab7c5] hover:text-[#f6f8fb] hover:bg-[#111d2d]/70'
              }`}
              aria-label="Ouvrir les effets audio"
            >
              <AudioLines
                size={18}
                color="currentColor"
                className={!showEffects && effectsActive ? theme.accentText : ''}
              />
            </button>
          </PlayerTooltip>

          <PlayerTooltip label="Plus d’options" accentColor={theme.sliderAccentColor} className="inline-flex shrink-0">
            <button
              type="button"
              onClick={openPersonalize}
              className={`h-10 w-10 rounded-xl flex items-center justify-center text-[#aab7c5] hover:text-[#f6f8fb] hover:bg-[#111d2d]/70 shrink-0 ${
                showPersonalize ? `${theme.accentText} ${theme.accentBgLight}` : ''
              }`}
              aria-label="Plus d’options"
            >
              <SlidersHorizontal size={18} color="currentColor" />
            </button>
          </PlayerTooltip>
        </div>
        </div>

        {/* Mobile tools + progress / duration */}
        <div className={`relative z-[1] flex items-center md:hidden ${density.toolsClass}`}>
          <PlayerTooltip label={isReaderOpen ? 'Fermer la lecture' : 'Lire le Coran'} accentColor={theme.sliderAccentColor} className="inline-flex shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleReader();
              }}
              className={`h-9 w-9 shrink-0 rounded-full border flex items-center justify-center tap-feedback ${
                isReaderOpen && !isReaderClosing
                  ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}`
                  : 'bg-[#111d2d] border-[#30455c] text-[#e6edf5]'
              }`}
              aria-label={isReaderOpen ? 'Fermer la lecture' : 'Lire le Coran'}
              aria-pressed={isReaderOpen && !isReaderClosing}
            >
              <BookOpenText size={14} color="currentColor" />
            </button>
          </PlayerTooltip>
          <PlayerTooltip label="Effets audio" accentColor={theme.sliderAccentColor} className="inline-flex shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEffects();
              }}
              className={`h-9 w-9 shrink-0 rounded-full border flex items-center justify-center tap-feedback ${
                showEffects
                  ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}`
                  : 'bg-[#111d2d] border-[#30455c]'
              }`}
              aria-label="Effets audio"
            >
              <AudioLines
                size={14}
                color="currentColor"
                className={
                  showEffects
                    ? ''
                    : effectsActive
                      ? theme.accentText
                      : 'text-[#e6edf5]'
                }
              />
            </button>
          </PlayerTooltip>

          {!remoteSession ? (
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-9 shrink-0 text-right text-[11px] font-mono font-semibold tabular-nums text-[#e6d5c2]" aria-live="polite">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => seekTo(parseFloat(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="min-w-0 flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-[#162538]"
                  style={{ background: theme.sliderBackground(progressPercent), accentColor: theme.sliderAccentColor }}
                  aria-label="Position de lecture"
                  aria-valuemin={0}
                  aria-valuemax={Math.floor(duration || 0)}
                  aria-valuenow={Math.floor(currentTime)}
                  aria-valuetext={`${formatTime(currentTime)} sur ${formatDuration(duration)}`}
                />
                <span className="w-9 shrink-0 text-[11px] font-mono font-semibold tabular-nums text-[#95a7ba]">
                  {formatDuration(duration)}
                </span>
              </div>
              {!isCompactBar ? (
                <AyahProgressIndicator
                  available={ayahSyncAvailable}
                  activeAyah={activeAyah}
                  totalAyahs={totalAyahs}
                  ayahProgress={ayahProgress}
                  onOpenPicker={openAyahPicker}
                  accentColor={theme.sliderAccentColor}
                  variant={ayahBarVariant}
                  className="px-9"
                />
              ) : null}
            </div>
          ) : (
            <p className="min-w-0 flex-1 truncate text-[11px] text-[#95a7ba]">
              Lecture sur un autre appareil
            </p>
          )}
        </div>
        </div>
      </div>

      {/* ── Expanded mobile sheet ── */}
      {isExpanded && (
        <div className="fixed inset-0 z-[60] md:hidden flex flex-col bg-[#07111d]">
          <div className={`absolute inset-0 bg-gradient-to-b ${theme.accentGlow} via-transparent to-transparent pointer-events-none`} />

          {/* Clear collapse header */}
          <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-[calc(0.85rem+env(safe-area-inset-top,0px))] pb-3 border-b border-[#111d2d]/80">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-full border border-[#46607b] bg-[#111d2d] text-[#f6f8fb] font-bold text-sm tap-feedback"
              aria-label="Réduire le lecteur"
            >
              <ChevronDown className="w-5 h-5" />
              Réduire
            </button>
            <button
              type="button"
              onClick={openPersonalize}
              className="h-11 w-11 rounded-full border border-[#30455c] flex items-center justify-center text-[#d0d9e3] tap-feedback"
              aria-label="Options"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {remoteSession && (
            <div className="relative z-10 flex items-center gap-2.5 px-4 py-2.5 border-b border-[#bfa078]/25 bg-[#e2d0ba]/[0.08]">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#bfa078]/50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#e2d0ba]" />
              </span>
              <MonitorSmartphone className="w-4 h-4 text-[#e2d0ba] shrink-0" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-xs font-semibold text-[#f6f8fb] truncate">
                  {remoteTrackLabel || 'Autre appareil'}
                  {remoteAyahLabel}
                  <span className="font-mono text-[#e6d5c2] tabular-nums font-medium">
                    {' · '}{formatTime(liveRemotePos)}
                  </span>
                </p>
                <p className="text-[10px] text-[#aab7c5] truncate">
                  Autre appareil
                  {remoteSession.deviceLabel ? ` · ${remoteSession.deviceLabel}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void takeOverRemoteSession();
                }}
                className="brand-button-primary shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold tap-feedback"
              >
                Basculer ici
              </button>
            </div>
          )}

          <div className="relative z-10 flex-1 flex flex-col px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] overflow-y-auto">
            <button
              type="button"
              onClick={togglePlaylist}
              className="text-center w-full tap-feedback mb-6"
            >
              <p className={`text-[11px] font-bold uppercase tracking-widest ${theme.accentText}`}>
                Sourate {currentTrack.surah.id}
              </p>
              <h2 className="text-2xl font-black text-[#f6f8fb] mt-1.5 leading-tight">
                {currentTrack.surah.name}
              </h2>
              {prefs.showArabic && (
                <p className={`font-serif text-xl mt-1.5 ${theme.accentText}`}>
                  {currentTrack.surah.arabicName}
                </p>
              )}
              <p className="mt-2 flex items-center justify-center gap-2 text-sm text-[#aab7c5]">
                <span className="truncate">{currentTrack.reciter.name}</span>
                <AyahSyncBadge moshaf={currentTrack.moshaf} />
              </p>
            </button>

            <PlayerTooltip label="Changer de récitateur" accentColor={theme.sliderAccentColor} className="mx-auto mb-7 block" side="bottom">
              <button
                type="button"
                onClick={openReciterPicker}
                className="block w-28 h-28 rounded-full border border-[#bfa078]/35 bg-[#111d2d]/60 overflow-hidden shadow-[0_0_28px_rgba(191,160,120,0.12)] tap-feedback"
                aria-label="Changer de récitateur"
              >
                {hasCover && currentTrack ? (
                  <ReciterPortrait reciter={currentTrack.reciter} alt="" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Disc className={`w-12 h-12 ${theme.glowDisc} ${playbackStatus === 'playing' ? 'animate-[spin_12s_linear_infinite]' : ''}`} />
                  </div>
                )}
              </button>
            </PlayerTooltip>

            <div className="w-full mb-6">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[#111d2d]"
                style={{ background: theme.sliderBackground(progressPercent), accentColor: theme.sliderAccentColor }}
                aria-label="Position de lecture"
                aria-valuemin={0}
                aria-valuemax={Math.floor(duration || 0)}
                aria-valuenow={Math.floor(currentTime)}
                aria-valuetext={`${formatTime(currentTime)} sur ${formatDuration(duration)}`}
              />
              <div className="flex justify-between text-xs font-mono text-[#aab7c5] mt-2.5" aria-live="polite">
                <span>{formatTime(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
              <AyahProgressIndicator
                available={ayahSyncAvailable}
                activeAyah={activeAyah}
                totalAyahs={totalAyahs}
                ayahProgress={ayahProgress}
                onOpenPicker={openAyahPicker}
                accentColor={theme.sliderAccentColor}
                className="mt-3"
              />
            </div>

            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                type="button"
                onClick={() => jumpBy(-prefs.seekStep)}
                className="w-12 h-12 rounded-full border border-[#30455c] bg-[#111d2d] text-[#d0d9e3] flex items-center justify-center tap-feedback"
                aria-label={`Reculer de ${prefs.seekStep} secondes`}
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={playPrevTrack}
                className="w-12 h-12 rounded-full border border-[#30455c] bg-[#111d2d] text-[#e6edf5] flex items-center justify-center tap-feedback"
                aria-label="Précédent"
              >
                <SkipBack size={24} color="currentColor" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className={`w-[4.25rem] h-[4.25rem] rounded-full ${theme.accent} text-[#111d2d] flex items-center justify-center shadow-xl ${theme.accentShadow} tap-feedback`}
                aria-label={playbackStatus === 'playing' ? 'Pause' : 'Lecture'}
              >
                {playbackStatus === 'playing' ? (
                  <Pause size={32} color="currentColor" />
                ) : (
                  <Play size={32} color="currentColor" className="ml-1" />
                )}
              </button>
              <button
                type="button"
                onClick={playNextTrack}
                className="w-12 h-12 rounded-full border border-[#30455c] bg-[#111d2d] text-[#e6edf5] flex items-center justify-center tap-feedback"
                aria-label="Suivant"
              >
                <SkipForward size={24} color="currentColor" />
              </button>
              <button
                type="button"
                onClick={() => jumpBy(prefs.seekStep)}
                className="w-12 h-12 rounded-full border border-[#30455c] bg-[#111d2d] text-[#d0d9e3] flex items-center justify-center tap-feedback"
                aria-label={`Avancer de ${prefs.seekStep} secondes`}
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={toggleReader}
              className={`mb-3 w-full h-12 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 tap-feedback ${
                isReaderOpen && !isReaderClosing
                  ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}`
                  : 'border-[#bfa078]/40 bg-[#bfa078]/10 text-[#e2d0ba]'
              }`}
            >
              <BookOpenText size={20} color="currentColor" />
              {isReaderOpen ? 'Fermer la lecture' : 'Lire le Coran'}
            </button>

            <div className="grid grid-cols-3 gap-2 mt-auto">
              <button
                type="button"
                onClick={cycleRepeat}
                className={`h-12 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 tap-feedback ${
                  repeatMode !== 'all'
                    ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}`
                    : 'border-[#30455c] text-[#aab7c5]'
                }`}
              >
                <RepeatIcon className="w-4 h-4" />
                {repeatMode === 'one' ? '1' : repeatMode === 'none' ? 'Off' : 'All'}
              </button>
              <button
                type="button"
                onClick={openEffects}
                className={`h-12 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 tap-feedback ${
                  showEffects
                    ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}`
                    : 'border-[#30455c] text-[#d0d9e3]'
                }`}
              >
                <AudioLines
                  size={16}
                  color="currentColor"
                  className={!showEffects && effectsActive ? theme.accentText : ''}
                />
                Effets
              </button>
              <button
                type="button"
                onClick={() => setShowVolumePopover(true)}
                className="h-12 rounded-2xl border border-[#30455c] text-xs font-bold text-[#d0d9e3] flex items-center justify-center gap-1.5 tap-feedback"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 size={16} color="currentColor" />}
                Volume
              </button>
            </div>

            {/* Always-visible collapse CTA at bottom */}
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="mt-4 w-full h-12 rounded-2xl border border-[#46607b] bg-[#111d2d]/82 text-[#f6f8fb] font-bold text-sm flex items-center justify-center gap-2 tap-feedback"
            >
              <ChevronDown className="w-5 h-5" />
              Réduire le lecteur
            </button>
          </div>

          {/* Mobile volume sheet */}
          {showVolumePopover && (
            <div className="absolute inset-0 z-20 flex items-end bg-[#07111d]/65" onClick={() => setShowVolumePopover(false)}>
              <div
                className="w-full rounded-t-3xl border border-[#30455c] bg-[#07111d] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-[#f6f8fb]">Volume</span>
                  <span className={`text-sm font-mono font-bold ${theme.accentText}`}>
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={toggleMute} className="h-11 w-11 rounded-full border border-[#30455c] flex items-center justify-center text-[#d0d9e3]" aria-label={isMuted || volume === 0 ? 'Activer le son' : 'Couper le son'}>
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 size={20} color="currentColor" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted || volume === 0 ? 0 : volume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      setIsMuted(v === 0);
                    }}
                    className="flex-1 h-2 rounded appearance-none cursor-pointer bg-[#162538]"
                    style={{ accentColor: theme.sliderAccentColor }}
                    aria-label="Volume"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowVolumePopover(false)}
                  className="mt-4 w-full h-11 rounded-xl border border-[#46607b] text-sm font-bold text-[#e6edf5]"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Personalization panel ── */}
      {showPersonalize && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-[#07111d]/70 backdrop-blur-sm" aria-label="Fermer" onClick={() => setShowPersonalize(false)} />
          <div className="relative z-10 w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[#30455c] bg-[#07111d] shadow-2xl sm:mx-4 animate-[slide-up_0.28s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-[#111d2d] bg-[#07111d]/95 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className={`h-9 w-9 rounded-xl flex items-center justify-center ${theme.accentBgLight} ${theme.accentText}`}>
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-[#f6f8fb]">Personnaliser</h3>
                  <p className="text-[11px] text-[#95a7ba]">Player Bar V2</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowPersonalize(false)} className="h-9 w-9 rounded-full border border-[#30455c] flex items-center justify-center text-[#aab7c5]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-6">
              {/* Theme */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#95a7ba]">Thème</h4>
                  <span className="text-[11px] text-[#b4c0ce]">{theme.name}</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {PLAYER_THEME_IDS.map((id) => {
                    const t = PLAYER_THEMES[id];
                    const active = playerTheme === id;
                    return (
                      <PlayerTooltip key={id} label={t.name} accentColor={t.sliderAccentColor} side="bottom" className="block w-full">
                        <button
                          type="button"
                          onClick={() => setPlayerTheme(id)}
                          className={`h-10 w-full rounded-xl border flex items-center justify-center ${active ? `ring-2 ${t.accentRing} ${t.accentBorderActive}` : 'border-[#30455c]'}`}
                          style={{ backgroundColor: `${t.sliderAccentColor}22` }}
                          aria-label={t.name}
                          aria-pressed={active}
                        >
                          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: t.sliderAccentColor }} />
                        </button>
                      </PlayerTooltip>
                    );
                  })}
                </div>
              </section>

              {/* Density */}
              <section>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#95a7ba] mb-2">Densité de la barre</h4>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(DENSITY_META) as PlayerBarDensity[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updatePref('density', key)}
                      className={`rounded-xl border px-2 py-2.5 text-xs font-bold ${
                        prefs.density === key
                          ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}`
                          : 'border-[#30455c] text-[#aab7c5]'
                      }`}
                    >
                      {DENSITY_META[key].label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Desktop chrome */}
              <section className="hidden md:block">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#95a7ba] mb-2">Affichage desktop</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (docked) toggleDocked();
                    }}
                    className={`rounded-xl border px-2 py-2.5 text-xs font-bold ${
                      !docked
                        ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}`
                        : 'border-[#30455c] text-[#aab7c5]'
                    }`}
                  >
                    Flottant
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!docked) toggleDocked();
                    }}
                    className={`rounded-xl border px-2 py-2.5 text-xs font-bold ${
                      docked
                        ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}`
                        : 'border-[#30455c] text-[#aab7c5]'
                    }`}
                  >
                    Plein bas
                  </button>
                </div>
              </section>

              {/* Seek step */}
              <section>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#95a7ba] mb-2">Saut temporel</h4>
                <div className="grid grid-cols-3 gap-2">
                  {([5, 10, 15] as SeekStepSeconds[]).map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => updatePref('seekStep', step)}
                      className={`rounded-xl border px-2 py-2.5 text-xs font-bold ${
                        prefs.seekStep === step
                          ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}`
                          : 'border-[#30455c] text-[#aab7c5]'
                      }`}
                    >
                      ±{step}s
                    </button>
                  ))}
                </div>
              </section>

              {/* Speed */}
              <section>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#95a7ba] mb-2">Vitesse</h4>
                <div className="flex flex-wrap gap-1.5">
                  {speedOptions.map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold ${
                        playbackSpeed === speed
                          ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}`
                          : 'border-[#30455c] text-[#aab7c5]'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </section>

              {/* Repeat */}
              <section>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#95a7ba] mb-2">Répétition</h4>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'all' as const, label: 'Toutes' },
                    { id: 'one' as const, label: 'Une' },
                    { id: 'none' as const, label: 'Off' },
                  ]).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setRepeatMode(mode.id)}
                      className={`rounded-xl border px-2 py-2.5 text-xs font-bold ${
                        repeatMode === mode.id
                          ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}`
                          : 'border-[#30455c] text-[#aab7c5]'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Sleep */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#95a7ba]">Minuteur</h4>
                  {sleepTimer !== null && (
                    <span className={`text-[10px] font-mono font-bold ${theme.accentText} flex items-center gap-1`}>
                      <Clock className="w-3 h-3" /> {formatSleepTime(sleepTimer)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { value: null, label: 'Off' },
                    { value: 15 * 60, label: '15m' },
                    { value: 30 * 60, label: '30m' },
                    { value: 45 * 60, label: '45m' },
                    { value: 60 * 60, label: '1h' },
                  ].map((opt) => {
                    const active =
                      (opt.value === null && sleepTimer === null) ||
                      (opt.value !== null && sleepTimer !== null && Math.abs(sleepTimer - opt.value) < 10);
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setSleepTimer(opt.value)}
                        className={`py-2 rounded-xl border text-[10px] font-bold ${
                          active
                            ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}`
                            : 'border-[#30455c] text-[#aab7c5]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Audio effects shortcut */}
              <section>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#95a7ba] mb-2">Son</h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowPersonalize(false);
                    openEffects();
                  }}
                  className={`w-full flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left ${
                    effectsActive ? `${theme.accentBorder} ${theme.accentBgLight}` : 'border-[#30455c] bg-[#111d2d]/40'
                  }`}
                >
                  <span className="flex items-center gap-2.5 text-sm text-[#e6edf5]">
                    <AudioLines
                      size={16}
                      color="currentColor"
                      className={effectsActive ? theme.accentText : 'text-[#95a7ba]'}
                    />
                    Effets audio
                    {effectsActive && activeEffectLabel && (
                      <span className={`text-[10px] font-bold ${theme.accentText}`}>
                        {activeEffectLabel}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-bold text-[#95a7ba]">Ouvrir</span>
                </button>
              </section>

              {/* Toggles */}
              <section className="flex flex-col gap-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#95a7ba] mb-1">Affichage</h4>
                {(
                  [
                    { key: 'showArabic' as const, label: 'Afficher le nom arabe', icon: Moon },
                    { key: 'showGlow' as const, label: 'Lueur thématique', icon: Sparkles },
                    { key: 'showQuickControls' as const, label: 'Raccourcis (repeat / vitesse)', icon: Gauge },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const on = prefs[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => updatePref(item.key, !on)}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left ${
                        on ? `${theme.accentBorder} ${theme.accentBgLight}` : 'border-[#30455c] bg-[#111d2d]/40'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 text-sm text-[#e6edf5]">
                        <Icon className={`w-4 h-4 ${on ? theme.accentText : 'text-[#95a7ba]'}`} />
                        {item.label}
                      </span>
                      <span className={`h-5 w-5 rounded-full border flex items-center justify-center ${on ? `${theme.accent} border-transparent text-[#111d2d]` : 'border-[#46607b] text-transparent'}`}>
                        <Check className="w-3 h-3" />
                      </span>
                    </button>
                  );
                })}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ── Audio effects panel ── */}
      {showEffects && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Effets audio">
          <button type="button" className="absolute inset-0 bg-[#07111d]/70 backdrop-blur-sm" aria-label="Fermer" onClick={() => setShowEffects(false)} />
          <div className="relative z-10 w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[#30455c] bg-[#07111d] shadow-2xl sm:mx-4 animate-[slide-up_0.28s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-[#111d2d] bg-[#07111d]/95 backdrop-blur">
              <h3 className="font-bold text-[#f6f8fb]">Effets audio</h3>
              <button type="button" onClick={() => setShowEffects(false)} className="h-9 w-9 rounded-full border border-[#30455c] flex items-center justify-center text-[#aab7c5]" aria-label="Fermer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              <AudioEffectsPanel
                effects={audioEffects}
                supported={effectsSupported}
                theme={{
                  accentText: theme.accentText,
                  accentBgLight: theme.accentBgLight,
                  accentBorderActive: theme.accentBorderActive,
                  sliderAccentColor: theme.sliderAccentColor,
                }}
                onChange={setAudioEffects}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Surah list — docked / fused with the player bar (same as Coran reader) ── */}
      {showPlaylist && playerBarAnchor && (
        <div
          className="pointer-events-none fixed inset-0 z-[140]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="player-playlist-title"
        >
          <button
            type="button"
            className={`player-reader-backdrop absolute inset-0 bg-[#07111d]/68 backdrop-blur-[10px] ${
              playlistClosing ? 'is-closing pointer-events-none' : 'pointer-events-auto'
            }`}
            aria-label="Fermer"
            onClick={closePlaylist}
            tabIndex={playlistClosing ? -1 : 0}
          />
          <div
            className={`player-reader-dock pointer-events-auto absolute z-10 flex flex-col overflow-hidden ${
              playlistClosing ? 'is-closing' : ''
            } ${playlistEntranceDone && !playlistClosing ? 'is-settled' : ''}`}
            style={{
              left: playerBarAnchor.left,
              width: playerBarAnchor.width,
              bottom: Math.max(0, playerBarAnchor.bottom - 1),
              height: `min(72dvh, calc(100dvh - ${playerBarAnchor.bottom}px - 1rem))`,
              maxHeight: `calc(100dvh - ${playerBarAnchor.bottom}px - env(safe-area-inset-top, 0px))`,
              borderTopLeftRadius: playerBarAnchor.borderRadius,
              borderTopRightRadius: playerBarAnchor.borderRadius,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            }}
          >
            {/* Header — same language as Coran reader dock */}
            <div className="relative isolate shrink-0 border-b border-[#30455c]/40">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(241,232,220,0.14),transparent_52%),linear-gradient(180deg,rgba(22,37,56,0.5)_0%,transparent_100%)]"
                aria-hidden
              />
              <div className="relative z-10 px-3 pt-1.5 pb-3 md:px-4">
                <div className="mb-1.5 flex justify-center">
                  <span className="h-0.5 w-8 rounded-full bg-[#bfa078]/40" aria-hidden />
                </div>

                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#bfa078]/28 bg-[#07111d]/55 text-[#bfa078]"
                    aria-hidden
                  >
                    <ListMusic className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3
                      id="player-playlist-title"
                      className="truncate text-[0.95rem] font-black tracking-tight text-[#f6f8fb] md:text-base"
                    >
                      Sourates
                    </h3>
                    <p className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[11px] font-medium text-[#7a8fa3]">
                      <span className="truncate">{currentTrack.reciter.name}</span>
                      <AyahSyncBadge moshaf={currentTrack.moshaf} compact />
                      <span className="shrink-0 text-[#5f7388]">·</span>
                      <span className="shrink-0">{filteredSurahs.length} titres</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closePlaylist}
                    disabled={playlistClosing}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#46607b]/45 bg-[#0a1420]/80 text-[#aab7c5] hover:border-[#bfa078]/35 hover:text-[#f6f8fb] disabled:opacity-50"
                    aria-label="Fermer la liste"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Search */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#95a7ba]" aria-hidden />
                    <input
                      type="search"
                      value={drawerSearch}
                      onChange={(e) => setDrawerSearch(e.target.value)}
                      placeholder="Nom, numéro ou arabe…"
                      aria-label="Rechercher une sourate dans la liste"
                      className="w-full min-h-10 rounded-xl border border-[#30455c]/65 bg-[#111d2d]/88 py-2 pl-9 pr-9 text-sm text-[#e6edf5] placeholder:text-[#8295aa] focus:border-[#bfa078]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#bfa078]/55"
                    />
                    {drawerSearch && (
                      <button
                        type="button"
                        onClick={() => setDrawerSearch('')}
                        aria-label="Effacer la recherche"
                        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#162538] text-[#aab7c5]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {selectedSurahIds.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSurahIds(new Set())}
                      className="shrink-0 rounded-xl border border-[#bfa078]/28 bg-[#e2d0ba]/10 px-2.5 py-2 text-[11px] font-bold text-[#e6d5c2]"
                    >
                      Boucle {selectedSurahIds.size}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              <ul className="flex flex-col gap-1">
                {filteredSurahs.map((surah) => {
                  const isCurrent = currentTrack.surah.id === surah.id;
                  const isPlaying = isCurrent && playbackStatus === 'playing';
                  const inLoop = selectedSurahIds.has(surah.id);
                  return (
                    <li key={surah.id}>
                      <div
                        className={`group flex items-center gap-1 rounded-2xl border px-1.5 py-1 transition-all ${
                          isCurrent
                            ? 'border-[#bfa078]/30 bg-[#e2d0ba]/[0.08]'
                            : inLoop
                              ? 'border-[#bfa078]/18 bg-[#e2d0ba]/[0.04]'
                              : 'border-transparent hover:border-[#30455c]/50 hover:bg-[#111d2d]/80'
                        }`}
                      >
                        <button
                          ref={isCurrent ? currentSurahRowRef : undefined}
                          type="button"
                          onClick={() => {
                            if (isCurrent) togglePlay();
                            else {
                              playTrack(currentTrack.reciter, currentTrack.moshaf, surah);
                              closePlaylist();
                            }
                          }}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1.5 text-left"
                        >
                          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                            <span
                              className={`absolute inset-0 rotate-45 rounded-[0.6rem] border ${
                                isCurrent
                                  ? 'border-[#bfa078]/45 bg-[#07111d]/90'
                                  : 'border-[#46607b]/70 bg-[#07111d] group-hover:border-[#95a7ba]'
                              }`}
                              aria-hidden
                            />
                            <span
                              className={`relative z-10 text-[11px] font-bold tabular-nums ${
                                isCurrent ? 'text-[#e6d5c2]' : 'text-[#aab7c5]'
                              }`}
                            >
                              {isPlaying ? (
                                <span className="flex h-3.5 w-3.5 items-end justify-center gap-0.5">
                                  <span className="h-full w-0.5 animate-[shimmer_0.6s_infinite_alternate] rounded-full bg-[#e2d0ba]" />
                                  <span className="h-2/3 w-0.5 animate-[shimmer_0.6s_infinite_alternate] rounded-full bg-white/80" style={{ animationDelay: '0.2s' }} />
                                  <span className="h-full w-0.5 animate-[shimmer_0.6s_infinite_alternate] rounded-full bg-[#7990a1]" style={{ animationDelay: '0.4s' }} />
                                </span>
                              ) : (
                                surah.id
                              )}
                            </span>
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-[13px] font-bold leading-tight ${isCurrent ? 'text-[#f8fbff]' : 'text-[#f1f5f9]'}`}>
                              {surah.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] font-medium text-[#95a7ba]">
                              {surah.translation}
                            </span>
                          </span>

                          {prefs.showArabic && (
                            <span
                              className={`arabic-text hidden shrink-0 font-serif text-xl tracking-wide min-[400px]:inline ${
                                isCurrent ? 'text-[#e6d5c2]' : 'text-[#c8d4e0]'
                              }`}
                            >
                              {surah.arabicName}
                            </span>
                          )}
                        </button>

                        <PlayerTooltip
                          label={inLoop ? 'Retirer de la boucle' : 'Ajouter à la boucle'}
                          accentColor={theme.sliderAccentColor}
                          className="inline-flex shrink-0"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSurahInPlaylist(surah.id)}
                            className={`mr-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all ${
                              inLoop
                                ? `${theme.accent} text-[#111d2d]`
                                : 'text-[#8295aa] hover:bg-[#162538] hover:text-[#f6f8fb]'
                            }`}
                            aria-pressed={inLoop}
                            aria-label={inLoop ? `Retirer ${surah.name} de la boucle` : `Ajouter ${surah.name} à la boucle`}
                          >
                            <Repeat className="h-3.5 w-3.5" />
                          </button>
                        </PlayerTooltip>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {filteredSurahs.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                  <Search className="h-5 w-5 text-[#5f7388]" />
                  <p className="text-sm text-[#aab7c5]">Aucune sourate pour « {drawerSearch} »</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reciter picker — docked with the player bar ── */}
      {showReciterPicker && playerBarAnchor && (
        <div
          className="pointer-events-none fixed inset-0 z-[140]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="player-reciter-picker-title"
        >
          <button
            type="button"
            className={`player-reader-backdrop absolute inset-0 bg-[#07111d]/68 backdrop-blur-[10px] ${
              reciterPickerClosing ? 'is-closing pointer-events-none' : 'pointer-events-auto'
            }`}
            aria-label="Fermer"
            onClick={closeReciterPicker}
            tabIndex={reciterPickerClosing ? -1 : 0}
          />
          <div
            className={`player-reader-dock pointer-events-auto absolute z-10 flex flex-col overflow-hidden ${
              reciterPickerClosing ? 'is-closing' : ''
            } ${reciterPickerEntranceDone && !reciterPickerClosing ? 'is-settled' : ''}`}
            style={{
              left: playerBarAnchor.left,
              width: playerBarAnchor.width,
              bottom: Math.max(0, playerBarAnchor.bottom - 1),
              height: `min(72dvh, calc(100dvh - ${playerBarAnchor.bottom}px - 1rem))`,
              maxHeight: `calc(100dvh - ${playerBarAnchor.bottom}px - env(safe-area-inset-top, 0px))`,
              borderTopLeftRadius: playerBarAnchor.borderRadius,
              borderTopRightRadius: playerBarAnchor.borderRadius,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            }}
          >
            <div className="relative isolate shrink-0 border-b border-[#30455c]/40">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(241,232,220,0.14),transparent_52%),linear-gradient(180deg,rgba(22,37,56,0.5)_0%,transparent_100%)]"
                aria-hidden
              />
              <div className="relative z-10 px-3 pt-1.5 pb-3 md:px-4">
                <div className="mb-1.5 flex justify-center">
                  <span className="h-0.5 w-8 rounded-full bg-[#bfa078]/40" aria-hidden />
                </div>

                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#bfa078]/28 bg-[#07111d]/55 text-[#bfa078]"
                    aria-hidden
                  >
                    <Headphones className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3
                      id="player-reciter-picker-title"
                      className="truncate text-[0.95rem] font-black tracking-tight text-[#f6f8fb] md:text-base"
                    >
                      Récitateurs
                    </h3>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-[#7a8fa3]">
                      {currentTrack.surah.name}
                      <span className="text-[#5f7388]"> · </span>
                      {filteredReciters.length} voix
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeReciterPicker}
                    disabled={reciterPickerClosing}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#46607b]/45 bg-[#0a1420]/80 text-[#aab7c5] hover:border-[#bfa078]/35 hover:text-[#f6f8fb] disabled:opacity-50"
                    aria-label="Fermer la liste"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="relative mt-3 min-w-0">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#95a7ba]" aria-hidden />
                  <input
                    type="search"
                    value={reciterSearch}
                    onChange={(e) => setReciterSearch(e.target.value)}
                    placeholder="Rechercher un récitateur…"
                    aria-label="Rechercher un récitateur"
                    className="w-full min-h-10 rounded-xl border border-[#30455c]/65 bg-[#111d2d]/88 py-2 pl-9 pr-9 text-sm text-[#e6edf5] placeholder:text-[#8295aa] focus:border-[#bfa078]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#bfa078]/55"
                  />
                  {reciterSearch ? (
                    <button
                      type="button"
                      onClick={() => setReciterSearch('')}
                      aria-label="Effacer la recherche"
                      className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#162538] text-[#aab7c5]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              <ul className="flex flex-col gap-1" role="listbox" aria-label="Choisir un récitateur">
                {filteredReciters.map((reciter) => {
                  const isCurrent = currentTrack.reciter.id === reciter.id;
                  const moshaf = pickMoshafForSurah(reciter, currentTrack.surah.id);
                  return (
                    <li key={reciter.id}>
                      <button
                        ref={isCurrent ? currentReciterRowRef : undefined}
                        type="button"
                        role="option"
                        aria-selected={isCurrent}
                        disabled={!moshaf || Boolean(remoteSession)}
                        onClick={() => {
                          if (isCurrent) {
                            closeReciterPicker();
                            return;
                          }
                          selectReciter(reciter);
                        }}
                        className={`group flex w-full items-center gap-3 rounded-2xl border px-2.5 py-2 text-left transition-all tap-feedback disabled:opacity-45 ${
                          isCurrent
                            ? 'border-[#bfa078]/30 bg-[#e2d0ba]/[0.08]'
                            : 'border-transparent hover:border-[#30455c]/50 hover:bg-[#111d2d]/80'
                        }`}
                      >
                        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#46607b]/45 bg-[#07111d]">
                          <ReciterPortrait reciter={reciter} alt="" />
                          {isCurrent ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-[#07111d]/45">
                              <Check className="h-4 w-4 text-[#e2d0ba]" strokeWidth={2.6} />
                            </span>
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-[13px] font-bold leading-tight ${isCurrent ? 'text-[#f8fbff]' : 'text-[#f1f5f9]'}`}>
                            {reciter.name}
                          </span>
                          {moshaf ? (
                            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-[#95a7ba]">
                              <span className="truncate">{moshaf.name}</span>
                              <AyahSyncBadge moshaf={moshaf} compact />
                            </span>
                          ) : (
                            <span className="mt-0.5 block text-[11px] text-[#7a8fa3]">
                              Sourate indisponible
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {filteredReciters.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <Search className="h-5 w-5 text-[#5f7388]" />
                  <p className="text-sm text-[#aab7c5]">
                    {reciterSearch
                      ? `Aucun récitateur pour « ${reciterSearch} »`
                      : 'Aucun récitateur pour cette sourate'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <SurahReaderSheet
        open={isReaderOpen}
        closing={isReaderClosing}
        surah={currentTrack.surah}
        moshaf={currentTrack.moshaf}
        reciter={currentTrack.reciter}
        onRequestClose={beginCloseReader}
        onCloseComplete={finishCloseReader}
        anchor={playerBarAnchor}
      />

      <AyahPickerSheet
        open={showAyahPicker}
        onClose={() => setShowAyahPicker(false)}
        surah={currentTrack.surah}
        moshaf={currentTrack.moshaf}
        reciter={currentTrack.reciter}
      />
    </>
  );
};

export default GlobalPlayerV2;
