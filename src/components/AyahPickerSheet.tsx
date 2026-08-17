import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from '../icons/motion';
import { useAudio } from '../context/AudioContext';
import { useActiveAyahForSurah } from '../hooks/useActiveAyah';
import { useAyahTiming } from '../hooks/useAyahTiming';
import type { Moshaf, Reciter, Surah } from '../types';

type AyahPickerSheetProps = {
  open: boolean;
  onClose: () => void;
  surah: Surah;
  moshaf: Moshaf;
  reciter: Reciter;
};

export const AyahPickerSheet: React.FC<AyahPickerSheetProps> = ({
  open,
  onClose,
  surah,
  moshaf,
  reciter,
}) => {
  const { currentTrack, playFromAyah, seekToAyah } = useAudio();
  const [query, setQuery] = useState('');
  const [pendingAyah, setPendingAyah] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const { available, timings, loading } = useAyahTiming(moshaf, surah.id, open);
  const { activeAyah } = useActiveAyahForSurah(moshaf, surah, open);

  const ayahNumbers = useMemo(
    () => timings.map((t) => t.ayah),
    [timings],
  );

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return ayahNumbers;
    return ayahNumbers.filter((n) => String(n).includes(q));
  }, [ayahNumbers, query]);

  const isSameTrack =
    currentTrack?.surah.id === surah.id &&
    currentTrack?.reciter.id === reciter.id &&
    currentTrack?.moshaf.id === moshaf.id;

  useEffect(() => {
    if (!open) {
      setQuery('');
      setPendingAyah(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || activeAyah == null || query.trim()) return;
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [open, activeAyah, query]);

  const handleSelect = async (ayah: number) => {
    if (!available) return;
    setPendingAyah(ayah);
    try {
      if (isSameTrack) {
        await seekToAyah(ayah);
      } else {
        await playFromAyah(reciter, moshaf, surah, ayah);
      }
      onClose();
    } finally {
      setPendingAyah(null);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex flex-col justify-end md:items-center md:justify-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ayah-picker-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#020810]/75 backdrop-blur-[2px]"
        aria-label="Fermer"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[min(85vh,640px)] w-full flex-col overflow-hidden rounded-t-[1.35rem] border border-[#30455c]/80 bg-[#07111d] shadow-2xl md:max-w-md md:rounded-[1.35rem]">
        <div className="flex items-center gap-3 border-b border-[#111d2d] px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 id="ayah-picker-title" className="truncate text-sm font-black text-[#f6f8fb]">
              Aller au verset
            </h2>
            <p className="truncate text-[11px] text-[#7a8fa3]">
              {surah.name} · Sourate {surah.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#46607b]/45 text-[#aab7c5] hover:border-[#bfa078]/35 hover:text-[#f6f8fb]"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-[#111d2d] px-4 py-2.5">
          <label className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#6b8096]" />
            <input
              type="search"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Numéro de verset…"
              value={query}
              onChange={(e) => setQuery(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-xl border border-[#30455c] bg-[#0a1420]/90 py-2.5 pl-9 pr-3 text-sm text-[#f6f8fb] placeholder:text-[#5f7388] focus:border-[#bfa078]/45 focus:outline-none"
              autoFocus
            />
          </label>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {loading && (
            <p className="px-2 py-6 text-center text-sm text-[#95a7ba]">Chargement des versets…</p>
          )}
          {!loading && !available && (
            <p className="px-2 py-6 text-center text-sm text-[#95a7ba]">
              La synchronisation verset n&apos;est pas disponible pour cette récitation.
            </p>
          )}
          {!loading && available && filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-[#95a7ba]">Aucun verset trouvé.</p>
          )}
          {!loading && available && filtered.length > 0 && (
            <ul className="grid grid-cols-4 gap-1.5 pb-3 sm:grid-cols-5">
              {filtered.map((ayah) => {
                const isActive = activeAyah === ayah;
                const isPending = pendingAyah === ayah;
                return (
                  <li key={ayah}>
                    <button
                      ref={isActive ? activeRef : undefined}
                      type="button"
                      disabled={isPending}
                      onClick={() => void handleSelect(ayah)}
                      className={`flex h-11 w-full items-center justify-center rounded-xl border text-sm font-bold tabular-nums tap-feedback disabled:opacity-60 ${
                        isActive
                          ? 'border-[#bfa078]/55 bg-[#bfa078]/18 text-[#e2d0ba]'
                          : 'border-[#30455c] bg-[#0a1420]/55 text-[#c8d1db] hover:border-[#bfa078]/35 hover:text-[#f6f8fb]'
                      }`}
                      aria-current={isActive ? 'true' : undefined}
                      aria-label={`Verset ${ayah}${isActive ? ', en cours' : ''}`}
                    >
                      {isPending ? '…' : ayah}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {available && !loading && (
          <div className="border-t border-[#111d2d] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            <p className="text-center text-[10px] text-[#6b8096]">
              Touchez un verset pour {isSameTrack ? 'sauter' : 'commencer'} la lecture
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
