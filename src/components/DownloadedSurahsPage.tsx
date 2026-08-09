import React, { useState } from 'react';
import { ChevronDown, CloudCheck, Download, Play, WifiOff } from '../icons/motion';
import { useAudio } from '../context/AudioContext';
import { ReciterPortrait } from './ReciterPortrait';
import { SURAHS } from '../data/surahs';
import type { Reciter } from '../types';

export type DownloadedSurahEntry = {
  key: string;
  reciterId: number;
  moshafId: number;
  reciterName: string;
  surahId: number;
  surahName: string;
};

interface DownloadedSurahsPageProps {
  entries: DownloadedSurahEntry[];
  offlineMode?: boolean;
  onOpenReciter?: (reciter: Reciter) => void;
}

export const DownloadedSurahsPage: React.FC<DownloadedSurahsPageProps> = ({
  entries,
  offlineMode = false,
}) => {
  const {
    reciters,
    playTrack,
    currentTrack,
    playbackStatus,
    togglePlay,
  } = useAudio();

  /** null = all collapsed (default) */
  const [openReciterId, setOpenReciterId] = useState<number | null>(null);

  const groups = React.useMemo(() => {
    const map = new Map<
      number,
      {
        reciter: Reciter | undefined;
        reciterName: string;
        items: DownloadedSurahEntry[];
      }
    >();

    for (const entry of entries) {
      const existing = map.get(entry.reciterId);
      if (existing) {
        existing.items.push(entry);
        continue;
      }
      map.set(entry.reciterId, {
        reciter: reciters.find((r) => r.id === entry.reciterId),
        reciterName: entry.reciterName,
        items: [entry],
      });
    }

    return Array.from(map.entries()).map(([reciterId, group]) => ({
      reciterId,
      ...group,
      items: [...group.items].sort((a, b) => a.surahId - b.surahId),
    }));
  }, [entries, reciters]);

  const handlePlay = (entry: DownloadedSurahEntry) => {
    const reciter = reciters.find((r) => r.id === entry.reciterId);
    const moshaf = reciter?.moshaf.find((m) => m.id === entry.moshafId);
    const surah = SURAHS.find((s) => s.id === entry.surahId);
    if (!reciter || !moshaf || !surah) return;

    const isCurrent =
      currentTrack?.surah.id === entry.surahId &&
      currentTrack?.reciter.id === entry.reciterId &&
      currentTrack?.moshaf.id === entry.moshafId;

    if (isCurrent) {
      togglePlay();
      return;
    }
    playTrack(reciter, moshaf, surah);
  };

  const toggleGroup = (reciterId: number) => {
    setOpenReciterId((prev) => (prev === reciterId ? null : reciterId));
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      <section className="overflow-hidden rounded-[1.5rem] border border-[#30455c]/55 bg-[linear-gradient(165deg,rgba(16,27,42,0.94),rgba(8,15,24,0.97))] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8ea1b3]">
              {offlineMode ? 'Mode hors-ligne' : 'Bibliothèque locale'}
            </p>
            <h2 className="mt-1 text-xl font-black text-[#f6f8fb]">Sourates téléchargées</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#95a7ba]">
              {offlineMode
                ? 'Sans connexion : seules les sourates déjà téléchargées sont disponibles.'
                : 'Fichiers stockés sur cet appareil. Disponibles sans réseau.'}
            </p>
          </div>
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              offlineMode
                ? 'bg-amber-400/12 text-amber-300'
                : 'bg-[#20334a] text-[#e4ccb4]'
            }`}
          >
            {offlineMode ? <WifiOff className="h-4.5 w-4.5" /> : <Download className="h-4.5 w-4.5" />}
          </span>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#c9a06a]/25 bg-[#e4ccb4]/10 px-3 py-1 text-[11px] font-bold text-[#e8d4bc]">
          <CloudCheck className="h-3.5 w-3.5" />
          {entries.length} sourate{entries.length !== 1 ? 's' : ''} hors-ligne
        </p>
      </section>

      {groups.length === 0 ? (
        <div className="rounded-3xl border border-[#30455c]/50 bg-[#111d2d]/65 px-5 py-10 text-center">
          <WifiOff className="mx-auto h-8 w-8 text-[#46607b]" />
          <p className="mt-3 text-sm font-semibold text-[#f6f8fb]">Aucune sourate téléchargée</p>
          <p className="mt-1 text-xs text-[#95a7ba]">
            {offlineMode
              ? 'Reconnectez-vous pour télécharger des sourates, puis revenez ici.'
              : 'Téléchargez des sourates depuis l’écoute pour les retrouver ici hors-ligne.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {groups.map((group) => {
            const isOpen = openReciterId === group.reciterId;
            const panelId = `downloaded-reciter-${group.reciterId}`;

            return (
              <section
                key={group.reciterId}
                className="overflow-hidden rounded-2xl border border-[#30455c]/50 bg-[#111d2d]/65"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.reciterId)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[#162538]/55 tap-feedback"
                >
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[#46607b]/50 bg-[#0c1522]">
                    {group.reciter ? (
                      <ReciterPortrait
                        reciter={group.reciter}
                        alt=""
                        width={44}
                        height={44}
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-[#f6f8fb]">
                      {group.reciterName}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[#95a7ba]">
                      {group.items.length} sourate{group.items.length > 1 ? 's' : ''} téléchargée
                      {group.items.length > 1 ? 's' : ''}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4.5 w-4.5 shrink-0 text-[#95a7ba] transition-transform duration-250 ${
                      isOpen ? 'rotate-180 text-[#e8d4bc]' : ''
                    }`}
                    aria-hidden
                  />
                </button>

                <div
                  id={panelId}
                  role="region"
                  hidden={!isOpen}
                  className={isOpen ? 'border-t border-[#30455c]/40' : undefined}
                >
                  {isOpen ? (
                    <ul className="divide-y divide-[#30455c]/35">
                      {group.items.map((entry) => {
                        const catalogSurah = SURAHS.find((s) => s.id === entry.surahId);
                        const isCurrent =
                          currentTrack?.surah.id === entry.surahId &&
                          currentTrack?.reciter.id === entry.reciterId &&
                          currentTrack?.moshaf.id === entry.moshafId;
                        const isPlaying = isCurrent && playbackStatus === 'playing';

                        return (
                          <li key={entry.key}>
                            <button
                              type="button"
                              onClick={() => handlePlay(entry)}
                              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors tap-feedback ${
                                isCurrent ? 'bg-[#e4ccb4]/08' : 'hover:bg-[#162538]/70'
                              }`}
                            >
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold tabular-nums ${
                                  isCurrent
                                    ? 'border-[#c9a06a]/45 bg-[#e4ccb4]/16 text-[#e8d4bc]'
                                    : 'border-[#46607b]/50 bg-[#0c1522] text-[#aab7c5]'
                                }`}
                              >
                                {isPlaying ? (
                                  <span className="flex h-3 items-end gap-0.5">
                                    <span className="w-0.5 h-full rounded-full bg-[#e4ccb4] animate-[shimmer_0.6s_infinite_alternate]" />
                                    <span className="w-0.5 h-2/3 rounded-full bg-white/80 animate-[shimmer_0.6s_infinite_alternate]" />
                                    <span className="w-0.5 h-full rounded-full bg-[#7990a1] animate-[shimmer_0.6s_infinite_alternate]" />
                                  </span>
                                ) : (
                                  entry.surahId
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-bold text-[#f6f8fb]">
                                  {entry.surahName}
                                </span>
                                {catalogSurah?.arabicName ? (
                                  <span className="mt-0.5 block truncate font-serif text-[12px] text-[#95a7ba] arabic-text">
                                    {catalogSurah.arabicName}
                                  </span>
                                ) : null}
                              </span>
                              <Play
                                className={`h-4 w-4 shrink-0 ${
                                  isCurrent ? 'text-[#e8d4bc]' : 'text-[#7f93a8]'
                                }`}
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
