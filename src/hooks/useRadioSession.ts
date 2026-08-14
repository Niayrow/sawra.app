import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { SURAHS } from '../data/surahs';
import { RADIO_STATION_BY_ID, type RadioStation } from '../data/radioStations';
import type { Moshaf, Reciter, Surah } from '../types';
import { buildRadioQueue } from '../utils/radioQueue';
import {
  buildCustomRadioSlots,
  CUSTOM_RADIO_GRADIENT,
  CUSTOM_RADIO_ID,
  normalizeCustomRadio,
  type CustomRadioConfig,
} from '../utils/customRadio';

const STORAGE_KEY = 'quran_streamer_radio_station';
const CUSTOM_STORAGE_KEY = 'quran_streamer_custom_radio';

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

function readStoredCustom(): CustomRadioConfig | null {
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
    if (!raw) return null;
    return normalizeCustomRadio(JSON.parse(raw) as CustomRadioConfig);
  } catch {
    return null;
  }
}

function writeStoredCustom(config: CustomRadioConfig | null) {
  try {
    if (config) localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(config));
    else localStorage.removeItem(CUSTOM_STORAGE_KEY);
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

function customAsStation(config: CustomRadioConfig): RadioStation {
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

export type UseRadioSessionResult = {
  activeStationId: string | null;
  activeStation: RadioStation | null;
  customConfig: CustomRadioConfig | null;
  isPlayingStation: boolean;
  starting: boolean;
  error: string | null;
  startStation: (stationId: string) => Promise<void>;
  startCustomStation: (config: CustomRadioConfig) => Promise<void>;
  stopStation: () => void;
  deleteCustomStation: () => void;
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
    setRadioSlotQueue,
    setActiveReciter,
    setActiveMoshaf,
  } = useAudio();

  const [activeStationId, setActiveStationId] = useState<string | null>(() =>
    readStoredStationId(),
  );
  const [customConfig, setCustomConfig] = useState<CustomRadioConfig | null>(() =>
    readStoredCustom(),
  );
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeStation = useMemo(() => {
    if (!activeStationId) return null;
    if (activeStationId === CUSTOM_RADIO_ID && customConfig) {
      return customAsStation(customConfig);
    }
    return RADIO_STATION_BY_ID.get(activeStationId) ?? null;
  }, [activeStationId, customConfig]);

  const isPlayingStation = Boolean(
    activeStation &&
      currentTrack &&
      playbackStatus === 'playing' &&
      (activeStationId === CUSTOM_RADIO_ID ||
        currentTrack.reciter.id === activeStation.reciterId),
  );

  useEffect(() => {
    writeStoredStationId(activeStationId);
  }, [activeStationId]);

  useEffect(() => {
    writeStoredCustom(customConfig);
  }, [customConfig]);

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

        setRadioSlotQueue(null);
        setActiveReciter(reciter);
        setActiveMoshaf(moshaf);
        setRepeatMode('all');
        setSelectedSurahIds(new Set(surahs.map((s) => s.id)));
        setCustomPlaylistOrder(surahs.map((s) => s.id));
        setCustomConfig(null);
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
      setRadioSlotQueue,
      setRepeatMode,
      setSelectedSurahIds,
    ],
  );

  const startCustomStation = useCallback(
    async (raw: CustomRadioConfig) => {
      const config = normalizeCustomRadio(raw);
      if (!config) {
        setError('Choisissez au moins une voix et une sourate.');
        return;
      }

      setError(null);
      setStarting(true);

      try {
        const canPlay = (reciterId: number, surahId: number) => {
          const reciter = reciters.find((r) => r.id === reciterId);
          if (!reciter) return false;
          const moshaf = getRadioMoshaf(reciter);
          if (!moshaf) return false;
          return resolveSurahs(moshaf, [surahId]).length > 0;
        };

        const playable = buildCustomRadioSlots(config, canPlay);

        if (!playable.length) {
          setError('Aucune combinaison récitateur / sourate disponible.');
          return;
        }

        const first = playable[0];
        const reciter = reciters.find((r) => r.id === first.reciterId)!;
        const moshaf = getRadioMoshaf(reciter)!;
        const surah = SURAHS.find((s) => s.id === first.surahId)!;

        setRadioSlotQueue(playable);
        setActiveReciter(reciter);
        setActiveMoshaf(moshaf);
        setRepeatMode('all');
        setSelectedSurahIds(new Set(playable.map((s) => s.surahId)));
        setCustomPlaylistOrder(playable.map((s) => s.surahId));
        setCustomConfig(config);
        setActiveStationId(CUSTOM_RADIO_ID);

        await playTrack(reciter, moshaf, surah);
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
      setRadioSlotQueue,
      setRepeatMode,
      setSelectedSurahIds,
    ],
  );

  const stopStation = useCallback(() => {
    setActiveStationId(null);
    setCustomPlaylistOrder(null);
    setRadioSlotQueue(null);
    pause();
  }, [pause, setCustomPlaylistOrder, setRadioSlotQueue]);

  const deleteCustomStation = useCallback(() => {
    if (activeStationId === CUSTOM_RADIO_ID) {
      setActiveStationId(null);
      setCustomPlaylistOrder(null);
      setRadioSlotQueue(null);
      pause();
    }
    setCustomConfig(null);
    writeStoredCustom(null);
  }, [activeStationId, pause, setCustomPlaylistOrder, setRadioSlotQueue]);

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
      if (stationId === CUSTOM_RADIO_ID && customConfig) {
        await startCustomStation(customConfig);
        return;
      }
      await startStation(stationId);
    },
    [
      activeStationId,
      customConfig,
      pause,
      play,
      playbackStatus,
      startCustomStation,
      startStation,
    ],
  );

  return {
    activeStationId,
    activeStation,
    customConfig,
    isPlayingStation,
    starting,
    error,
    startStation,
    startCustomStation,
    stopStation,
    deleteCustomStation,
    toggleStation,
  };
}
