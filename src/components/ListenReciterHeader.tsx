import React, { useMemo } from 'react';
import { Disc, Heart, Play, RefreshCw } from '../icons/motion';
import type { Reciter, Moshaf } from '../types';
import { ReciterPortrait } from './ReciterPortrait';
import { useReciterNavFusion } from '../hooks/useReciterNavFusion';
import { RECITER_CATEGORIES } from '../data/reciterCategories';
import { useAudio } from '../context/AudioContext';
import { getAudioUrl } from '../utils/audioUrl';
import { SURAHS } from '../data/surahs';

interface ListenReciterHeaderProps {
  activeReciter: Reciter;
  activeMoshaf: Moshaf | null;
  fusionEnabled: boolean;
  isFavorite: boolean;
  onFusionProgressChange: (progress: number) => void;
  onFusionSpacerChange?: (spacerPx: number) => void;
  onChangeReciter: () => void;
  onSelectMoshaf: (moshaf: Moshaf) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onPlay: () => void;
  sectionRef?: React.RefObject<HTMLElement | null>;
}

function getReciterBadge(reciterId: number, moshafName?: string): string {
  const location = RECITER_CATEGORIES.find(
    (c) => c.id !== 'sawra' && c.reciterIds.includes(reciterId),
  );
  if (location) return location.title;
  const editorial = RECITER_CATEGORIES.find(
    (c) => c.id === 'sawra' && c.reciterIds.includes(reciterId),
  );
  if (editorial) return editorial.title;
  return moshafName || 'Récitation';
}

function getAvailableSurahCount(moshaf: Moshaf | null): number {
  if (!moshaf?.surah_list) return 0;
  return moshaf.surah_list
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean).length;
}

export const ListenReciterHeader: React.FC<ListenReciterHeaderProps> = ({
  activeReciter,
  activeMoshaf,
  fusionEnabled,
  isFavorite,
  onFusionProgressChange,
  onFusionSpacerChange,
  onChangeReciter,
  onSelectMoshaf,
  onToggleFavorite,
  onPlay,
  sectionRef,
}) => {
  const { cachedUrls } = useAudio();
  const fusionResetKey = `${activeReciter.id}:${activeMoshaf?.id ?? 0}`;
  const { progress, spacerPx, setHeaderRef, setSentinelRef } =
    useReciterNavFusion(fusionEnabled, fusionResetKey);

  React.useEffect(() => {
    onFusionProgressChange(progress);
  }, [progress, onFusionProgressChange]);

  React.useEffect(() => {
    onFusionSpacerChange?.(spacerPx);
  }, [spacerPx, onFusionSpacerChange]);

  React.useEffect(() => {
    if (!fusionEnabled) {
      onFusionProgressChange(0);
      onFusionSpacerChange?.(0);
    }
  }, [fusionEnabled, onFusionProgressChange, onFusionSpacerChange]);

  const badge = useMemo(
    () => getReciterBadge(activeReciter.id, activeMoshaf?.name),
    [activeReciter.id, activeMoshaf?.name],
  );
  const availableSurahCount = useMemo(
    () => getAvailableSurahCount(activeMoshaf),
    [activeMoshaf],
  );
  const offlineSurahCount = useMemo(() => {
    if (!activeMoshaf?.surah_list) return 0;
    const ids = new Set(
      activeMoshaf.surah_list
        .split(',')
        .map((value) => parseInt(value.trim(), 10))
        .filter((id) => !Number.isNaN(id)),
    );
    let count = 0;
    for (const surah of SURAHS) {
      if (!ids.has(surah.id)) continue;
      if (cachedUrls.has(getAudioUrl(activeMoshaf, surah))) count += 1;
    }
    return count;
  }, [activeMoshaf, cachedUrls]);

  const controlsDisabled = progress >= 0.92;

  return (
    <>
      <div ref={setSentinelRef} className="h-0 w-full overflow-hidden" aria-hidden />
      <section
        ref={(node) => {
          setHeaderRef(node);
          if (sectionRef && 'current' in sectionRef) {
            (sectionRef as React.MutableRefObject<HTMLElement | null>).current = node;
          }
        }}
        className={`listen-surah-header relative sticky top-0 z-30 md:top-24 md:scroll-mt-6 ${
          fusionEnabled && progress > 0.01 ? 'is-fusing' : ''
        }`}
      >
        <div
          className={`listen-surah-header-inner reciter-fusion-card brand-card backdrop-blur-md flex flex-col gap-3 px-4 py-3 rounded-none md:rounded-2xl md:shadow-lg md:shadow-black/20 md:gap-0 md:flex-row md:items-center md:justify-between md:p-5 max-[390px]:gap-2 max-[390px]:px-3 max-[390px]:py-2 ${
            controlsDisabled ? 'pointer-events-none' : ''
          }`}
        >
          <div className="flex items-center gap-3.5 pt-0 md:gap-5 md:min-w-0 md:flex-1 max-[390px]:gap-2">
            <div className="reciter-fusion-avatar relative h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-full border-2 border-[#bfa078]/40 bg-[#111d2d] shadow-[0_0_28px_rgba(191,160,120,0.18)] sm:h-24 sm:w-24 max-[390px]:h-14 max-[390px]:w-14 max-[390px]:border">
              <ReciterPortrait
                reciter={activeReciter}
                width={96}
                height={96}
                decoding="async"
                fetchPriority="high"
              />
            </div>

            <div className="min-w-0 flex-1">
              <span className="brand-chip reciter-fusion-step inline-flex max-w-full items-center truncate rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] max-[390px]:px-1.5 max-[390px]:py-0 max-[390px]:text-[8px] max-[390px]:tracking-[0.1em]">
                {badge}
              </span>
              <h2 className="reciter-fusion-name reciter-name-gradient mt-2 text-xl font-black leading-tight tracking-tight sm:text-2xl md:mt-2.5 max-[390px]:mt-0.5 max-[390px]:text-base">
                {activeReciter.name}
              </h2>
              {(availableSurahCount > 0 || (activeMoshaf && badge !== activeMoshaf.name)) && (
                <p className="mt-1 truncate text-xs font-medium text-[#b4c0ce] md:mt-1.5 md:text-sm max-[390px]:mt-0.5 max-[390px]:text-[10px]">
                  <span className="max-[390px]:hidden">
                    {activeMoshaf && badge !== activeMoshaf.name ? activeMoshaf.name : null}
                    {activeMoshaf && badge !== activeMoshaf.name && availableSurahCount > 0 ? (
                      <span className="px-1 text-[#5f7388]">·</span>
                    ) : null}
                  </span>
                  {availableSurahCount > 0 ? (
                    <span className="font-semibold text-[#95a7ba]">
                      <span className="max-[390px]:hidden">{availableSurahCount} sourates disponibles</span>
                      <span className="hidden max-[390px]:inline">{availableSurahCount} sourates</span>
                      {offlineSurahCount > 0 ? (
                        <span className="font-medium text-[#bfa078]">
                          <span className="px-1 text-[#5f7388]">·</span>
                          <span className="max-[390px]:hidden">dont {offlineSurahCount} hors ligne</span>
                          <span className="hidden max-[390px]:inline">{offlineSurahCount} hors ligne</span>
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 reciter-fusion-actions md:gap-3 md:shrink-0 md:pl-6 max-[390px]:gap-1.5">
            <button
              type="button"
              onClick={onPlay}
              className="brand-button-primary inline-flex flex-1 md:flex-none md:min-w-[10rem] items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold tap-feedback md:px-7 md:py-3 max-[390px]:gap-1 max-[390px]:px-3 max-[390px]:py-2 max-[390px]:text-xs"
              tabIndex={controlsDisabled ? -1 : 0}
            >
              <Play className="h-4 w-4 fill-current max-[390px]:h-3.5 max-[390px]:w-3.5" />
              Lire
            </button>
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              aria-pressed={isFavorite}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors tap-feedback md:h-11 md:w-11 max-[390px]:h-9 max-[390px]:w-9 ${
                isFavorite
                  ? 'border-[#bfa078]/45 bg-[#e2d0ba]/16 text-[#e2d0ba]'
                  : 'border-[#46607b] bg-[#162538]/70 text-[#aab7c5] hover:text-[#f6f8fb]'
              }`}
              tabIndex={controlsDisabled ? -1 : 0}
            >
              <Heart className={`h-4 w-4 max-[390px]:h-3.5 max-[390px]:w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onChangeReciter}
              aria-label="Changer de récitateur"
              title="Changer de récitateur"
              className="brand-button-secondary inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-3 text-[12px] font-bold leading-none transition-colors tap-feedback md:px-5 md:py-3 md:text-[13px] max-[390px]:h-9 max-[390px]:w-9 max-[390px]:gap-0 max-[390px]:px-0 max-[390px]:py-0"
              tabIndex={controlsDisabled ? -1 : 0}
            >
              <span className="max-[390px]:hidden">Changer</span>
              <span className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center" aria-hidden>
                <RefreshCw className="h-3.5 w-3.5" />
              </span>
            </button>
          </div>
        </div>

        {activeReciter.moshaf.length > 1 && (
          <div
            className={`reciter-fusion-riwaya mt-2.5 flex flex-col gap-1.5 rounded-none border border-[#30455c]/35 bg-[#111d2d]/55 px-3.5 py-3 md:rounded-2xl ${
              controlsDisabled ? 'pointer-events-none' : ''
            }`}
            aria-hidden={progress >= 0.08}
          >
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#95a7ba]">
              <Disc className="h-3 w-3 text-[#e2d0ba]" />
              Riwaya
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeReciter.moshaf.map((m) => {
                const isMoshafSelected = activeMoshaf?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectMoshaf(m)}
                    className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-all tap-feedback ${
                      isMoshafSelected
                        ? 'border-[#bfa078]/35 bg-[#e2d0ba]/12 text-[#e6d5c2]'
                        : 'border-[#30455c] bg-[#111d2d]/68 text-[#b4c0ce] hover:bg-[#162538] hover:text-[#e6edf5]'
                    }`}
                    tabIndex={progress >= 0.08 ? -1 : 0}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </>
  );
};
