import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioContext';
import { 
  Play, Pause, SkipForward, SkipBack, 
  ChevronDown, Volume2, VolumeX, Gauge, 
  Disc, AlertCircle, RefreshCw, RotateCcw,
  RotateCw, ListMusic, Search, X,
  Settings, Sparkles, Check, Moon, Repeat, Clock
} from '../icons/motion';

const THEMES: Record<string, {
  name: string;
  accent: string;
  accentText: string;
  accentTextHover: string;
  accentBgLight: string;
  accentBorder: string;
  accentBorderActive: string;
  accentBorderLight: string;
  accentRing: string;
  accentShadow: string;
  accentGlow: string;
  glowDisc: string;
  sliderAccentColor: string;
  sliderBackground: (percent: number) => string;
}> = {
  emerald: {
    name: 'Acier Marine',
    accent: 'bg-emerald-500 hover:bg-emerald-400',
    accentText: 'text-emerald-400',
    accentTextHover: 'hover:text-emerald-400',
    accentBgLight: 'bg-emerald-500/10',
    accentBorder: 'border-emerald-500/20',
    accentBorderActive: 'border-emerald-500/40',
    accentBorderLight: 'border-emerald-500/10',
    accentRing: 'ring-emerald-500/20',
    accentShadow: 'shadow-emerald-500/20',
    accentGlow: 'from-emerald-500/5',
    glowDisc: 'text-emerald-400 drop-shadow-[0_0_8px_rgba(122,145,159,0.35)]',
    sliderAccentColor: '#7a919f',
    sliderBackground: (percent) => `linear-gradient(to right, #7a919f 0%, #7a919f ${percent}%, #1e293b ${percent}%, #1e293b 100%)`
  },
  amber: {
    name: 'Or Sacré',
    accent: 'bg-amber-500 hover:bg-amber-400',
    accentText: 'text-amber-400',
    accentTextHover: 'hover:text-amber-400',
    accentBgLight: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/20',
    accentBorderActive: 'border-amber-500/40',
    accentBorderLight: 'border-amber-500/10',
    accentRing: 'ring-amber-500/20',
    accentShadow: 'shadow-amber-500/20',
    accentGlow: 'from-amber-500/5',
    glowDisc: 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    sliderAccentColor: '#f59e0b',
    sliderBackground: (percent) => `linear-gradient(to right, #f59e0b 0%, #f59e0b ${percent}%, #1e293b ${percent}%, #1e293b 100%)`
  },
  blue: {
    name: 'Sérénité Céleste',
    accent: 'bg-sky-500 hover:bg-sky-400',
    accentText: 'text-sky-400',
    accentTextHover: 'hover:text-sky-400',
    accentBgLight: 'bg-sky-500/10',
    accentBorder: 'border-sky-500/20',
    accentBorderActive: 'border-sky-500/40',
    accentBorderLight: 'border-sky-500/10',
    accentRing: 'ring-sky-500/20',
    accentShadow: 'shadow-sky-500/20',
    accentGlow: 'from-sky-500/5',
    glowDisc: 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]',
    sliderAccentColor: '#0ea5e9',
    sliderBackground: (percent) => `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${percent}%, #1e293b ${percent}%, #1e293b 100%)`
  },
  purple: {
    name: 'Améthyste Royale',
    accent: 'bg-violet-500 hover:bg-violet-400',
    accentText: 'text-violet-400',
    accentTextHover: 'hover:text-violet-400',
    accentBgLight: 'bg-violet-500/10',
    accentBorder: 'border-violet-500/20',
    accentBorderActive: 'border-violet-500/40',
    accentBorderLight: 'border-violet-500/10',
    accentRing: 'ring-violet-500/20',
    accentShadow: 'shadow-violet-500/20',
    accentGlow: 'from-violet-500/5',
    glowDisc: 'text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]',
    sliderAccentColor: '#8b5cf6',
    sliderBackground: (percent) => `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${percent}%, #1e293b ${percent}%, #1e293b 100%)`
  },
  oled: {
    name: 'Nuit Infinie (OLED)',
    accent: 'bg-slate-100 hover:bg-white',
    accentText: 'text-slate-200',
    accentTextHover: 'hover:text-white',
    accentBgLight: 'bg-slate-900/50',
    accentBorder: 'border-slate-800',
    accentBorderActive: 'border-slate-700',
    accentBorderLight: 'border-slate-800/60',
    accentRing: 'ring-slate-800',
    accentShadow: 'shadow-slate-900/40',
    accentGlow: 'from-slate-900/5',
    glowDisc: 'text-slate-200 drop-shadow-[0_0_8px_rgba(241,245,249,0.4)]',
    sliderAccentColor: '#f1f5f9',
    sliderBackground: (percent) => `linear-gradient(to right, #f1f5f9 0%, #f1f5f9 ${percent}%, #111827 ${percent}%, #111827 100%)`
  }
};

export const GlobalPlayer: React.FC = () => {
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
    setPlayerTheme
  } = useAudio();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showPlaylistDrawer, setShowPlaylistDrawer] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');
  const drawerListRef = useRef<HTMLDivElement | null>(null);
  const currentSurahRowRef = useRef<HTMLButtonElement | null>(null);

  // Active Theme resolver
  const theme = THEMES[playerTheme] || THEMES.amber;

  // Format Sleep Timer Countdown
  const formatSleepTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Time formatter (seconds -> mm:ss)
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(parseFloat(e.target.value));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const speedOptions = [0.8, 1.0, 1.25, 1.5, 2.0];
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Filter available surahs inside the drawer search
  const filteredDrawerSurahs = useMemo(() => {
    if (!currentTrack) return [];
    const available = getAvailableSurahs(currentTrack.reciter, currentTrack.moshaf);
    if (!drawerSearch.trim()) return available;
    const query = drawerSearch.toLowerCase().trim();
    return available.filter(
      s => 
        s.name.toLowerCase().includes(query) ||
        s.id.toString().includes(query) ||
        s.arabicName.includes(query)
    );
  }, [currentTrack, drawerSearch, getAvailableSurahs]);

  useEffect(() => {
    if (!showPlaylistDrawer) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowPlaylistDrawer(false);
    };
    window.addEventListener('keydown', onKeyDown);

    const frame = window.requestAnimationFrame(() => {
      currentSurahRowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.cancelAnimationFrame(frame);
    };
  }, [showPlaylistDrawer]);

  if (!currentTrack) return null;

  return (
    <>
      {/* 1. RESPONSIVE PLAYER BAR: Floating mini-player on mobile, Full Player Bar on desktop */}
      <div 
        onClick={() => {
          if (window.innerWidth < 768) setIsExpanded(true);
        }}
        className={`fixed z-50 transition-all duration-300
          left-3 right-3 bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:left-6 md:right-6 md:mx-auto md:max-w-4xl md:bottom-6 
          rounded-2xl md:rounded-3xl p-3 md:p-0 md:px-6 md:h-20 
          glass-panel-opaque border border-slate-800/80 md:border-slate-800/60 md:bg-slate-950/92 md:backdrop-blur-3xl
          shadow-2xl md:shadow-[0_20px_50px_rgba(0,0,0,0.8)] md:hover:border-slate-750/70
          flex flex-row items-center justify-between md:grid md:grid-cols-3
          cursor-pointer active:scale-[0.98] md:cursor-default md:active:scale-100
          overflow-hidden md:overflow-visible
          ${isExpanded ? 'opacity-0 pointer-events-none translate-y-4 md:opacity-100 md:pointer-events-auto md:translate-y-0' : 'opacity-100 translate-y-0'}
        `}
      >
        {/* Mobile top progress bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-900/60 md:hidden">
          <div 
            className={`h-full ${theme.accent} transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(122, 145, 159,0.8)]`}
            style={{ width: `${progressPercent}%`, backgroundColor: theme.sliderAccentColor }}
          />
        </div>

        <div className="flex items-center gap-3.5 min-w-0 flex-1 md:col-span-1">
          <div className="relative shrink-0">
            <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl bg-slate-950 flex items-center justify-center border border-slate-850 shadow-inner`}>
              <Disc className={`w-5 h-5 md:w-6 md:h-6 ${theme.accentText} ${playbackStatus === 'playing' ? 'animate-[spin_8s_linear_infinite]' : ''}`} />
            </div>
            {playbackStatus === 'playing' && (
              <div 
                className="absolute -bottom-1 -right-1 rounded-full p-0.5 border border-slate-950 flex items-center justify-center shadow-lg"
                style={{ backgroundColor: theme.sliderAccentColor }}
              >
                <div className="flex gap-0.5 items-end justify-center h-2 w-2">
                  <div className="w-0.5 bg-slate-950 animate-[shimmer_0.6s_infinite_alternate] h-full rounded-full" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-0.5 bg-slate-950 animate-[shimmer_0.6s_infinite_alternate] h-2/3 rounded-full" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-0.5 bg-slate-950 animate-[shimmer_0.6s_infinite_alternate] h-full rounded-full" style={{ animationDelay: '0.5s' }}></div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSettingsMenu(false);
              setShowPlaylistDrawer(true);
            }}
            className="min-w-0 flex-1 text-left rounded-xl -mx-1 px-1 py-0.5 tap-feedback hover:bg-slate-900/40 transition-colors"
            title="Voir la liste des sourates"
          >
            <div className="flex items-baseline gap-1.5 md:gap-2">
              <h4 className={`font-semibold text-xs md:text-sm text-slate-100 truncate ${theme.accentTextHover} transition-colors`}>
                {String(currentTrack.surah.id).padStart(3, '0')}. {currentTrack.surah.name}
              </h4>
              <span className="text-[9px] md:text-[10px] text-slate-450 font-serif shrink-0">
                ({currentTrack.surah.arabicName})
              </span>
            </div>
            <p className="text-[10px] md:text-xs text-slate-400 truncate mt-0.5">
              {currentTrack.reciter.name} <span className="md:hidden">•</span> <span className="hidden md:inline-block mx-1.5">•</span>
              <span className={`text-[9px] ${theme.accentText} ${theme.accentBgLight} px-1.5 py-0.2 rounded border ${theme.accentBorderLight} font-semibold uppercase tracking-wider`}>{currentTrack.moshaf.name}</span>
            </p>
          </button>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 ml-2 md:col-span-1 md:justify-center md:flex-col md:gap-1.5 md:ml-0" onClick={e => e.stopPropagation()}>
          
          <div className="flex items-center gap-2.5 md:gap-5">
            <button 
              onClick={playPrevTrack}
              className={`hidden md:flex text-slate-400 hover:text-slate-200 transition-colors p-1.5 hover:bg-slate-900/60 rounded-xl`}
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {playbackStatus === 'buffering' ? (
              <div className={`w-9 h-9 md:w-10 md:h-10 border-2 border-slate-700 border-t-transparent rounded-full animate-spin flex items-center justify-center`} style={{ borderTopColor: theme.sliderAccentColor }} />
            ) : (
              <button 
                onClick={togglePlay}
                className={`w-9 h-9 md:w-10 md:h-10 rounded-full ${theme.accent} text-slate-950 flex items-center justify-center shadow-md ${theme.accentShadow} tap-feedback hover:scale-105 transition-all`}
              >
                {playbackStatus === 'playing' ? (
                  <Pause className="w-4 h-4 md:w-4.5 md:h-4.5 fill-current" />
                ) : (
                  <Play className="w-4 h-4 md:w-4.5 md:h-4.5 fill-current ml-0.5 md:ml-1" />
                )}
              </button>
            )}

            <button 
              onClick={playNextTrack}
              className="w-9 h-9 md:w-9 md:h-9 md:bg-transparent md:border-none md:rounded-none rounded-full bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center justify-center tap-feedback transition-colors p-1.5 hover:bg-slate-900/60 md:hover:bg-transparent"
            >
              <SkipForward className="w-4 h-4 md:w-4.5 md:h-4.5 fill-current" />
            </button>
          </div>

          <div className="hidden md:flex items-center justify-center gap-2.5 w-full max-w-xs text-[9px] font-mono font-bold text-slate-450">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleProgressChange}
              className="flex-1 h-1 bg-slate-800/80 rounded-lg appearance-none cursor-pointer focus:outline-none transition-colors"
              style={{
                background: theme.sliderBackground(progressPercent),
                accentColor: theme.sliderAccentColor
              }}
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-end gap-5 col-span-1" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2.5 w-28 group">
            <button onClick={toggleMute} className={`text-slate-400 ${theme.accentTextHover} transition-colors p-1`}>
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer focus:outline-none transition-colors"
              style={{
                background: theme.sliderBackground((isMuted ? 0 : volume) * 100),
                accentColor: theme.sliderAccentColor
              }}
            />
          </div>

          <div className="relative">
            <button 
              onClick={() => {
                setShowSettingsMenu(!showSettingsMenu);
                setShowPlaylistDrawer(false);
              }}
              className={`p-2.5 rounded-xl transition-colors ${
                showSettingsMenu
                  ? `${theme.accentText} ${theme.accentBgLight}`
                  : `text-slate-400 ${theme.accentTextHover} hover:bg-slate-900/60`
              }`}
              title="Personnalisation & Options"
            >
              <Settings className="w-4.5 h-4.5" />
            </button>
            
            {showSettingsMenu && (
              <div className="absolute bottom-16 right-0 bg-slate-950/98 border border-slate-800/85 rounded-2xl p-4 shadow-[0_-15px_40px_rgba(0,0,0,0.8)] flex flex-col gap-4.5 z-[55] min-w-[280px] animate-[double-pulse_0.15s] glass-panel-opaque">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className={`w-3.5 h-3.5 ${theme.glowDisc}`} /> Personnalisation
                  </h4>
                  <button 
                    onClick={() => setShowSettingsMenu(false)}
                    className="text-slate-500 hover:text-slate-350 active:scale-95 transition-transform"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Theme Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Thème Visuel</span>
                    <span className="text-[10px] font-semibold text-slate-400">{theme.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {Object.entries(THEMES).map(([key, t]) => {
                      const isActive = playerTheme === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setPlayerTheme(key)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-350 hover:scale-105 active:scale-95 ${
                            isActive 
                              ? `${t.accent} ring-2 ring-white scale-110 shadow-md` 
                              : 'bg-slate-900 hover:bg-slate-800 border border-slate-800'
                          }`}
                          title={t.name}
                        >
                          {isActive && <Check className={`w-3.5 h-3.5 ${key === 'oled' ? 'text-slate-900' : 'text-slate-950'} stroke-[3.5]`} />}
                          {!isActive && (
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              key === 'emerald' ? 'bg-emerald-500' :
                              key === 'amber' ? 'bg-amber-500' :
                              key === 'blue' ? 'bg-sky-500' :
                              key === 'purple' ? 'bg-violet-500' : 'bg-slate-350'
                            }`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Repeat Mode */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">Lecture</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { value: 'all', label: 'Boucle' },
                      { value: 'one', label: 'Sourate' },
                      { value: 'none', label: 'Arrêt' }
                    ].map((mode) => {
                      const isActive = repeatMode === mode.value;
                      return (
                        <button
                          key={mode.value}
                          onClick={() => setRepeatMode(mode.value as any)}
                          className={`py-1.5 px-2 rounded-xl border text-[9px] font-bold uppercase transition-all duration-305 ${
                            isActive 
                              ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText} ring-1 ${theme.accentRing}` 
                              : 'border-slate-900 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sleep Timer */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Minuteur</span>
                    {sleepTimer !== null && (
                      <span className={`text-[10px] font-mono font-bold ${theme.accentText} flex items-center gap-1 bg-emerald-500/5 px-2 py-0.5 rounded-full border ${theme.accentBorderLight}`}>
                        <Clock className="w-3 h-3 animate-pulse" /> {formatSleepTime(sleepTimer)}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { value: null, label: 'Off' },
                      { value: 15 * 60, label: '15m' },
                      { value: 30 * 60, label: '30m' },
                      { value: 45 * 60, label: '45m' },
                      { value: 60 * 60, label: '1h' }
                    ].map((opt) => {
                      const isActive = 
                        (opt.value === null && sleepTimer === null) || 
                        (opt.value !== null && sleepTimer !== null && Math.abs(sleepTimer - opt.value) < 10);
                      return (
                        <button
                          key={opt.label}
                          onClick={() => setSleepTimer(opt.value)}
                          className={`py-1.5 rounded-xl border text-[9px] font-bold uppercase transition-all duration-300 text-center ${
                            isActive 
                              ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText} ring-1 ${theme.accentRing}` 
                              : 'border-slate-900 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => {
              setShowPlaylistDrawer(true);
              setShowSettingsMenu(false);
              setDrawerSearch('');
            }}
            className={`p-2.5 rounded-xl transition-colors ${
              showPlaylistDrawer
                ? `${theme.accentText} ${theme.accentBgLight}`
                : `text-slate-400 ${theme.accentTextHover} hover:bg-slate-900/60`
            }`}
            title="Liste de lecture"
          >
            <ListMusic className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* 2. IMMERSIVE FULL-SCREEN EXPANDED PLAYER DECK */}
      <div 
        className={`fixed inset-0 bg-slate-950/98 backdrop-blur-2xl z-50 flex flex-col justify-between px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] overflow-y-auto transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${
          isExpanded ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className={`absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-b ${theme.accentGlow} to-transparent blur-3xl pointer-events-none -z-10`} />
        <div className="absolute bottom-0 right-0 w-[50vw] h-[30vh] bg-slate-900/3 blur-3xl pointer-events-none -z-10" />

        {/* 2.1 Header Nav Bar */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => {
              setIsExpanded(false);
              setShowSpeedMenu(false);
              setShowPlaylistDrawer(false);
            }}
            className="w-11 h-11 rounded-full glass-panel flex items-center justify-center text-slate-300 active:scale-90 transition-transform"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
          <div className="text-center">
            <span className={`text-[10px] uppercase font-bold tracking-widest ${theme.accentText} block mb-0.5`}>Audio en Direct</span>
            <span className="text-xs font-semibold text-slate-300">Édition Saint Coran</span>
          </div>
          <div className="w-11 h-11" />
        </div>

        {/* 2.2 Immersive Center Deck: Rotator Panel */}
        <div className="flex flex-col items-center justify-center my-4 flex-1 max-w-sm mx-auto w-full min-h-[18rem]">
          <div className="relative group">
            <div className={`absolute inset-0 rounded-full blur-2xl transition-all duration-1000 ${
              playbackStatus === 'playing' ? 'scale-110 opacity-100' : 'scale-95 opacity-50'
            }`} style={{ backgroundColor: theme.sliderAccentColor + '10' }} />
            <div className={`w-56 h-56 min-[390px]:w-64 min-[390px]:h-64 md:w-72 md:h-72 rounded-full bg-slate-900 border-4 border-slate-800 shadow-[0_15px_50px_rgba(0,0,0,0.6)] flex items-center justify-center relative overflow-hidden transition-transform duration-700 ${
              playbackStatus === 'playing' ? 'animate-[spin_20s_linear_infinite]' : 'rotate-45'
            }`}>
              <div className={`absolute inset-4 rounded-full border ${theme.accentBorderLight}`} />
              <div className="absolute inset-10 rounded-full border-2 border-dashed border-slate-700/15" />
              <div className={`w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center border-2 ${theme.accentBorderActive} z-10`}>
                <Disc className={`w-8 h-8 ${theme.accentText}`} />
              </div>
              <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle_at_center, transparent 40%, black 90%), repeating-radial-gradient(circle_at_center, ${theme.sliderAccentColor} 0, ${theme.sliderAccentColor} 10px)` }} />
            </div>
          </div>
          
          {playbackStatus === 'playing' && (
            <div className="flex items-center gap-1.5 h-6 mt-8">
              {[40, 85, 50, 100, 35, 75].map((height, i) => (
                <div 
                  key={i} 
                  className={`w-1 ${theme.accent} rounded-full animate-[shimmer_0.8s_infinite_alternate]`}
                  style={{ 
                    height: `${height}%`,
                    animationDelay: `${i * 0.12}s`
                  }}
                />
              ))}
            </div>
          )}
          {playbackStatus === 'buffering' && (
            <div className={`flex items-center gap-2 mt-8 text-xs ${theme.accentText} font-semibold uppercase tracking-wider`}>
              <RefreshCw className="w-4 h-4 animate-spin" /> Chargement du flux...
            </div>
          )}
          {playbackStatus === 'error' && (
            <div className="flex items-center gap-2 mt-8 text-xs text-red-400 bg-red-400/10 border border-red-500/25 px-3 py-1.5 rounded-full font-semibold uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" /> Erreur de flux
            </div>
          )}
        </div>

          <button
            type="button"
            onClick={() => {
              setShowSettingsMenu(false);
              setShowPlaylistDrawer(true);
            }}
            className="text-center max-w-md mx-auto w-full mb-3 rounded-2xl px-2 py-1 tap-feedback hover:bg-slate-900/40 transition-colors"
            title="Voir la liste des sourates"
          >
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 ${theme.accentText} uppercase`}>
                Sourate {currentTrack.surah.id}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                {currentTrack.moshaf.name}
              </span>
            </div>
            <h2 className={`text-2xl md:text-3xl font-bold text-slate-100 flex items-center justify-center gap-2 flex-wrap leading-tight ${theme.accentTextHover} transition-colors`}>
              {currentTrack.surah.name}
              <span className={`font-serif text-xl ${theme.accentText} select-none arabic-text`}>
                ({currentTrack.surah.arabicName})
              </span>
            </h2>
            <p className="text-slate-400 text-sm mt-1.5 md:text-base">{currentTrack.reciter.name}</p>
          </button>

        {/* 2.4 Scrubbing slider & Timers */}
        <div className="max-w-md mx-auto w-full mb-4">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleProgressChange}
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer focus:outline-none"
            style={{
              background: theme.sliderBackground(progressPercent),
              accentColor: theme.sliderAccentColor
            }}
          />
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* 2.5 Console Control Deck */}
        <div className="max-w-md mx-auto w-full flex flex-col gap-4">
          <div className="flex items-center justify-between gap-1 min-[390px]:gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className={`w-10 h-10 min-[390px]:w-11 min-[390px]:h-11 rounded-full flex items-center justify-center border border-slate-850 tap-feedback transition-colors ${
                  playbackSpeed !== 1.0 
                    ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}` 
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
                title="Vitesse de lecture"
              >
                <Gauge className="w-5 h-5" />
              </button>
              
              {showSpeedMenu && (
                <div className="absolute bottom-13 left-0 bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 z-50 min-w-28 animate-[double-pulse_0.1s]">
                  <span className="text-[10px] uppercase font-bold text-slate-500 px-2 py-1 block">Vitesse</span>
                  {speedOptions.map(opt => (
                    <button
                      key={opt}
                      onClick={() => {
                        setPlaybackSpeed(opt);
                        setShowSpeedMenu(false);
                      }}
                      className={`text-xs text-left px-2.5 py-1.5 rounded-lg transition-colors font-mono ${
                        playbackSpeed === opt 
                          ? `${theme.accent} text-slate-950 font-bold` 
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {opt === 1.0 ? 'Normale' : `${opt}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={playPrevTrack}
              className="w-9 h-9 min-[390px]:w-10 min-[390px]:h-10 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 active:scale-95 transition-all tap-feedback"
              title="Sourate précédente"
            >
              <SkipBack className="w-4.5 h-4.5 fill-current" />
            </button>

            <button 
              onClick={() => seekTo(Math.max(0, currentTime - 10))}
              className="w-10 h-10 min-[390px]:w-11 min-[390px]:h-11 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 active:scale-95 transition-all tap-feedback relative"
              title="Reculer de 10 secondes"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="text-[7px] font-bold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-1 text-slate-400">10</span>
            </button>

            <button 
              onClick={togglePlay}
              className={`w-16 h-16 min-[390px]:w-18 min-[390px]:h-18 rounded-full ${theme.accent} text-slate-950 flex items-center justify-center shadow-2xl ${theme.accentShadow} active:scale-90 hover:scale-105 transition-all tap-feedback shrink-0`}
            >
              {playbackStatus === 'playing' ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-1" />
              )}
            </button>

            <button 
              onClick={() => seekTo(Math.min(duration || 0, currentTime + 10))}
              className="w-10 h-10 min-[390px]:w-11 min-[390px]:h-11 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 active:scale-95 transition-all tap-feedback relative"
              title="Avancer de 10 secondes"
            >
              <RotateCw className="w-5 h-5" />
              <span className="text-[7px] font-bold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-1 text-slate-400">10</span>
            </button>

            <button 
              onClick={playNextTrack}
              className="w-9 h-9 min-[390px]:w-10 min-[390px]:h-10 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 active:scale-95 transition-all tap-feedback"
              title="Sourate suivante"
            >
              <SkipForward className="w-4.5 h-4.5 fill-current" />
            </button>

            <button 
              onClick={() => {
                setShowPlaylistDrawer(true);
                setDrawerSearch('');
              }}
              className={`w-10 h-10 min-[390px]:w-11 min-[390px]:h-11 rounded-full flex items-center justify-center border border-slate-850 tap-feedback transition-colors ${
                showPlaylistDrawer
                  ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText}` 
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
              title="Liste de lecture"
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/40 border border-slate-900/60">
            <button onClick={toggleMute} className={`text-slate-400 ${theme.accentTextHover}`}>
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer focus:outline-none transition-colors"
              style={{
                background: theme.sliderBackground((isMuted ? 0 : volume) * 100),
                accentColor: theme.sliderAccentColor
              }}
            />
            <span className="font-mono text-slate-400 min-w-7 text-right text-[10px]">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>

          {/* Dynamic Theme & Immersion Customization Deck */}
          <div className="p-4 rounded-2xl bg-slate-900/35 border border-slate-900/65 flex flex-col gap-4.5 mt-1 text-left">
            
            {/* Visual Accent Theme */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className={`w-3.5 h-3.5 ${theme.glowDisc}`} /> Thème Visuel
                </span>
                <span className="text-[10px] font-semibold text-slate-350">{theme.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {Object.entries(THEMES).map(([key, t]) => {
                  const isActive = playerTheme === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setPlayerTheme(key)}
                      className={`w-7.5 h-7.5 rounded-full flex items-center justify-center border transition-all duration-350 hover:scale-105 active:scale-95 tap-feedback ${
                        isActive 
                          ? `${t.accent} border-white shadow-lg scale-110` 
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                      title={t.name}
                    >
                      {isActive && <Check className={`w-3.5 h-3.5 ${key === 'oled' ? 'text-slate-900' : 'text-slate-950'} stroke-[3.5]`} />}
                      {!isActive && (
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          key === 'emerald' ? 'bg-emerald-500' :
                          key === 'amber' ? 'bg-amber-500' :
                          key === 'blue' ? 'bg-sky-500' :
                          key === 'purple' ? 'bg-violet-500' : 'bg-slate-350'
                        }`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Repeat / Reading Loop Mode */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Repeat className={`w-3.5 h-3.5 ${theme.glowDisc}`} /> Mode de Lecture
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'all', label: 'Boucle', desc: 'Tout répéter' },
                  { value: 'one', label: 'Sourate', desc: 'Une sourate' },
                  { value: 'none', label: 'Arrêt', desc: 'Dernière sourate' }
                ].map((mode) => {
                  const isActive = repeatMode === mode.value;
                  return (
                    <button
                      key={mode.value}
                      onClick={() => setRepeatMode(mode.value as any)}
                      className={`p-2 rounded-xl border text-center transition-all duration-300 tap-feedback ${
                        isActive 
                          ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText} font-semibold ring-1 ${theme.accentRing}` 
                          : 'border-slate-850 bg-slate-950/20 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase">{mode.label}</p>
                      <p className="text-[8px] opacity-75 mt-0.5">{mode.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sleep Timer Preset Cards */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Moon className={`w-3.5 h-3.5 ${theme.glowDisc}`} /> Minuteur de Veille
                </span>
                {sleepTimer !== null && (
                  <span className={`text-[10px] font-bold ${theme.accentText} bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1`}>
                    <Clock className="w-3 h-3 animate-pulse" /> {formatSleepTime(sleepTimer)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: null, label: 'Off' },
                  { value: 5 * 60, label: '5m' },
                  { value: 15 * 60, label: '15m' },
                  { value: 30 * 60, label: '30m' },
                  { value: 45 * 60, label: '45m' },
                  { value: 60 * 60, label: '1h' }
                ].map((opt) => {
                  const isActive = 
                    (opt.value === null && sleepTimer === null) || 
                    (opt.value !== null && sleepTimer !== null && Math.abs(sleepTimer - opt.value) < 10);
                  return (
                    <button
                      key={opt.label}
                      onClick={() => setSleepTimer(opt.value)}
                      className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase transition-all duration-300 tap-feedback flex-1 text-center ${
                        isActive 
                          ? `${theme.accentBgLight} ${theme.accentBorderActive} ${theme.accentText} ring-1 ${theme.accentRing}` 
                          : 'border-slate-850 bg-slate-950/20 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 3. PLAYLIST / SURAH SELECTOR DRAWER */}
      {showPlaylistDrawer && (
        <div
          className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="playlist-drawer-title"
        >
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setShowPlaylistDrawer(false)}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          <div className="relative z-10 flex w-full max-w-lg max-h-[82dvh] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-slate-800/80 bg-slate-950 shadow-[0_-20px_60px_rgba(0,0,0,0.65)] sm:mx-4 animate-[slide-up_0.28s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <span className="h-1 w-10 rounded-full bg-slate-700" />
            </div>

            <div className="flex items-start justify-between gap-3 px-5 pt-2 pb-3 border-b border-slate-900">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl ${theme.accentBgLight} ${theme.accentText}`}
                  >
                    <ListMusic className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 id="playlist-drawer-title" className="font-bold text-slate-100 text-base truncate">
                      Sourates
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      {currentTrack.reciter.name}
                      <span className="mx-1.5 text-slate-600">·</span>
                      {filteredDrawerSurahs.length} titre{filteredDrawerSurahs.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPlaylistDrawer(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 tap-feedback"
                aria-label="Fermer la liste"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="search"
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  placeholder="Nom, numéro ou arabe…"
                  autoFocus
                  className={`w-full pl-10 pr-10 py-2.5 bg-slate-900/70 border border-slate-800 rounded-2xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-opacity-100 transition-all`}
                  style={{ borderColor: drawerSearch ? theme.sliderAccentColor : undefined }}
                />
                {drawerSearch && (
                  <button
                    type="button"
                    onClick={() => setDrawerSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-slate-100"
                    aria-label="Effacer la recherche"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div
              ref={drawerListRef}
              className="flex-1 overflow-y-auto overscroll-contain px-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
            >
              {filteredDrawerSurahs.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-14 text-center px-6">
                  <Search className="w-8 h-8 text-slate-700" />
                  <p className="text-sm text-slate-400">Aucune sourate pour « {drawerSearch} »</p>
                  <button
                    type="button"
                    onClick={() => setDrawerSearch('')}
                    className={`text-xs font-bold ${theme.accentText}`}
                  >
                    Effacer la recherche
                  </button>
                </div>
              ) : (
                <ul className="flex flex-col">
                  {filteredDrawerSurahs.map((surah) => {
                    const isCurrentSurah = currentTrack.surah.id === surah.id;
                    const isPlayingCurrent = isCurrentSurah && playbackStatus === 'playing';

                    return (
                      <li key={surah.id}>
                        <button
                          ref={isCurrentSurah ? currentSurahRowRef : undefined}
                          type="button"
                          onClick={() => {
                            if (isCurrentSurah) {
                              togglePlay();
                            } else {
                              playTrack(currentTrack.reciter, currentTrack.moshaf, surah);
                              setShowPlaylistDrawer(false);
                              setDrawerSearch('');
                            }
                          }}
                          className={`group w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors tap-feedback ${
                            isCurrentSurah
                              ? `${theme.accentBgLight}`
                              : 'hover:bg-slate-900/80'
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold tabular-nums ${
                              isCurrentSurah
                                ? `${theme.accentText} bg-slate-950/50 ring-1 ${theme.accentRing}`
                                : 'bg-slate-900 text-slate-500 group-hover:text-slate-300'
                            }`}
                          >
                            {isPlayingCurrent ? (
                              <span className="flex gap-0.5 items-end justify-center h-3.5 w-3.5">
                                <span className="w-0.5 h-full rounded-full animate-[shimmer_0.6s_infinite_alternate]" style={{ backgroundColor: theme.sliderAccentColor, animationDelay: '0.1s' }} />
                                <span className="w-0.5 h-2/3 rounded-full animate-[shimmer_0.6s_infinite_alternate]" style={{ backgroundColor: theme.sliderAccentColor, animationDelay: '0.3s' }} />
                                <span className="w-0.5 h-full rounded-full animate-[shimmer_0.6s_infinite_alternate]" style={{ backgroundColor: theme.sliderAccentColor, animationDelay: '0.5s' }} />
                              </span>
                            ) : (
                              String(surah.id).padStart(2, '0')
                            )}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm font-semibold truncate ${isCurrentSurah ? theme.accentText : 'text-slate-100'}`}>
                              {surah.name}
                            </span>
                            <span className="block text-[11px] text-slate-500 truncate mt-0.5">
                              {surah.translation}
                            </span>
                          </span>

                          <span
                            className={`font-serif text-lg leading-none arabic-text shrink-0 ${
                              isCurrentSurah ? theme.accentText : 'text-slate-400 group-hover:text-slate-200'
                            }`}
                          >
                            {surah.arabicName}
                          </span>

                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                              isCurrentSurah
                                ? `${theme.accent} text-slate-950`
                                : 'bg-slate-900 text-slate-400 opacity-0 group-hover:opacity-100 border border-slate-800'
                            }`}
                          >
                            {isPlayingCurrent ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
