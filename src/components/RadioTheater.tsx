import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Shuffle,
  SkipBack,
  SkipForward,
} from '../icons/motion';
import { useAudio } from '../context/AudioContext';
import { RADIO_MOOD_LABELS, type RadioStation } from '../data/radioStations';
import { useActiveAyah } from '../hooks/useActiveAyah';
import type { Reciter } from '../types';
import {
  getReciterHdImage,
  getReciterHdNativeWidth,
  getReciterImage,
  RECITER_BACKGROUND_HD,
} from '../utils/images';

const APP_LOGO = '/icons/sansfond.webp';

const formatTime = (time: number) => {
  if (!Number.isFinite(time) || time < 0) return '0:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatClock = () => {
  const now = new Date();
  return now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

type RadioTheaterProps = {
  open: boolean;
  station: RadioStation;
  reciter: Reciter | undefined;
  onMinimize: () => void;
  onStop: () => void;
  onTogglePlay: () => void;
  starting: boolean;
};

const TheaterWaveform: React.FC<{ active: boolean; large?: boolean }> = ({ active, large }) => (
  <div
    className={`radio-theater__waveform ${active ? 'is-active' : ''} ${large ? 'is-large' : ''}`}
    aria-hidden
  >
    {Array.from({ length: large ? 24 : 16 }, (_, i) => (
      <span
        key={i}
        className="radio-theater__waveform-bar"
        style={{ animationDelay: `${i * 0.05}s` }}
      />
    ))}
  </div>
);

/** Sharp portrait for large displays — uses PNG source, never upscaled past native width. */
const TheaterPortrait: React.FC<{
  reciter: Reciter;
  name: string;
  onNativeWidth?: (width: number) => void;
}> = ({ reciter, name, onNativeWidth }) => {
  const hdSrc = getReciterHdImage(reciter);

  if (hdSrc) {
    return (
      <div className="radio-theater__portrait-stack">
        <img
          src={RECITER_BACKGROUND_HD}
          alt=""
          aria-hidden
          className="radio-theater__portrait-bg"
          decoding="async"
        />
        <img
          src={hdSrc}
          alt={name}
          className="radio-theater__portrait-fg"
          decoding="sync"
          fetchPriority="high"
          onLoad={(e) => onNativeWidth?.(e.currentTarget.naturalWidth)}
        />
      </div>
    );
  }

  return (
    <img
      src={getReciterImage(reciter)}
      alt={name}
      className="radio-theater__portrait-solo"
      decoding="sync"
      fetchPriority="high"
    />
  );
};

export const RadioTheater: React.FC<RadioTheaterProps> = ({
  open,
  station,
  reciter,
  onMinimize,
  onStop,
  onTogglePlay,
  starting,
}) => {
  const {
    currentTrack,
    playbackStatus,
    currentTime,
    duration,
    playNextTrack,
    playPrevTrack,
  } = useAudio();

  const { activeAyah, totalAyahs, ayahProgress, available: ayahSyncAvailable } =
    useActiveAyah({ enabled: open });

  const shellRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clock, setClock] = useState(formatClock);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<number | null>(null);
  const [portraitNativeW, setPortraitNativeW] = useState<number | null>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isPlaying = playbackStatus === 'playing';
  const reciterName = reciter?.name ?? currentTrack?.reciter.name ?? 'Récitateur';
  const discCapPx =
    portraitNativeW ??
    (reciter ? getReciterHdNativeWidth(reciter.id) : null);

  useEffect(() => {
    if (!open) return;
    setPortraitNativeW(null);
  }, [open, reciter?.id]);

  useEffect(() => {
    if (!open) return;
    setClock(formatClock());
    const id = window.setInterval(() => setClock(formatClock()), 30_000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onFsChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [open]);

  useEffect(() => {
    if (!open) {
      if (document.fullscreenElement === shellRef.current) {
        void document.exitFullscreen?.().catch(() => {});
      }
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onMinimize();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onMinimize]);

  const bumpControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (isPlaying) setControlsVisible(false);
      hideTimerRef.current = null;
    }, 4500);
  }, [isPlaying]);

  useEffect(() => {
    if (!open) return;
    bumpControls();
    return () => {
      if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current);
    };
  }, [open, bumpControls, isPlaying]);

  const toggleFullscreen = async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      /* unsupported */
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      ref={shellRef}
      className={`radio-theater ${controlsVisible ? 'is-controls-visible' : ''}`}
      style={{
        '--radio-a': station.gradient[0],
        '--radio-b': station.gradient[1],
        '--radio-c': station.gradient[2],
      } as React.CSSProperties}
      onPointerMove={bumpControls}
      onPointerDown={bumpControls}
      role="dialog"
      aria-modal="true"
      aria-label={`Radio ${station.name}`}
    >
      <div className="radio-theater__bg" aria-hidden>
        <div className="radio-theater__bg-gradient" />
        <div className="radio-theater__bg-orb radio-theater__bg-orb--a" />
        <div className="radio-theater__bg-orb radio-theater__bg-orb--b" />
        <div className="radio-theater__bg-grid" />
      </div>

      <header className={`radio-theater__topbar ${controlsVisible ? '' : 'is-minimal'}`}>
        <button
          type="button"
          className="radio-theater__brand-chip tap-feedback"
          onClick={onMinimize}
          aria-label="Retour aux stations"
        >
          <img
            src={APP_LOGO}
            alt=""
            width={36}
            height={36}
            className="radio-theater__brand-chip-logo"
            draggable={false}
          />
          <span className="radio-theater__brand-chip-text">
            <span className="radio-theater__brand-chip-name reciter-name-gradient is-selected">
              Sawra
            </span>
            <span className="radio-theater__brand-chip-sub">
              Radio Coran · Stations
            </span>
          </span>
          <ChevronDown className="radio-theater__brand-chip-chevron h-4 w-4 shrink-0" />
        </button>

        <div className="radio-theater__topbar-center">
          <span className="radio-theater__live">
            <span className="radio-theater__live-dot" aria-hidden />
            EN DIRECT
          </span>
          <span className="radio-theater__clock" aria-label="Heure">
            {clock}
          </span>
        </div>

        <button
          type="button"
          className="radio-theater__tool radio-theater__tool--fs tap-feedback"
          onClick={() => void toggleFullscreen()}
          aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran pour écran externe'}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </button>
      </header>

      <main className="radio-theater__stage">
        <div className="radio-theater__stage-head">
          <div className="radio-theater__station-meta">
            <span className="radio-theater__mood">{RADIO_MOOD_LABELS[station.mood]}</span>
            {station.shuffle && (
              <span className="radio-theater__shuffle">
                <Shuffle className="h-3.5 w-3.5" />
                Aléatoire
              </span>
            )}
          </div>

          <h1 className="radio-theater__station-name">{station.name}</h1>
          <p className="radio-theater__station-tagline">{station.tagline}</p>
        </div>

        <div className="radio-theater__stage-hero">
          <div
            className="radio-theater__disc-wrap"
            style={
              discCapPx
                ? ({
                    width: `min(52vw, min(24rem, ${discCapPx}px), 36vh)`,
                  } as React.CSSProperties)
                : undefined
            }
          >
            <div
              className={`radio-theater__disc-ring ${isPlaying ? 'is-spinning' : ''}`}
              aria-hidden
            />
            <div className="radio-theater__disc">
              <div className="radio-theater__disc-glow" aria-hidden />
              <div className="radio-theater__disc-inner">
                {reciter ? (
                  <TheaterPortrait
                    reciter={reciter}
                    name={reciterName}
                    onNativeWidth={setPortraitNativeW}
                  />
                ) : (
                  <span className="radio-theater__disc-fallback">{reciterName[0]}</span>
                )}
              </div>
            </div>
            <TheaterWaveform active={isPlaying} large />
          </div>
        </div>

        <div className="radio-theater__stage-track">
          {starting ? (
            <p className="radio-theater__status">Connexion à la station…</p>
          ) : currentTrack ? (
            <div className="radio-theater__now">
              <p className="radio-theater__surah-label">Sourate {currentTrack.surah.id}</p>
              <h2 className="radio-theater__surah-name">{currentTrack.surah.name}</h2>
              {currentTrack.surah.arabicName && (
                <p className="radio-theater__surah-ar" dir="rtl" lang="ar">
                  {currentTrack.surah.arabicName}
                </p>
              )}
              <p className="radio-theater__reciter">{reciterName}</p>

              {ayahSyncAvailable && activeAyah != null && totalAyahs > 0 && (
                <p className="radio-theater__ayah">
                  Verset {activeAyah} / {totalAyahs}
                  {ayahProgress != null && (
                    <span
                      className="radio-theater__ayah-bar"
                      role="progressbar"
                      aria-valuenow={Math.round(ayahProgress * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <span style={{ width: `${Math.round(ayahProgress * 100)}%` }} />
                    </span>
                  )}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </main>

      <footer className={`radio-theater__dock ${controlsVisible ? '' : 'is-minimal'}`}>
        <div className="radio-theater__progress-wrap">
          <div className="radio-theater__progress-track">
            <div className="radio-theater__progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="radio-theater__progress-times">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className={`radio-theater__controls ${controlsVisible ? '' : 'is-hidden'}`}>
          <div className="radio-theater__controls-main">
            <button
              type="button"
              className="radio-theater__ctrl radio-theater__ctrl--secondary tap-feedback"
              onClick={playPrevTrack}
              aria-label="Sourate précédente"
            >
              <SkipBack className="h-6 w-6 fill-current" />
            </button>

            <button
              type="button"
              className="radio-theater__ctrl radio-theater__ctrl--primary tap-feedback"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pause' : 'Lecture'}
            >
              {isPlaying ? (
                <Pause className="h-8 w-8 fill-current" />
              ) : (
                <Play className="h-8 w-8 fill-current ml-1" />
              )}
            </button>

            <button
              type="button"
              className="radio-theater__ctrl radio-theater__ctrl--secondary tap-feedback"
              onClick={playNextTrack}
              aria-label="Sourate suivante"
            >
              <SkipForward className="h-6 w-6 fill-current" />
            </button>
          </div>

          <button
            type="button"
            className="radio-theater__ctrl radio-theater__ctrl--ghost tap-feedback"
            onClick={onStop}
            aria-label="Arrêter la radio"
          >
            Arrêter
          </button>
        </div>
      </footer>

      <div className="radio-theater__watermark" aria-hidden>
        <img
          src={APP_LOGO}
          alt=""
          width={22}
          height={22}
          className="radio-theater__watermark-logo"
          draggable={false}
        />
        <span className="radio-theater__watermark-copy">
          <span className="radio-theater__watermark-name">Sawra</span>
          <span className="radio-theater__watermark-tag">Radio Coran</span>
        </span>
      </div>
    </div>,
    document.body,
  );
};
