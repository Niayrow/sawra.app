import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { SURAHS } from '../data/surahs';
import { RADIO_STATION_BY_ID, type RadioStation } from '../data/radioStations';
import type { Moshaf, Reciter, Surah } from '../types';
import { buildRadioQueue } from '../utils/radioQueue';

const STORAGE_KEY = 'quran_streamer_radio_station';

function readStoredStationId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredStationId(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function getRadioMoshaf(reciter: Reciter): Moshaf | null {
  const hafs = reciter.moshaf.find((m) => /hafs/i.test(m.name));
  return hafs ?? reciter.moshaf[0] ?? null;
}

function resolveSurahs(moshaf: Moshaf, ids: number[]): Surah[] {
  const available = new Set(
    moshaf.surah_list
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n)),
  );
  return ids
    .filter((id) => available.has(id))
    .map((id) => SURAHS.find((s) => s.id === id))
    .filter((s): s is Surah => Boolean(s));
}

export type UseRadioSessionResult = {
  activeStationId: string | null;
  activeStation: RadioStation | null;
  isPlayingStation: boolean;
  starting: boolean;
  error: string | null;
  startStation: (stationId: string) => Promise<void>;
  stopStation: () => void;
  toggleStation: (stationId: string) => Promise<void>;
};

export function useRadioSession(): UseRadioSessionResult {
  const {
    reciters,
    currentTrack,
    playbackStatus,
    playTrack,
    play,
    pause,
    setSelectedSurahIds,
    setRepeatMode,
    setCustomPlaylistOrder,
    setActiveReciter,
    setActiveMoshaf,
  } = useAudio();

  const [activeStationId, setActiveStationId] = useState<string | null>(() =>
    readStoredStationId(),
  );
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeStation = useMemo(
    () => (activeStationId ? RADIO_STATION_BY_ID.get(activeStationId) ?? null : null),
    [activeStationId],
  );

  const isPlayingStation = Boolean(
    activeStation &&
      currentTrack &&
      playbackStatus === 'playing' &&
      currentTrack.reciter.id === activeStation.reciterId,
  );

  useEffect(() => {
    writeStoredStationId(activeStationId);
  }, [activeStationId]);

  const startStation = useCallback(
    async (stationId: string) => {
      const station = RADIO_STATION_BY_ID.get(stationId);
      if (!station) return;

      setError(null);
      setStarting(true);

      try {
        const reciter = reciters.find((r) => r.id === station.reciterId);
        if (!reciter) {
          setError('Récitateur indisponible pour cette station.');
          return;
        }

        const moshaf = getRadioMoshaf(reciter);
        if (!moshaf) {
          setError('Aucun moshaf disponible pour ce récitateur.');
          return;
        }

        const queue = buildRadioQueue(station.surahIds, station.shuffle);
        const surahs = resolveSurahs(moshaf, queue);
        if (!surahs.length) {
          setError('Aucune sourate disponible pour cette station.');
          return;
        }

        setActiveReciter(reciter);
        setActiveMoshaf(moshaf);
        setRepeatMode('all');
        setSelectedSurahIds(new Set(surahs.map((s) => s.id)));
        setCustomPlaylistOrder(surahs.map((s) => s.id));
        setActiveStationId(stationId);

        await playTrack(reciter, moshaf, surahs[0]);
      } finally {
        setStarting(false);
      }
    },
    [
      reciters,
      playTrack,
      setActiveMoshaf,
      setActiveReciter,
      setCustomPlaylistOrder,
      setRepeatMode,
      setSelectedSurahIds,
    ],
  );

  const stopStation = useCallback(() => {
    setActiveStationId(null);
    setCustomPlaylistOrder(null);
    pause();
  }, [pause, setCustomPlaylistOrder]);

  const toggleStation = useCallback(
    async (stationId: string) => {
      if (activeStationId === stationId) {
        if (playbackStatus === 'playing') {
          pause();
        } else {
          play();
        }
        return;
      }
      await startStation(stationId);
    },
    [activeStationId, pause, play, playbackStatus, startStation],
  );

  return {
    activeStationId,
    activeStation,
    isPlayingStation,
    starting,
    error,
    startStation,
    stopStation,
    toggleStation,
  };
}
