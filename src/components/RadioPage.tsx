import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Headphones,
  Pause,
  Play,
  Radio,
  Shuffle,
  Waves,
} from '../icons/motion';
import { useAudio } from '../context/AudioContext';
import { RADIO_MOOD_LABELS, RADIO_STATIONS, RADIO_STATION_BY_ID, type RadioStation } from '../data/radioStations';
import { useRadioSession } from '../hooks/useRadioSession';
import type { Reciter } from '../types';
import { ReciterPortrait } from './ReciterPortrait';
import { RadioTheater } from './RadioTheater';

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

type StationCardProps = {
  station: RadioStation;
  reciter: Reciter | undefined;
  isActive: boolean;
  isPlaying: boolean;
  disabled: boolean;
  onSelect: () => void;
};

const StationCard: React.FC<StationCardProps> = ({
  station,
  reciter,
  isActive,
  isPlaying,
  disabled,
  onSelect,
}) => {
  const reciterName = reciter?.name ?? 'Récitateur';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`radio-station tap-feedback ${isActive ? 'is-active' : ''} ${isPlaying ? 'is-playing' : ''}`}
      style={{
        '--radio-a': station.gradient[0],
        '--radio-b': station.gradient[1],
        '--radio-c': station.gradient[2],
      } as React.CSSProperties}
      aria-pressed={isActive}
      aria-label={`${station.name}, ${reciterName}`}
    >
      <div className="radio-station__wash" aria-hidden />
      <div className="radio-station__mesh" aria-hidden />

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
  );
};

export const RadioPage: React.FC<RadioPageProps> = ({ onBack, onTheaterChange }) => {
  const { reciters, currentTrack, playbackStatus } = useAudio();
  const radio = useRadioSession();
  const [theaterOpen, setTheaterOpen] = useState(false);
  const [theaterStationId, setTheaterStationId] = useState<string | null>(null);

  useEffect(() => {
    onTheaterChange?.(theaterOpen);
  }, [theaterOpen, onTheaterChange]);

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

  const handleSelectStation = useCallback(
    async (stationId: string) => {
      openTheater(stationId);
      if (radio.activeStationId !== stationId) {
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
  const theaterStation = resolvedTheaterId
    ? RADIO_STATION_BY_ID.get(resolvedTheaterId) ?? null
    : null;
  const theaterReciter = theaterStation
    ? reciterById.get(theaterStation.reciterId)
    : undefined;

  return (
    <>
    {theaterOpen && theaterStation && (
      <RadioTheater
        open={theaterOpen}
        station={theaterStation}
        reciter={theaterReciter}
        starting={radio.starting}
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
            Des stations curatées enchaînent sourates et récitateurs — lancez et laissez le Coran
            vous accompagner.
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
