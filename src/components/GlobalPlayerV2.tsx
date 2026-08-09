import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAudio } from '../context/AudioContext';
import {
  Play, Pause, SkipForward, SkipBack, ChevronDown, ChevronUp, Volume2, VolumeX,
  Disc, ListMusic, Search, X, Settings, Sparkles, Check, Moon, Repeat,
  Repeat1, Clock, RotateCcw, RotateCw, Gauge, Maximize2, SlidersHorizontal, MonitorSmartphone,
  SlidersVertical, BookOpen
} from '../icons/motion';
import { PLAYER_THEMES, PLAYER_THEME_IDS, type PlayerThemeId } from './player/playerThemes';
import {
  type PlayerBarDensity,
  type PlayerV2Prefs,
  type SeekStepSeconds,
} from './player/playerV2Prefs';
import { AudioEffectsPanel } from './player/AudioEffectsPanel';
import { AUDIO_EFFECT_PRESETS, effectsNeedProcessing } from '../audio/effectsTypes';
import { ReciterPortrait } from './ReciterPortrait';
import { SURAHS } from '../data/surahs';
import { SurahReaderSheet, usePlayerBarAnchor } from './SurahReaderSheet';
import { useReaderPrefs } from './reader/readerPrefs';
import { AyahSyncBadge } from './AyahSyncBadge';

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

const DENSITY_META: Record<PlayerBarDensity, { label: string; barClass: string; padClass: string }> = {
  compact: {
    label: 'Compacte',
    barClass: 'md:min-h-[4.75rem]',
    padClass: 'md:py-2 md:px-5',
  },
  comfortable: {
    label: 'Confort',
    barClass: 'md:min-h-[5.5rem]',
    padClass: 'md:py-2.5 md:px-6',
  },
  expanded: {
    label: 'Large',
    barClass: 'md:min-h-[6.25rem]',
    padClass: 'md:py-3 md:px-6',
  },
};

export const GlobalPlayerV2: React.FC<{
  /** Sync with navbar: dock = floating player, classic = full-bleed bottom bar */
  desktopChrome?: 'dock' | 'classic';
  onDesktopChromeChange?: (style: 'dock' | 'classic') => void;
}> = ({ desktopChrome, onDesktopChromeChange }) => {
  const {
    currentTrack,
    playbackStatus,
    currentTime,
    duration,
    volume,
    playbackSpeed,
    togglePlay,
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
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [showVolumePopover, setShowVolumePopover] = useState(false);

  const openReader = () => {
    if (isReaderClosing) return;
    setIsExpanded(false);
    setShowPlaylist(false);
    setPlaylistClosing(false);
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

  /** Chrome join only while fully open — restores during close (no late snap) */
  const readerDockJoined = isReaderOpen && !isReaderClosing;
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
  const currentSurahRowRef = useRef<HTMLButtonElement | null>(null);
  const volumeWrapRef = useRef<HTMLDivElement | null>(null);
  const playerBarRef = useRef<HTMLDivElement | null>(null);

  const swipeStartYRef = useRef<number | null>(null);
  const [liveRemotePos, setLiveRemotePos] = useState(0);
  const remoteClockAnchorRef = useRef<{ pos: number; at: number; key: string } | null>(null);

  const theme = PLAYER_THEMES[(playerTheme as PlayerThemeId)] || PLAYER_THEMES.emerald;
  const density = DENSITY_META[prefs.density] || DENSITY_META.expanded;
  const readerTopRadius =
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 768px)').matches &&
    !docked
      ? '1.75rem'
      : '0px';
  const playerBarAnchor = usePlayerBarAnchor(playerBarRef, isReaderOpen, {
    topRadius: readerTopRadius,
    deps: [docked, density.barClass, remoteSession, isExpanded, prefs.density, isReaderClosing],
  });
  const hasCover = Boolean(currentTrack);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const speedOptions = [0.75, 0.9, 1, 1.25, 1.5, 1.75, 2];

  const onMiniBarTouchStart = (e: React.TouchEvent) => {
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

  useEffect(() => {
    if (!showPlaylist && !showPersonalize && !showEffects) return;
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
  }, [showPlaylist, showPersonalize, showEffects]);

  useEffect(() => {
    if (!currentTrack || remoteSession) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (showPlaylist || showPersonalize || showEffects) return;

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

  useEffect(() => {
    if (!showVolumePopover) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (volumeWrapRef.current && !volumeWrapRef.current.contains(target)) {
        setShowVolumePopover(false);
      }
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
    setShowPersonalize(false);
    setShowVolumePopover(false);
    setPlaylistClosing(false);
    setShowPlaylist(true);
  };

  const closePlaylist = () => {
    if (playlistClosing) return;
    setPlaylistClosing(true);
    window.setTimeout(() => {
      setShowPlaylist(false);
      setPlaylistClosing(false);
      setDrawerSearch('');
    }, 240);
  };

  const openPersonalize = () => {
    setIsReaderOpen(false);
    setIsReaderClosing(false);
    setShowPlaylist(false);
    setPlaylistClosing(false);
    setShowVolumePopover(false);
    setShowEffects(false);
    setShowPersonalize(true);
  };

  const openEffects = () => {
    setIsReaderOpen(false);
    setIsReaderClosing(false);
    setShowPlaylist(false);
    setPlaylistClosing(false);
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

  return (
    <>
      {/* ── Mini bar: full-width on mobile, large desktop player bar ── */}
      <div
        ref={playerBarRef}
        className={`fixed z-[50] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]
          max-md:left-0 max-md:right-0 max-md:w-full max-md:max-w-none
          max-md:bottom-[calc(4.35rem+env(safe-area-inset-bottom,0px))]
          md:z-[51] rounded-none
          mobile-dock-chrome mobile-dock-player glass-panel-opaque
          border-0 max-md:border-t max-md:border-[#c9a06a]/18
          md:border md:border-[#c9a06a]/25
          overflow-hidden md:overflow-hidden
          ${remoteSession && !isExpanded ? 'md:min-h-0' : density.barClass}
          ${prefs.showGlow ? `bg-gradient-to-r ${theme.accentGlow} via-transparent to-transparent` : ''}
          ${isExpanded ? 'opacity-0 pointer-events-none translate-y-3 md:opacity-100 md:pointer-events-auto md:translate-y-0' : 'opacity-100'}
          ${readerDockJoined ? 'max-md:!z-[53] !border-t-0 reader-dock-joined' : ''}
        `}
        style={typeof window !== 'undefined' && window.matchMedia('(min-width:768px)').matches ? {
          bottom: docked ? 0 : '1.5rem',
          left: docked ? 0 : '2rem',
          right: docked ? 0 : '2rem',
          maxWidth: docked ? '100%' : '72rem',
          marginInline: 'auto',
          borderRadius: docked ? 0 : '1.75rem',
          boxShadow: docked ? 'none' : '0 24px 60px rgba(0,0,0,0.45), 0 0 40px rgba(201,160,106,0.08)',
        } : undefined}
        onTouchStart={onMiniBarTouchStart}
        onTouchEnd={onMiniBarTouchEnd}
      >
        {/* Integrated remote strip — part of the player (mobile + desktop) */}
        {remoteSession && !isExpanded && (
          <div className="flex items-center gap-2 px-3 md:px-5 pt-2.5 md:pt-2.5 pb-1.5 md:pb-2 border-b border-[#c9a06a]/25 bg-[#e4ccb4]/[0.08]">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c9a06a]/45" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#e4ccb4]" />
            </span>
            <MonitorSmartphone className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#e4ccb4] shrink-0" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[11px] md:text-xs font-semibold text-[#f6f8fb] truncate">
                {remoteTrackLabel || 'Autre appareil'}
                <span className="font-mono text-[#e8d4bc] tabular-nums font-medium">
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
          className={`relative flex items-center gap-2 md:gap-4 lg:gap-6 md:grid md:grid-cols-[minmax(0,1fr)_minmax(260px,1.15fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(260px,1.15fr)_minmax(0,1.35fr)] md:items-center px-2 pt-2 pb-1.5 ${density.padClass} ${
            remoteSession ? 'pt-2 md:pt-2.5' : ''
          }`}
        >
        {/* Track info */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 md:col-span-1 md:gap-4 md:pt-0">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="group/disc relative shrink-0 md:pointer-events-none"
            title="Agrandir le lecteur en plein écran"
            aria-label="Agrandir le lecteur en plein écran"
          >
            <span
              className="pointer-events-none absolute -inset-0.5 rounded-[0.85rem] bg-[#e4ccb4]/0 ring-1 ring-[#e4ccb4]/0 transition-all duration-300 md:hidden group-hover/disc:bg-[#e4ccb4]/[0.07] group-hover/disc:ring-[#e4ccb4]/25 group-active/disc:scale-95"
              aria-hidden
            />
            <span
              className="player-disc-hint pointer-events-none absolute -inset-[3px] rounded-[0.9rem] ring-1 ring-[#e4ccb4]/25 md:hidden"
              aria-hidden
            />
            <div className="relative w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-[#07111d] border border-[#46607b]/50 md:border-[#c9a06a]/30 overflow-hidden flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-transform duration-150 group-active/disc:scale-95 md:group-active/disc:scale-100 md:shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
              {hasCover && currentTrack ? (
                <ReciterPortrait reciter={currentTrack.reciter} alt="" />
              ) : (
                <Disc className={`w-5 h-5 md:w-7 md:h-7 ${theme.glowDisc} ${playbackStatus === 'playing' ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
              )}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#c9a06a]/35 bg-[#111d2d] text-[#e8d4bc]/90 shadow-md md:hidden"
              aria-hidden
            >
              <Maximize2 className="w-2.5 h-2.5" strokeWidth={2.5} />
            </span>
          </button>

          <button
            type="button"
            onClick={openPlaylist}
            className="min-w-0 flex-1 overflow-hidden text-left rounded-xl px-0.5 py-1 md:hidden"
            title="Liste des sourates"
            aria-label="Ouvrir la liste des sourates"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <MarqueeText
                text={currentTrack.surah.name}
                className="min-w-0 flex-1 text-sm font-semibold text-[#f6f8fb] leading-tight"
              />
              <AyahSyncBadge moshaf={currentTrack.moshaf} compact className="shrink-0" />
            </div>
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] leading-tight">
              <MarqueeText
                text={currentTrack.reciter.name}
                className="min-w-0 flex-1 text-[#aab7c5]"
              />
              {!remoteSession && (
                <span className="shrink-0 tabular-nums text-[#e8d4bc] font-medium" aria-live="polite">
                  {formatTime(currentTime)}
                </span>
              )}
            </p>
          </button>

          <button
            type="button"
            onClick={openPlaylist}
            className="hidden md:block min-w-0 flex-1 text-left rounded-2xl px-1.5 py-1 tap-feedback hover:bg-[#111d2d]/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a06a]"
            title="Liste des sourates"
            aria-label="Ouvrir la liste des sourates"
          >
            <p className={`text-base font-bold text-[#f6f8fb] truncate leading-tight ${theme.accentTextHover}`}>
              {String(currentTrack.surah.id).padStart(3, '0')}. {currentTrack.surah.name}
            </p>
            <p className="text-sm text-[#b4c0ce] mt-1 flex min-w-0 items-center gap-2">
              <span className="truncate">{currentTrack.reciter.name}</span>
              <AyahSyncBadge moshaf={currentTrack.moshaf} compact />
              {prefs.showArabic && (
                <span className="ml-0.5 shrink-0 font-serif text-[12px] text-[#9fb1c3]">
                  {currentTrack.surah.arabicName}
                </span>
              )}
            </p>
          </button>

          {/* Mobile primary controls — read / effects / prev / play / next */}
          <div
            className="relative z-[1] flex shrink-0 items-center gap-0.5 md:hidden"
            data-player-transport
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleReader();
              }}
              className={`h-9 w-9 rounded-full border flex items-center justify-center tap-feedback ${
                isReaderOpen && !isReaderClosing
                  ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}`
                  : 'bg-[#111d2d] border-[#30455c] text-[#e6edf5]'
              }`}
              aria-label={isReaderOpen ? 'Fermer la lecture' : 'Lire le Coran'}
              title={isReaderOpen ? 'Fermer la lecture' : 'Lire le Coran'}
              aria-pressed={isReaderOpen && !isReaderClosing}
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEffects();
              }}
              className={`h-9 w-9 rounded-full border flex items-center justify-center tap-feedback ${
                showEffects
                  ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}`
                  : 'bg-[#111d2d] border-[#30455c]'
              }`}
              aria-label="Effets audio"
              title="Effets audio"
            >
              <SlidersVertical
                className={`w-3.5 h-3.5 ${
                  showEffects
                    ? ''
                    : effectsActive
                      ? theme.accentText
                      : 'text-[#e6edf5]'
                }`}
              />
            </button>
            <div className={`flex items-center gap-1 ${remoteSession ? 'opacity-40' : ''}`}>
              <button
                type="button"
                disabled={Boolean(remoteSession)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (remoteSession) return;
                  playPrevTrack();
                }}
                className="w-11 h-11 rounded-full bg-[#111d2d] border border-[#30455c] text-[#e6edf5] flex items-center justify-center tap-feedback disabled:pointer-events-none disabled:grayscale"
                aria-label="Précédent"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>
              <button
                type="button"
                disabled={Boolean(remoteSession)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (remoteSession) return;
                  togglePlay();
                }}
                className={`w-12 h-12 rounded-full flex items-center justify-center tap-feedback disabled:pointer-events-none disabled:grayscale ${
                  remoteSession
                    ? 'bg-[#30455c] text-[#95a7ba] shadow-none'
                    : `${theme.accent} text-[#111d2d] shadow-md ${theme.accentShadow}`
                }`}
                aria-label={playbackStatus === 'playing' ? 'Pause' : 'Lecture'}
              >
                {playbackStatus === 'playing' ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
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
                className="w-11 h-11 rounded-full bg-[#111d2d] border border-[#30455c] text-[#e6edf5] flex items-center justify-center tap-feedback disabled:pointer-events-none disabled:grayscale"
                aria-label="Suivant"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>
        </div>

        {/* Center controls — desktop */}
        <div
          className={`hidden md:flex flex-col items-center gap-2 col-span-1 px-2 lg:px-4 ${
            remoteSession ? 'opacity-40' : ''
          }`}
        >
          <div className="flex items-center gap-3 lg:gap-4">
            <button
              type="button"
              disabled={Boolean(remoteSession)}
              onClick={() => {
                if (remoteSession) return;
                jumpBy(-prefs.seekStep);
              }}
              className="hidden lg:flex min-h-11 min-w-11 text-[#95a7ba] hover:text-[#f6f8fb] p-2 rounded-xl hover:bg-[#111d2d]/60 disabled:pointer-events-none items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a06a]"
              title={`−${prefs.seekStep}s`}
              aria-label={`Reculer de ${prefs.seekStep} secondes`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={Boolean(remoteSession)}
              onClick={() => {
                if (remoteSession) return;
                playPrevTrack();
              }}
              className="min-h-11 min-w-11 text-[#c8d1db] hover:text-[#f6f8fb] p-2 rounded-xl hover:bg-[#111d2d]/60 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a06a]"
              aria-label="Précédent"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>
            <button
              type="button"
              disabled={Boolean(remoteSession)}
              onClick={() => {
                if (remoteSession) return;
                togglePlay();
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center tap-feedback disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a06a] ${
                remoteSession
                  ? 'bg-[#30455c] text-[#95a7ba] shadow-none'
                  : `${theme.accent} text-[#111d2d] shadow-lg ${theme.accentShadow}`
              }`}
              aria-label={playbackStatus === 'playing' ? 'Pause' : 'Lecture'}
            >
              {playbackStatus === 'playing' ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
            <button
              type="button"
              disabled={Boolean(remoteSession)}
              onClick={() => {
                if (remoteSession) return;
                playNextTrack();
              }}
              className="min-h-11 min-w-11 text-[#c8d1db] hover:text-[#f6f8fb] p-2 rounded-xl hover:bg-[#111d2d]/60 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a06a]"
              aria-label="Suivant"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
            <button
              type="button"
              disabled={Boolean(remoteSession)}
              onClick={() => {
                if (remoteSession) return;
                jumpBy(prefs.seekStep);
              }}
              className="hidden lg:flex min-h-11 min-w-11 text-[#95a7ba] hover:text-[#f6f8fb] p-2 rounded-xl hover:bg-[#111d2d]/60 disabled:pointer-events-none items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a06a]"
              title={`+${prefs.seekStep}s`}
              aria-label={`Avancer de ${prefs.seekStep} secondes`}
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
          {!remoteSession && (
            <div className="flex items-center gap-3.5 w-full max-w-xl text-[11px] font-mono font-semibold text-[#95a7ba]">
              <span className="w-11 text-right tabular-nums text-[#e8d4bc]">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-[#162538]"
                style={{ background: theme.sliderBackground(progressPercent), accentColor: theme.sliderAccentColor }}
                aria-label="Position de lecture"
                aria-valuemin={0}
                aria-valuemax={Math.floor(duration || 0)}
                aria-valuenow={Math.floor(currentTime)}
                aria-valuetext={`${formatTime(currentTime)} sur ${formatDuration(duration)}`}
              />
              <span className="w-11 tabular-nums">{formatDuration(duration)}</span>
            </div>
          )}
        </div>

        {/* Right tools — desktop */}
        <div className="hidden md:flex items-center justify-end gap-2 shrink-0 md:col-span-1 min-w-0">
          {prefs.showQuickControls && (
            <div className="hidden xl:flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={cycleRepeat}
                className={`h-9 w-9 rounded-xl text-[10px] font-bold flex items-center justify-center shrink-0 transition-colors ${
                  repeatMode !== 'all'
                    ? `border ${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}`
                    : 'text-[#95a7ba] hover:text-[#f6f8fb] hover:bg-[#111d2d]/60'
                }`}
                title={`Répétition : ${repeatMode}`}
              >
                <RepeatIcon className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setPlaybackSpeed(playbackSpeed >= 1.5 ? 1 : playbackSpeed >= 1.25 ? 1.5 : playbackSpeed >= 1 ? 1.25 : 1)}
                className={`h-9 px-2 rounded-xl text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors ${
                  playbackSpeed !== 1
                    ? `border ${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}`
                    : 'text-[#95a7ba] hover:text-[#f6f8fb] hover:bg-[#111d2d]/60'
                }`}
                title="Vitesse"
              >
                <Gauge className="w-4 h-4" />
                {playbackSpeed}x
              </button>

              {sleepTimer !== null && (
                <span className={`h-9 px-2 rounded-xl border text-[11px] font-mono font-bold flex items-center gap-1 shrink-0 ${theme.accentBgLight} ${theme.accentBorder} ${theme.accentText}`}>
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  {formatSleepTime(sleepTimer)}
                </span>
              )}
            </div>
          )}

          <div ref={volumeWrapRef} className="relative hidden lg:flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleMute}
              className={`h-9 w-9 rounded-xl flex items-center justify-center text-[#aab7c5] hover:text-[#f6f8fb] hover:bg-[#111d2d]/70 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a06a] ${
                isMuted || volume === 0 ? theme.accentText : ''
              }`}
              title="Volume"
              aria-label={isMuted || volume === 0 ? 'Activer le son' : 'Couper le son'}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
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
              className="w-16 xl:w-24 h-1.5 rounded appearance-none cursor-pointer bg-[#162538] shrink-0"
              style={{ accentColor: theme.sliderAccentColor }}
              aria-label="Volume"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleReader}
              className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a06a] ${
                isReaderOpen && !isReaderClosing
                  ? `${theme.accentText} ${theme.accentBgLight}`
                  : 'text-[#aab7c5] hover:text-[#f6f8fb] hover:bg-[#111d2d]/70'
              }`}
              title={isReaderOpen ? 'Fermer la lecture' : 'Lire le Coran'}
              aria-label={isReaderOpen ? 'Fermer la lecture' : 'Lire le Coran'}
              aria-pressed={isReaderOpen && !isReaderClosing}
            >
              <BookOpen className="w-4.5 h-4.5" />
            </button>
            <button
              type="button"
              onClick={openEffects}
              className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a06a] ${
                showEffects
                  ? `${theme.accentText} ${theme.accentBgLight}`
                  : 'text-[#aab7c5] hover:text-[#f6f8fb] hover:bg-[#111d2d]/70'
              }`}
              title="Effets audio"
              aria-label="Ouvrir les effets audio"
            >
              <SlidersVertical
                className={`w-4.5 h-4.5 ${
                  !showEffects && effectsActive ? theme.accentText : ''
                }`}
              />
            </button>
            <button
              type="button"
              onClick={openPlaylist}
              className={`h-9 w-9 rounded-xl flex items-center justify-center text-[#aab7c5] hover:text-[#f6f8fb] hover:bg-[#111d2d]/70 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a06a] ${theme.accentTextHover}`}
              title="Sourates"
              aria-label="Ouvrir la liste des sourates"
            >
              <ListMusic className="w-4.5 h-4.5" />
            </button>
            <button
              type="button"
              onClick={openPersonalize}
              className={`h-9 w-9 rounded-xl flex items-center justify-center text-[#aab7c5] hover:text-[#f6f8fb] hover:bg-[#111d2d]/70 shrink-0 ${
                showPersonalize ? `${theme.accentText} ${theme.accentBgLight}` : ''
              }`}
              title="Personnaliser"
            >
              <SlidersHorizontal className="w-4.5 h-4.5" />
            </button>
            <button
              type="button"
              onClick={toggleDocked}
              className={`hidden lg:flex h-9 w-9 rounded-xl items-center justify-center text-[#95a7ba] hover:text-[#f6f8fb] hover:bg-[#111d2d]/70 transition-colors shrink-0 ${
                docked ? `${theme.accentText} ${theme.accentBgLight}` : ''
              }`}
              title={
                docked
                  ? 'Mode flottant (navbar + lecteur)'
                  : 'Mode plein (navbar + lecteur)'
              }
            >
              {docked ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
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
            <div className="relative z-10 flex items-center gap-2.5 px-4 py-2.5 border-b border-[#c9a06a]/25 bg-[#e4ccb4]/[0.08]">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c9a06a]/50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#e4ccb4]" />
              </span>
              <MonitorSmartphone className="w-4 h-4 text-[#e4ccb4] shrink-0" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-xs font-semibold text-[#f6f8fb] truncate">
                  {remoteTrackLabel || 'Autre appareil'}
                  <span className="font-mono text-[#e8d4bc] tabular-nums font-medium">
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
              onClick={openPlaylist}
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

            <div className="mx-auto mb-7 w-28 h-28 rounded-full border border-[#c9a06a]/35 bg-[#111d2d]/60 overflow-hidden shadow-[0_0_28px_rgba(201,160,106,0.12)]">
              {hasCover && currentTrack ? (
                <ReciterPortrait reciter={currentTrack.reciter} alt="" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Disc className={`w-12 h-12 ${theme.glowDisc} ${playbackStatus === 'playing' ? 'animate-[spin_12s_linear_infinite]' : ''}`} />
                </div>
              )}
            </div>

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
                <SkipBack className="w-6 h-6 fill-current" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className={`w-[4.25rem] h-[4.25rem] rounded-full ${theme.accent} text-[#111d2d] flex items-center justify-center shadow-xl ${theme.accentShadow} tap-feedback`}
                aria-label={playbackStatus === 'playing' ? 'Pause' : 'Lecture'}
              >
                {playbackStatus === 'playing' ? (
                  <Pause className="w-8 h-8 fill-current" />
                ) : (
                  <Play className="w-8 h-8 fill-current ml-1" />
                )}
              </button>
              <button
                type="button"
                onClick={playNextTrack}
                className="w-12 h-12 rounded-full border border-[#30455c] bg-[#111d2d] text-[#e6edf5] flex items-center justify-center tap-feedback"
                aria-label="Suivant"
              >
                <SkipForward className="w-6 h-6 fill-current" />
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
                  : 'border-[#c9a06a]/40 bg-[#c9a06a]/10 text-[#e4ccb4]'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              {isReaderOpen ? 'Fermer la lecture' : 'Lire le Coran'}
            </button>

            <div className="grid grid-cols-4 gap-2 mt-auto">
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
                onClick={openPlaylist}
                className="h-12 rounded-2xl border border-[#30455c] text-xs font-bold text-[#d0d9e3] flex items-center justify-center gap-1.5 tap-feedback"
              >
                <ListMusic className="w-4 h-4" />
                Liste
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
                <SlidersVertical
                  className={`w-4 h-4 ${
                    !showEffects && effectsActive ? theme.accentText : ''
                  }`}
                />
                Effets
              </button>
              <button
                type="button"
                onClick={() => setShowVolumePopover(true)}
                className="h-12 rounded-2xl border border-[#30455c] text-xs font-bold text-[#d0d9e3] flex items-center justify-center gap-1.5 tap-feedback"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
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
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
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
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPlayerTheme(id)}
                        className={`h-10 rounded-xl border flex items-center justify-center ${active ? `ring-2 ${t.accentRing} ${t.accentBorderActive}` : 'border-[#30455c]'}`}
                        style={{ backgroundColor: `${t.sliderAccentColor}22` }}
                        title={t.name}
                      >
                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: t.sliderAccentColor }} />
                      </button>
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
                    <SlidersVertical className={`w-4 h-4 ${effectsActive ? theme.accentText : 'text-[#95a7ba]'}`} />
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

      {/* ── Surah list sheet — rises from the player bar ── */}
      {showPlaylist && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center md:pb-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="player-playlist-title"
        >
          <button
            type="button"
            className={`player-sheet-backdrop absolute inset-0 bg-[#07111d]/78 backdrop-blur-md ${playlistClosing ? 'is-closing' : ''}`}
            aria-label="Fermer"
            onClick={closePlaylist}
          />
          <div
            className={`player-sheet-panel relative z-10 flex w-full max-w-xl max-h-[min(82dvh,42rem)] flex-col overflow-hidden rounded-t-[1.85rem] md:rounded-[1.85rem] border border-transparent bg-[#0a1420] md:mx-4 ${playlistClosing ? 'is-closing' : ''}`}
          >
            {/* Atmosphere header */}
            <div className="relative isolate shrink-0 overflow-hidden border-b border-[#30455c]/40">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(240,209,188,0.16),transparent_52%),linear-gradient(180deg,rgba(22,37,56,0.55)_0%,rgba(10,20,32,0.98)_100%)]"
                aria-hidden
              />
              {hasCover && currentTrack ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-6 -top-8 h-40 w-40 overflow-hidden rounded-full opacity-[0.22] blur-[1px] saturate-[0.85] md:h-48 md:w-48"
                >
                  <ReciterPortrait reciter={currentTrack.reciter} alt="" />
                </span>
              ) : null}

              <div className="relative z-10 px-5 pt-3 pb-4">
                <div className="mb-3 flex justify-center md:hidden">
                  <span className="h-1 w-10 rounded-full bg-[#c9a06a]/35" />
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="brand-chip inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em]">
                      Playlist
                    </span>
                    <h3
                      id="player-playlist-title"
                      className="mt-2 text-[1.35rem] font-black tracking-tight text-[#f6f8fb] md:text-[1.5rem]"
                    >
                      Sourates
                    </h3>
                    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-[#aab7c5]">
                      <span className="truncate">{currentTrack.reciter.name}</span>
                      <AyahSyncBadge moshaf={currentTrack.moshaf} compact />
                      <span className="shrink-0 text-[#5f7388]"> · </span>
                      <span className="shrink-0">{filteredSurahs.length} titres</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closePlaylist}
                    className="h-10 w-10 shrink-0 rounded-full border border-[#46607b]/55 bg-[#111d2d]/65 flex items-center justify-center text-[#aab7c5] hover:text-[#f6f8fb] hover:border-[#c9a06a]/35"
                    aria-label="Fermer la liste"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Now playing strip */}
                <button
                  type="button"
                  onClick={() => togglePlay()}
                  className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-[#c9a06a]/22 bg-[#07111d]/55 px-3 py-2.5 text-left tap-feedback hover:bg-[#07111d]/75"
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#c9a06a]/28 bg-[#111d2d]">
                    {hasCover && currentTrack ? (
                      <ReciterPortrait reciter={currentTrack.reciter} alt="" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Disc className="h-4 w-4 text-[#c9a06a]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c9a06a]/90">
                      En cours
                    </p>
                    <p className="mt-0.5 truncate text-sm font-bold text-[#f6f8fb]">
                      {String(currentTrack.surah.id).padStart(3, '0')}. {currentTrack.surah.name}
                    </p>
                  </div>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${theme.accent} text-[#111d2d] shadow-md ${theme.accentShadow}`}>
                    {playbackStatus === 'playing' ? (
                      <Pause className="h-4 w-4 fill-current" />
                    ) : (
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    )}
                  </span>
                </button>
              </div>
            </div>

            {/* Search + tools */}
            <div className="shrink-0 px-4 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#95a7ba]" aria-hidden />
                  <input
                    type="search"
                    value={drawerSearch}
                    onChange={(e) => setDrawerSearch(e.target.value)}
                    placeholder="Nom, numéro ou arabe…"
                    aria-label="Rechercher une sourate dans la liste"
                    className="w-full min-h-11 pl-10 pr-10 py-2.5 bg-[#111d2d]/88 border border-[#30455c]/65 rounded-2xl text-sm text-[#e6edf5] placeholder:text-[#8295aa] focus:outline-none focus:border-[#c9a06a]/40 focus-visible:ring-2 focus-visible:ring-[#c9a06a]/55"
                  />
                  {drawerSearch && (
                    <button
                      type="button"
                      onClick={() => setDrawerSearch('')}
                      aria-label="Effacer la recherche"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-[#162538] flex items-center justify-center text-[#aab7c5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a06a]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {selectedSurahIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSurahIds(new Set())}
                    className="shrink-0 rounded-2xl border border-[#c9a06a]/28 bg-[#e4ccb4]/10 px-3 py-2.5 text-[11px] font-bold text-[#e8d4bc]"
                  >
                    Boucle {selectedSurahIds.size}
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-3 pb-[calc(1.15rem+env(safe-area-inset-bottom,0px))] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              <ul className="flex flex-col gap-1.5">
                {filteredSurahs.map((surah) => {
                  const isCurrent = currentTrack.surah.id === surah.id;
                  const isPlaying = isCurrent && playbackStatus === 'playing';
                  const inLoop = selectedSurahIds.has(surah.id);
                  return (
                    <li key={surah.id}>
                      <div
                        className={`group flex items-center gap-1 rounded-2xl border px-2 py-1.5 transition-all ${
                          isCurrent
                            ? 'border-[#c9a06a]/30 bg-[#e4ccb4]/[0.08]'
                            : inLoop
                              ? 'border-[#c9a06a]/18 bg-[#e4ccb4]/[0.04]'
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
                          className="min-w-0 flex-1 flex items-center gap-3 rounded-xl px-1 py-1.5 text-left"
                        >
                          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                            <span
                              className={`absolute inset-0 rotate-45 rounded-[0.65rem] border ${
                                isCurrent
                                  ? 'border-[#c9a06a]/45 bg-[#07111d]/90'
                                  : 'border-[#46607b]/70 bg-[#07111d] group-hover:border-[#95a7ba]'
                              }`}
                              aria-hidden
                            />
                            <span
                              className={`relative z-10 text-[11px] font-bold tabular-nums ${
                                isCurrent ? 'text-[#e8d4bc]' : 'text-[#aab7c5]'
                              }`}
                            >
                              {isPlaying ? (
                                <span className="flex gap-0.5 items-end justify-center h-3.5 w-3.5">
                                  <span className="w-0.5 bg-[#e4ccb4] animate-[shimmer_0.6s_infinite_alternate] h-full rounded-full" />
                                  <span className="w-0.5 bg-white/80 animate-[shimmer_0.6s_infinite_alternate] h-2/3 rounded-full" style={{ animationDelay: '0.2s' }} />
                                  <span className="w-0.5 bg-[#7990a1] animate-[shimmer_0.6s_infinite_alternate] h-full rounded-full" style={{ animationDelay: '0.4s' }} />
                                </span>
                              ) : (
                                surah.id
                              )}
                            </span>
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className={`block text-[13px] font-bold truncate leading-tight ${isCurrent ? 'text-[#f8fbff]' : 'text-[#f1f5f9]'}`}>
                              {surah.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] font-medium text-[#95a7ba]">
                              {surah.translation}
                            </span>
                          </span>

                          {prefs.showArabic && (
                            <span
                              className={`font-serif text-xl tracking-wide arabic-text shrink-0 hidden min-[400px]:inline ${
                                isCurrent ? 'text-[#e8d4bc]' : 'text-[#c8d4e0]'
                              }`}
                            >
                              {surah.arabicName}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleSurahInPlaylist(surah.id)}
                          className={`mr-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all ${
                            inLoop
                              ? `${theme.accent} text-[#111d2d]`
                              : 'text-[#8295aa] hover:bg-[#162538] hover:text-[#f6f8fb]'
                          }`}
                          aria-pressed={inLoop}
                          title={inLoop ? 'Retirer de la boucle' : 'Ajouter à la boucle'}
                          aria-label={inLoop ? `Retirer ${surah.name} de la boucle` : `Ajouter ${surah.name} à la boucle`}
                        >
                          <Repeat className="w-3.5 h-3.5" />
                        </button>
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

      <SurahReaderSheet
        open={isReaderOpen}
        closing={isReaderClosing}
        surah={currentTrack.surah}
        moshaf={currentTrack.moshaf}
        onRequestClose={beginCloseReader}
        onCloseComplete={finishCloseReader}
        anchor={playerBarAnchor}
      />
    </>
  );
};

export default GlobalPlayerV2;
