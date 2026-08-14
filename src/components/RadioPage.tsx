import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Headphones,
  Pause,
  Play,
  Plus,
  Radio,
  Shuffle,
  Trash2,
  Waves,
} from '../icons/motion';
import { useAudio } from '../context/AudioContext';
import { RADIO_MOOD_LABELS, RADIO_STATIONS, RADIO_STATION_BY_ID, type RadioStation } from '../data/radioStations';
import { useRadioSession } from '../hooks/useRadioSession';
import type { Reciter } from '../types';
import { ReciterPortrait } from './ReciterPortrait';
import { RadioTheater } from './RadioTheater';
import { CustomRadioBuilder } from './CustomRadioBuilder';
import { capturePostHogEvent } from '../utils/posthog';
import {
  CUSTOM_RADIO_GRADIENT,
  CUSTOM_RADIO_ID,
  customRadioShareUrl,
  readCustomRadioFromSearch,
  type CustomRadioConfig,
} from '../utils/customRadio';
import { copyTextToClipboard } from '../utils/clipboard';

type RadioPageProps = {
  onBack: () => void;
  onTheaterChange?: (open: boolean) => void;
};

const RadioWaveform: React.FC<{ active: boolean }> = ({ active }) => (
  <div className={`radio-waveform ${active ? 'is-active' : ''}`} aria-hidden>
    {Array.from({ length: 12 }, (_, i) => (
      <span
        key={i}
        className="radio-waveform__bar"
        style={{ animationDelay: `${i * 0.07}s` }}
      />
    ))}
  </div>
);

function stationFromCustom(config: CustomRadioConfig): RadioStation {
  return {
    id: CUSTOM_RADIO_ID,
    name: config.name,
    tagline: `${config.reciterIds.length} voix · ${config.surahIds.length} sourates`,
    description: 'Radio personnalisée créée sur Sawra.',
    reciterId: config.reciterIds[0],
    surahIds: config.surahIds,
    shuffle: config.shuffle,
    gradient: CUSTOM_RADIO_GRADIENT,
    mood: 'classique',
  };
}

type StationCardProps = {
  station: RadioStation;
  reciter: Reciter | undefined;
  isActive: boolean;
  isPlaying: boolean;
  disabled: boolean;
  onSelect: () => void;
  onCopyLink?: () => void;
  onDelete?: () => void;
  copyLabel?: string;
};

const StationCard: React.FC<StationCardProps> = ({
  station,
  reciter,
  isActive,
  isPlaying,
  disabled,
  onSelect,
  onCopyLink,
  onDelete,
  copyLabel = 'Copier',
}) => {
  const reciterName = reciter?.name ?? 'Récitateur';
  const hasActions = Boolean(onCopyLink || onDelete);

  return (
    <div
      className={`radio-station ${isActive ? 'is-active' : ''} ${isPlaying ? 'is-playing' : ''} ${hasActions ? 'has-actions' : ''}`}
      style={{
        '--radio-a': station.gradient[0],
        '--radio-b': station.gradient[1],
        '--radio-c': station.gradient[2],
      } as React.CSSProperties}
    >
      <div className="radio-station__wash" aria-hidden />
      <div className="radio-station__mesh" aria-hidden />

      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className="radio-station__hit tap-feedback"
        aria-pressed={isActive}
        aria-label={`${station.name}, ${reciterName}`}
      >
        <div className="radio-station__top">
          <span className="radio-station__mood">{RADIO_MOOD_LABELS[station.mood]}</span>
          {station.shuffle && (
            <span className="radio-station__shuffle" title="Lecture aléatoire">
              <Shuffle className="h-3 w-3" />
            </span>
          )}
        </div>

        <div className="radio-station__body">
          <div className="radio-station__portrait">
            {reciter ? (
              <ReciterPortrait reciter={reciter} alt="" />
            ) : (
              <span className="radio-station__portrait-fallback" aria-hidden>
                {reciterName[0]}
              </span>
            )}
            <span className="radio-station__portrait-ring" aria-hidden />
          </div>
          <div className="radio-station__copy">
            <h3 className="radio-station__name">{station.name}</h3>
            <p className="radio-station__tagline">{station.tagline}</p>
            <p className="radio-station__meta">
              {reciterName}
              <span className="radio-station__dot" aria-hidden>·</span>
              {station.surahIds.length} sourates
            </p>
          </div>
        </div>

        <div className="radio-station__footer">
          <p className="radio-station__desc">{station.description}</p>
          <span className="radio-station__play">
            {isActive && isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current ml-0.5" />
            )}
          </span>
        </div>
      </button>

      {hasActions ? (
        <div className="radio-station__actions">
          {onCopyLink ? (
            <button
              type="button"
              className="radio-station__action tap-feedback"
              onClick={(e) => {
                e.stopPropagation();
                onCopyLink();
              }}
              aria-label="Copier le lien de partage"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {copyLabel}
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className="radio-station__action is-danger tap-feedback"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Supprimer ma radio"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Supprimer
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const RadioPage: React.FC<RadioPageProps> = ({ onBack, onTheaterChange }) => {
  const { reciters, currentTrack, playbackStatus } = useAudio();
  const radio = useRadioSession();
  const [theaterOpen, setTheaterOpen] = useState(false);
  const [theaterStationId, setTheaterStationId] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const sharedBootRef = useRef(false);

  const hideChrome = theaterOpen || builderOpen;

  useEffect(() => {
    onTheaterChange?.(hideChrome);
  }, [hideChrome, onTheaterChange]);

  useEffect(() => {
    return () => onTheaterChange?.(false);
  }, [onTheaterChange]);

  const openTheater = useCallback((stationId: string) => {
    setTheaterStationId(stationId);
    setTheaterOpen(true);
  }, []);

  const closeTheater = useCallback(() => {
    setTheaterOpen(false);
  }, []);

  const playCustom = useCallback(
    async (config: CustomRadioConfig) => {
      setBuilderOpen(false);
      capturePostHogEvent('radio_station_started', { station_id: CUSTOM_RADIO_ID });
      await radio.startCustomStation(config);
      openTheater(CUSTOM_RADIO_ID);
    },
    [openTheater, radio],
  );

  /** Open shared `?c=` / `?custom=` links once reciters are ready. */
  useEffect(() => {
    if (sharedBootRef.current || !reciters.length || typeof window === 'undefined') return;
    const shared = readCustomRadioFromSearch(window.location.search);
    if (!shared) return;
    sharedBootRef.current = true;
    void playCustom(shared);
  }, [playCustom, reciters.length]);

  const handleSelectStation = useCallback(
    async (stationId: string) => {
      openTheater(stationId);
      if (radio.activeStationId !== stationId) {
        capturePostHogEvent('radio_station_started', { station_id: stationId });
        if (stationId === CUSTOM_RADIO_ID && radio.customConfig) {
          await radio.startCustomStation(radio.customConfig);
          return;
        }
        await radio.startStation(stationId);
        return;
      }
      if (playbackStatus !== 'playing') {
        await radio.toggleStation(stationId);
      }
    },
    [openTheater, playbackStatus, radio],
  );

  const handleStop = useCallback(() => {
    radio.stopStation();
    setTheaterStationId(null);
    closeTheater();
  }, [closeTheater, radio]);

  const reciterById = useMemo(() => {
    const map = new Map<number, Reciter>();
    for (const r of reciters) map.set(r.id, r);
    return map;
  }, [reciters]);

  const nowPlayingReciter = currentTrack?.reciter.name ?? '';
  const resolvedTheaterId = theaterStationId ?? radio.activeStationId;
  const theaterStation =
    resolvedTheaterId === CUSTOM_RADIO_ID
      ? radio.activeStation?.id === CUSTOM_RADIO_ID
        ? radio.activeStation
        : null
      : resolvedTheaterId
        ? RADIO_STATION_BY_ID.get(resolvedTheaterId) ?? null
        : null;
  const theaterReciter = currentTrack?.reciter
    ?? (theaterStation ? reciterById.get(theaterStation.reciterId) : undefined);

  const customShareUrl = radio.customConfig
    ? customRadioShareUrl(
        radio.customConfig,
        typeof window !== 'undefined' ? window.location.origin : 'https://sawra.app',
      )
    : null;

  const handleCopyCustomLink = useCallback(async () => {
    if (!customShareUrl) return;
    const ok = await copyTextToClipboard(customShareUrl);
    setCopyFeedback(ok ? 'Lien copié' : 'Impossible de copier');
    if (ok) capturePostHogEvent('custom_radio_copy_link', { from: 'radio_page' });
    window.setTimeout(() => setCopyFeedback(null), 2200);
  }, [customShareUrl]);

  const handleDeleteCustom = useCallback(() => {
    if (!radio.customConfig) return;
    const ok = window.confirm(`Supprimer « ${radio.customConfig.name} » ?`);
    if (!ok) return;
    radio.deleteCustomStation();
    setTheaterStationId(null);
    closeTheater();
    capturePostHogEvent('custom_radio_deleted');
  }, [closeTheater, radio]);

  return (
    <>
    {builderOpen && (
      <CustomRadioBuilder
        reciters={reciters}
        initial={radio.customConfig}
        starting={radio.starting}
        onClose={() => setBuilderOpen(false)}
        onPlay={(config) => void playCustom(config)}
      />
    )}

    {theaterOpen && theaterStation && (
      <RadioTheater
        open={theaterOpen}
        station={theaterStation}
        reciter={theaterReciter}
        starting={radio.starting}
        shareUrl={theaterStation.id === CUSTOM_RADIO_ID ? customShareUrl : null}
        onMinimize={closeTheater}
        onStop={handleStop}
        onTogglePlay={() => {
          if (radio.activeStationId) void radio.toggleStation(radio.activeStationId);
        }}
      />
    )}

    <div className={`radio-page ${theaterOpen ? 'is-theater-open' : ''}`}>
      <div className="radio-page__glow" aria-hidden />
      <div className="radio-page__orb radio-page__orb--a" aria-hidden />
      <div className="radio-page__orb radio-page__orb--b" aria-hidden />

      <header className="radio-page__header">
        <div className="radio-page__topbar">
          <button
            type="button"
            onClick={onBack}
            className="radio-page__back tap-feedback"
            aria-label="Retour à l'accueil"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>

          <div className="radio-brand" aria-label="sawra.app">
            <img
              src="/icons/sansfond.webp"
              alt=""
              width={48}
              height={48}
              decoding="async"
              className="radio-brand__logo"
              draggable={false}
              aria-hidden
            />
            <div className="radio-brand__text">
              <span className="radio-brand__name reciter-name-gradient is-selected">
                sawra.app
              </span>
              <span className="radio-brand__tag">
                <Radio className="inline h-3 w-3 -mt-px mr-1 opacity-80" />
                Radio Coran
              </span>
            </div>
          </div>
        </div>

        <div className="radio-page__intro">
          <h1 className="radio-page__title">Écoutez sans choisir</h1>
          <p className="radio-page__lede">
            Stations curatées ou radio perso — choisissez les voix, les sourates, puis partagez
            votre playlist.
          </p>
        </div>
      </header>

      {radio.activeStation && currentTrack && radio.activeStationId && !theaterOpen && (
        <section className="radio-now" aria-live="polite">
          <div
            className="radio-now__card"
            style={{
              '--radio-a': radio.activeStation.gradient[0],
              '--radio-b': radio.activeStation.gradient[1],
              '--radio-c': radio.activeStation.gradient[2],
            } as React.CSSProperties}
          >
            <div className="radio-now__wash" aria-hidden />
            <RadioWaveform active={playbackStatus === 'playing'} />
            <div className="radio-now__content">
              <p className="radio-now__label">
                <span className="radio-now__live">
                  <span className="radio-now__live-dot" aria-hidden />
                  En direct
                </span>
                · {radio.activeStation.name}
              </p>
              <h2 className="radio-now__surah">{currentTrack.surah.name}</h2>
              <p className="radio-now__reciter">{nowPlayingReciter}</p>
              <div className="radio-now__actions">
                <button
                  type="button"
                  className="radio-now__toggle brand-button-primary tap-feedback"
                  onClick={() => radio.activeStationId && openTheater(radio.activeStationId)}
                >
                  Ouvrir en grand
                </button>
                <button
                  type="button"
                  className="radio-now__toggle brand-button-primary tap-feedback"
                  onClick={() => void radio.toggleStation(radio.activeStationId!)}
                >
                  {playbackStatus === 'playing' ? (
                    <>
                      <Pause className="h-4 w-4 fill-current" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                      Reprendre
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="radio-now__stop tap-feedback"
                  onClick={radio.stopStation}
                >
                  Arrêter
                </button>
                {radio.activeStationId === CUSTOM_RADIO_ID && customShareUrl ? (
                  <button
                    type="button"
                    className="radio-now__stop tap-feedback"
                    onClick={() => void handleCopyCustomLink()}
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                    {copyFeedback ?? 'Copier le lien'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      )}

      {radio.error && (
        <p className="radio-page__error" role="alert">
          {radio.error}
        </p>
      )}

      <section className="radio-page__stations" aria-label="Stations">
        <button
          type="button"
          className="radio-create-card tap-feedback"
          onClick={() => setBuilderOpen(true)}
        >
          <span className="radio-create-card__icon" aria-hidden>
            <Plus className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="radio-create-card__title">Créer ma radio</span>
            <span className="radio-create-card__meta">
              Vos récitateurs, vos sourates, un lien à partager
            </span>
          </span>
        </button>

        {radio.customConfig ? (
          <div className="radio-stations-grid" style={{ marginBottom: '0.85rem' }}>
            <StationCard
              station={
                radio.activeStation?.id === CUSTOM_RADIO_ID
                  ? radio.activeStation
                  : stationFromCustom(radio.customConfig)
              }
              reciter={
                (radio.activeStationId === CUSTOM_RADIO_ID ? currentTrack?.reciter : undefined) ??
                reciterById.get(radio.customConfig.reciterIds[0])
              }
              isActive={radio.activeStationId === CUSTOM_RADIO_ID}
              isPlaying={radio.activeStationId === CUSTOM_RADIO_ID && playbackStatus === 'playing'}
              disabled={radio.starting}
              onSelect={() => void handleSelectStation(CUSTOM_RADIO_ID)}
              onCopyLink={() => void handleCopyCustomLink()}
              onDelete={handleDeleteCustom}
              copyLabel={copyFeedback?.startsWith('Lien copié') ? 'Copié ✓' : 'Copier'}
            />
          </div>
        ) : null}

        <div className="radio-page__stations-head">
          <h2 className="radio-page__stations-title">
            <Waves className="h-4 w-4 text-[#bfa078]" aria-hidden />
            Stations
          </h2>
          <p className="radio-page__stations-meta">{RADIO_STATIONS.length} playlists prêtes</p>
        </div>

        <div className="radio-stations-grid">
          {RADIO_STATIONS.map((station) => {
            const isActive = radio.activeStationId === station.id;
            const isPlaying = isActive && playbackStatus === 'playing';
            return (
              <StationCard
                key={station.id}
                station={station}
                reciter={reciterById.get(station.reciterId)}
                isActive={isActive}
                isPlaying={isPlaying}
                disabled={radio.starting}
                onSelect={() => void handleSelectStation(station.id)}
              />
            );
          })}
        </div>
      </section>

      <footer className="radio-page__footer">
        <Headphones className="h-4 w-4 shrink-0 text-[#6b8096]" aria-hidden />
        <p>
          La lecture continue via le lecteur Sawra. Changez de station à tout moment — la playlist
          s&apos;adapte automatiquement.
        </p>
      </footer>
    </div>
    </>
  );
};

export default RadioPage;
