import React, { useEffect, useMemo, useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { useComparePlayers, type CompareSide } from '../hooks/useComparePlayers';
import { SURAHS } from '../data/surahs';
import type { Reciter, Surah } from '../types';
import { ReciterPortrait } from './ReciterPortrait';
import { getDefaultMoshaf } from '../utils/audioUrl';
import {
  ArrowLeftRight, Pause, Play, Search, GitCompare, RefreshCw, AlertCircle,
} from '../icons/motion';

const DEFAULT_COMPARE_IDS = [123, 54] as const;

const formatTime = (time: number) => {
  if (!Number.isFinite(time) || time < 0) return '0:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface ReciterSlotPickerProps {
  label: string;
  side: CompareSide;
  accentClass: string;
  borderClass: string;
  reciter: Reciter | null;
  reciters: Reciter[];
  isActive: boolean;
  status: string;
  onSelect: (reciter: Reciter) => void;
}

const ReciterSlotPicker: React.FC<ReciterSlotPickerProps> = ({
  label,
  side,
  accentClass,
  borderClass,
  reciter,
  reciters,
  isActive,
  status,
  onSelect,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return reciters.slice(0, 8);
    const q = query.toLowerCase();
    return reciters.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 8);
  }, [reciters, query]);

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 transition-all ${borderClass} ${isActive ? 'ring-1 ring-[#e4ccb4]/24 shadow-lg' : 'bg-[#111d2d]/40'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-black uppercase tracking-widest ${accentClass}`}>{label}</span>
        {isActive && status === 'playing' && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#e4ccb4] animate-pulse">En lecture</span>
        )}
      </div>

      {reciter ? (
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden border border-[#46607b] shrink-0">
            <ReciterPortrait reciter={reciter} width={56} height={56} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-[#f6f8fb] truncate">{reciter.name}</p>
            <p className="text-[10px] text-[#95a7ba] truncate">
              {getDefaultMoshaf(reciter.moshaf)?.name ?? '—'}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#95a7ba]">Choisissez un récitateur</p>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#95a7ba]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Récitateur ${side}…`}
          className="w-full pl-9 pr-3 py-2 bg-[#07111d]/70 border border-[#30455c] rounded-xl text-xs text-[#e6edf5] placeholder:text-[#8295aa] focus:outline-none focus:border-[#c9a06a]/45"
        />
      </div>

      {query.trim() && (
        <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                onSelect(r);
                setQuery('');
              }}
              className={`text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                reciter?.id === r.id
                  ? 'bg-[#e4ccb4]/12 text-[#e8d4bc]'
                  : 'text-[#d0d9e3] hover:bg-[#162538]/85'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface CompareSlotControlsProps {
  side: CompareSide;
  reciter: Reciter | null;
  status: string;
  isActive: boolean;
  accentClass: string;
  onToggle: () => void;
}

const CompareSlotControls: React.FC<CompareSlotControlsProps> = ({
  side,
  reciter,
  status,
  isActive,
  accentClass,
  onToggle,
}) => (
  <button
    onClick={onToggle}
    disabled={!reciter}
    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all tap-feedback disabled:opacity-40 disabled:cursor-not-allowed ${
      isActive && status === 'playing'
        ? 'bg-[#e4ccb4] text-[#111d2d] shadow-lg shadow-[#9c6c3c]/20'
        : 'bg-[#111d2d] border border-[#30455c] text-[#e6edf5] hover:border-[#c9a06a]/35'
    }`}
  >
    {status === 'buffering' ? (
      <RefreshCw className={`w-4 h-4 animate-spin ${accentClass}`} />
    ) : isActive && status === 'playing' ? (
      <Pause className="w-4 h-4 fill-current" />
    ) : (
      <Play className="w-4 h-4 fill-current ml-0.5" />
    )}
    {status === 'buffering' ? 'Chargement…' : isActive && status === 'playing' ? 'Pause' : `Écouter ${side}`}
  </button>
);

export const ReciterCompare: React.FC = () => {
  const { reciters } = useAudio();
  const {
    slotA, slotB, activeSide, activeSlot,
    syncSources, toggleSide, switchActiveSide, seekActive, pauseAll,
  } = useComparePlayers();

  const [reciterA, setReciterA] = useState<Reciter | null>(null);
  const [reciterB, setReciterB] = useState<Reciter | null>(null);
  const [surah, setSurah] = useState<Surah>(SURAHS[0]);
  const [surahSearch, setSurahSearch] = useState('');

  useEffect(() => {
    if (reciters.length === 0) return;
    if (!reciterA) {
      setReciterA(reciters.find((r) => r.id === DEFAULT_COMPARE_IDS[0]) ?? reciters[0]);
    }
    if (!reciterB) {
      setReciterB(
        reciters.find((r) => r.id === DEFAULT_COMPARE_IDS[1])
          ?? reciters.find((r) => r.id !== reciterA?.id)
          ?? reciters[1]
          ?? reciters[0]
      );
    }
  }, [reciters, reciterA, reciterB]);

  useEffect(() => {
    if (reciterA && reciterB && surah) {
      syncSources(reciterA, reciterB, surah);
    }
  }, [reciterA, reciterB, surah, syncSources]);

  const filteredSurahs = useMemo(() => {
    if (!surahSearch.trim()) return SURAHS;
    const q = surahSearch.toLowerCase();
    return SURAHS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.arabicName.includes(surahSearch) ||
        s.id.toString().includes(q)
    );
  }, [surahSearch]);

  const progressPercent = activeSlot.duration > 0
    ? (activeSlot.currentTime / activeSlot.duration) * 100
    : 0;

  const hasError = slotA.status === 'error' || slotB.status === 'error';
  const canCompare = reciterA && reciterB && reciterA.id !== reciterB.id;

  return (
    <div className="flex flex-col gap-5">
      <div className="glass-panel p-5 rounded-2xl border border-[#7990a1]/20 bg-[#7990a1]/6">
        <h2 className="text-lg font-black text-[#f6f8fb] flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-[#b8c7d2]" />
          Comparateur A / B
        </h2>
        <p className="text-xs text-[#b4c0ce] mt-1 leading-relaxed">
          Écoutez la même sourate avec deux récitateurs. Basculez instantanément entre les voix au même instant de lecture.
        </p>
      </div>

      {!canCompare && reciterA && reciterB && reciterA.id === reciterB.id && (
        <div className="flex items-center gap-2 text-xs text-[#e8d4bc] bg-[#e4ccb4]/10 border border-[#c9a06a]/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Choisissez deux récitateurs différents pour comparer.
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase font-bold tracking-widest text-[#95a7ba]">Sourate à comparer</label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#95a7ba]" />
          <input
            type="text"
            value={surahSearch}
            onChange={(e) => setSurahSearch(e.target.value)}
            placeholder="Rechercher une sourate…"
            className="w-full pl-11 pr-4 py-3 bg-[#111d2d]/78 border border-[#30455c] rounded-2xl text-sm text-[#e6edf5] placeholder:text-[#8295aa] focus:outline-none focus:border-[#7990a1]/45"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {(surahSearch.trim() ? filteredSurahs : SURAHS.filter((s) => [1, 18, 36, 55, 67, 112].includes(s.id))).map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSurah(s);
                setSurahSearch('');
                pauseAll();
              }}
              className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                surah.id === s.id
                  ? 'bg-[#7990a1]/14 border-[#7990a1]/40 text-[#d7e4ef]'
                  : 'border-[#30455c] text-[#aab7c5] hover:text-[#f6f8fb]'
              }`}
            >
              {s.id}. {s.name}
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-[#d0d9e3]">
          <span className="font-serif arabic-text text-[#e4ccb4] text-lg mr-2">{surah.arabicName}</span>
          {surah.name} — {surah.translation}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReciterSlotPicker
          label="Voix A"
          side="A"
          accentClass="text-[#b8c7d2]"
          borderClass={activeSide === 'A' ? 'border-[#7990a1]/40 bg-[#7990a1]/6' : 'border-[#30455c]/60'}
          reciter={reciterA}
          reciters={reciters}
          isActive={activeSide === 'A'}
          status={slotA.status}
          onSelect={setReciterA}
        />
        <ReciterSlotPicker
          label="Voix B"
          side="B"
          accentClass="text-[#e4ccb4]"
          borderClass={activeSide === 'B' ? 'border-[#c9a06a]/40 bg-[#e4ccb4]/6' : 'border-[#30455c]/60'}
          reciter={reciterB}
          reciters={reciters}
          isActive={activeSide === 'B'}
          status={slotB.status}
          onSelect={setReciterB}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CompareSlotControls
          side="A"
          reciter={reciterA}
          status={slotA.status}
          isActive={activeSide === 'A'}
          accentClass="text-[#b8c7d2]"
          onToggle={() => void toggleSide('A')}
        />
        <CompareSlotControls
          side="B"
          reciter={reciterB}
          status={slotB.status}
          isActive={activeSide === 'B'}
          accentClass="text-[#e4ccb4]"
          onToggle={() => void toggleSide('B')}
        />
      </div>

      <button
        onClick={() => {
          if (!activeSide) {
            void toggleSide('A');
            return;
          }
          void switchActiveSide(activeSide === 'A' ? 'B' : 'A');
        }}
        disabled={!canCompare}
        className="w-full py-3.5 rounded-2xl border border-[#46607b] bg-[#111d2d]/78 text-[#e6edf5] font-bold text-sm flex items-center justify-center gap-2 hover:border-[#c9a06a]/35 hover:text-[#e8d4bc] transition-all tap-feedback disabled:opacity-40"
      >
        <ArrowLeftRight className="w-4 h-4" />
        Basculer A ↔ B (même position)
      </button>

      <div className="glass-panel p-4 rounded-2xl flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#95a7ba]">
          <span>{formatTime(activeSlot.currentTime)}</span>
          <span className="uppercase tracking-widest font-bold">
            {activeSide ? `Voix ${activeSide}` : 'Aucune lecture'}
          </span>
          <span>{formatTime(activeSlot.duration)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={activeSlot.duration || 100}
          step={0.1}
          value={activeSlot.currentTime}
          onChange={(e) => seekActive(parseFloat(e.target.value))}
          disabled={!activeSide}
          className="w-full h-1.5 bg-[#162538] rounded-lg appearance-none cursor-pointer disabled:opacity-40"
          style={{
            background: activeSide
              ? `linear-gradient(to right, ${activeSide === 'A' ? '#7990a1' : '#c9a06a'} 0%, ${activeSide === 'A' ? '#7990a1' : '#c9a06a'} ${progressPercent}%, #162538 ${progressPercent}%, #162538 100%)`
              : undefined,
          }}
        />
      </div>

      {hasError && (
        <div className="flex items-center gap-2 text-xs text-[#f2a3a3] bg-[#f08c8c]/10 border border-[#f08c8c]/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Impossible de charger un flux audio. Vérifiez la connexion ou changez de récitateur.
        </div>
      )}
    </div>
  );
};
