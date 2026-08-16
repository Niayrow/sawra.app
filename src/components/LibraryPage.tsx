import React, { useEffect, useMemo, useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { ReciterCard } from './ReciterCard';
import { AyahNoteSheet } from './AyahNoteSheet';
import {
  Bookmark,
  BookOpen,
  ChevronDown,
  Clock,
  Heart,
  History,
  Play,
} from '../icons/motion';
import { SURAHS } from '../data/surahs';
import { requestAuthPrompt, requestOpenReader } from '../utils/appEvents';
import { BOOKMARK_PAGE_SIZE, type AyahBookmark } from '../utils/libraryTypes';
import { formatListenDuration, relativeTimeLabel } from '../utils/listenStats';
import type { Reciter } from '../types';

type LibrarySub = 'bookmarks' | 'history' | 'voices';

type LibraryPageProps = {
  favoritedReciters: Reciter[];
  activeReciterId?: number;
  onSelectReciter: (reciter: Reciter) => void;
  onToggleFavorite: (id: number, e: React.MouseEvent) => void;
  onExplore: () => void;
  onResume: () => void;
};

export const LibraryPage: React.FC<LibraryPageProps> = ({
  favoritedReciters,
  activeReciterId,
  onSelectReciter,
  onToggleFavorite,
  onExplore,
  onResume,
}) => {
  const { reciters, currentTrack, playFromAyah, playTrack } = useAudio();
  const { user, sessionReady } = useAuth();
  const {
    bookmarks,
    bookmarkTotal,
    showMoreBookmarks,
    progress,
    streak,
    secondsToday,
    secondsWeek,
    secondsTotal,
    weekDays,
    libraryReady,
    saveBookmarkNote,
    removeBookmark,
    resetBookmarkPage,
  } = useLibrary();

  const [sub, setSub] = useState<LibrarySub>('bookmarks');
  const [howOpen, setHowOpen] = useState(false);
  const [noteTarget, setNoteTarget] = useState<AyahBookmark | null>(null);

  useEffect(() => () => resetBookmarkPage(), [resetBookmarkPage]);

  const recentProgress = useMemo(
    () => [...progress].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 8),
    [progress],
  );

  const playBookmark = async (row: AyahBookmark) => {
    const reciter =
      (row.reciterId != null ? reciters.find((r) => r.id === row.reciterId) : null)
      ?? reciters.find((r) => r.moshaf.some((m) => m.id === row.moshafId))
      ?? reciters[0];
    if (!reciter) return;
    const moshaf =
      (row.moshafId != null ? reciter.moshaf.find((m) => m.id === row.moshafId) : null)
      ?? reciter.moshaf[0];
    const surah = SURAHS.find((s) => s.id === row.surahId);
    if (!moshaf || !surah) return;
    try {
      await playFromAyah(reciter, moshaf, surah, row.ayah);
    } catch {
      playTrack(reciter, moshaf, surah);
    }
  };

  const openReaderOrListen = () => {
    if (currentTrack) requestOpenReader();
    else onExplore();
  };

  return (
    <div className="flex flex-col gap-5 pb-16 sm:pb-20 max-md:pt-2 md:pt-3">
      <header className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8ea1b3]">Bibliothèque</p>
          <h2 className="mt-1 text-lg font-black text-[#f6f8fb]">Vos versets, votre écoute</h2>
        </div>
        {user && streak > 0 ? (
          <span className="brand-chip inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest">
            {streak} {streak > 1 ? 'jours' : 'jour'}
          </span>
        ) : null}
      </header>

      <div
        className="flex gap-1 rounded-2xl border border-[#30455c]/50 bg-[#0f1928]/80 p-1"
        role="tablist"
        aria-label="Bibliothèque"
      >
        {([
          { id: 'bookmarks' as const, label: 'Signets', icon: Bookmark },
          { id: 'history' as const, label: 'Historique', icon: History },
          { id: 'voices' as const, label: 'Voix', icon: Heart },
        ]).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={sub === item.id}
            onClick={() => setSub(item.id)}
            className={`min-h-10 flex-1 rounded-xl px-2 py-2 text-[11px] font-bold transition-all tap-feedback ${
              sub === item.id
                ? 'bg-[#e2d0ba]/14 text-[#e6d5c2]'
                : 'text-[#95a7ba] hover:text-[#e6edf5]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {sub === 'bookmarks' && (
        bookmarkTotal === 0 ? (
          <section className="relative overflow-hidden rounded-[1.7rem] border border-[#30455c]/55 bg-[linear-gradient(165deg,rgba(17,29,45,0.94),rgba(8,15,24,0.98))] p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(241,232,220,0.18),transparent_68%)]" />
            <span className="brand-chip inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              Bibliothèque
            </span>
            <h3 className="mt-3 text-xl font-black text-[#f6f8fb]">Aucun verset encore</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#b4c0ce]">
              Dans le lecteur, touchez le signet à côté du numéro.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={openReaderOrListen}
                className="brand-button-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold tap-feedback"
              >
                <BookOpen className="h-4 w-4" />
                Ouvrir le lecteur
              </button>
              <button
                type="button"
                onClick={() => setHowOpen((v) => !v)}
                className="inline-flex min-h-10 items-center justify-center gap-1 text-[12px] font-semibold text-[#d0d9e3] hover:text-[#e6d5c2]"
              >
                Comment ça marche
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${howOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {howOpen && (
              <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-[#aab7c5]">
                <li>1. Ouvrez le texte dans le lecteur (icône livre).</li>
                <li>2. Touchez le signet à côté du numéro du verset.</li>
                <li>3. Ajoutez une note, puis reprenez exactement ce verset.</li>
              </ul>
            )}
          </section>
        ) : (
          <div className="flex flex-col gap-3">
            {bookmarks.map((row) => {
              const surah = SURAHS.find((s) => s.id === row.surahId);
              return (
                <article
                  key={row.id}
                  className="rounded-[1.35rem] border border-[#30455c]/50 bg-[#111d2d]/78 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8ea1b3]">
                        {surah?.name ?? `Sourate ${row.surahId}`} · v. {row.ayah}
                      </p>
                      {row.snippetAr ? (
                        <p className="quran-uthmani mt-2 line-clamp-2 text-right text-sm text-[#e6d5c2]" dir="rtl" lang="ar">
                          {row.snippetAr}
                        </p>
                      ) : null}
                      {row.snippetFr ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#b4c0ce]">{row.snippetFr}</p>
                      ) : null}
                      {row.note ? (
                        <p className="mt-2 line-clamp-1 text-[11px] text-[#e2d0ba]">{row.note}</p>
                      ) : (
                        <p className="mt-2 text-[11px] text-[#8899ad]">Aucune note</p>
                      )}
                    </div>
                    <Bookmark className="h-4 w-4 shrink-0 fill-current text-[#e2d0ba]" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void playBookmark(row)}
                      className="brand-button-primary inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold tap-feedback"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Écouter ce verset
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteTarget(row)}
                      className="brand-button-secondary inline-flex min-h-9 items-center rounded-full px-3.5 text-[12px] font-bold tap-feedback"
                    >
                      Note
                    </button>
                  </div>
                </article>
              );
            })}
            {bookmarkTotal > bookmarks.length && (
              <button
                type="button"
                onClick={showMoreBookmarks}
                className="min-h-11 rounded-2xl border border-[#30455c] bg-[#111d2d]/72 text-xs font-bold text-[#d0d9e3] tap-feedback"
              >
                Voir plus ({Math.min(BOOKMARK_PAGE_SIZE, bookmarkTotal - bookmarks.length)})
              </button>
            )}
          </div>
        )
      )}

      {sub === 'history' && (
        !sessionReady || (user && !libraryReady) ? (
          <div className="shimmer-loader h-48 rounded-3xl border border-slate-900" />
        ) : !user ? (
          <section className="relative overflow-hidden rounded-[1.7rem] border border-[#30455c]/55 bg-[linear-gradient(165deg,rgba(17,29,45,0.94),rgba(8,15,24,0.98))] p-5 sm:p-6">
            <div className="pointer-events-none absolute -left-8 top-0 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(121,144,161,0.16),transparent_70%)]" />
            <span className="inline-flex items-center rounded-full border border-[#bfa078]/25 bg-[#bfa078]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#e2d0ba]">
              Compte
            </span>
            <h3 className="mt-3 text-xl font-black text-[#f6f8fb]">L’historique suit votre compte</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#b4c0ce]">
              Temps total, calendrier 7 jours et streak sont enregistrés en direct dans le cloud, uniquement une fois connecté.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => requestAuthPrompt()}
                className="brand-button-primary inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold tap-feedback"
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={onExplore}
                className="brand-button-secondary inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-sm font-bold tap-feedback"
              >
                Continuer sans compte
              </button>
            </div>
          </section>
        ) : secondsTotal < 1 && recentProgress.length === 0 ? (
          <section className="relative overflow-hidden rounded-[1.7rem] border border-[#30455c]/55 bg-[linear-gradient(165deg,rgba(17,29,45,0.94),rgba(8,15,24,0.98))] p-5 sm:p-6">
            <div className="pointer-events-none absolute -left-8 top-0 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(121,144,161,0.16),transparent_70%)]" />
            <span className="inline-flex items-center rounded-full border border-[#bfa078]/25 bg-[#bfa078]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#e2d0ba]">
              0 jour
            </span>
            <h3 className="mt-3 text-xl font-black text-[#f6f8fb]">Votre écoute commencera ici</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#b4c0ce]">
              Une minute d’écoute suffit pour le premier jour.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onResume}
                className="brand-button-primary inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold tap-feedback"
              >
                Continuer la lecture
              </button>
              <button
                type="button"
                onClick={onExplore}
                className="brand-button-secondary inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-sm font-bold tap-feedback"
              >
                Explorer les voix
              </button>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-[#8899ad]">
              Les jours suivent le fuseau de l’appareil au moment de l’écoute.
            </p>
          </section>
        ) : (
          <div className="flex flex-col gap-4">
            <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Streak', value: `${streak} j` },
                { label: 'Aujourd’hui', value: formatListenDuration(secondsToday) },
                { label: '7 jours', value: formatListenDuration(secondsWeek) },
                { label: 'Total', value: formatListenDuration(secondsTotal) },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-[#30455c]/45 bg-[#101b2a]/78 px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8ea1b3]">{item.label}</p>
                  <p className="mt-1 text-sm font-black text-[#f6f8fb]">{item.value}</p>
                </div>
              ))}
            </section>

            <div className="flex gap-1.5">
              {weekDays.map((d) => (
                <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span
                    className={`h-8 w-full rounded-lg ${
                      d.qualified ? 'bg-[#e2d0ba]/35' : d.seconds > 0 ? 'bg-[#46607b]/45' : 'bg-[#162538]'
                    }`}
                    title={`${d.day} · ${formatListenDuration(d.seconds)}`}
                  />
                  <span className="text-[9px] font-bold uppercase text-[#8899ad]">
                    {d.day.slice(8)}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[11px] leading-relaxed text-[#8899ad]">
              Les jours suivent le fuseau de l’appareil au moment de l’écoute.{' '}
              <a href="/privacy" className="font-semibold text-[#e2d0ba] underline-offset-2 hover:underline">
                En savoir plus
              </a>
            </p>

            {recentProgress.length > 0 && (
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-black text-[#f6f8fb]">Dernières écoutes</h3>
                {recentProgress.map((row) => {
                  const surah = SURAHS.find((s) => s.id === row.surahId);
                  const reciter = reciters.find((r) => r.id === row.reciterId);
                  return (
                    <button
                      key={`${row.reciterId}-${row.moshafId}-${row.surahId}`}
                      type="button"
                      onClick={() => {
                        if (!reciter) return;
                        const moshaf = reciter.moshaf.find((m) => m.id === row.moshafId) ?? reciter.moshaf[0];
                        const s = SURAHS.find((item) => item.id === row.surahId);
                        if (!moshaf || !s) return;
                        playTrack(reciter, moshaf, s, row.positionSeconds);
                      }}
                      className="flex items-center gap-3 rounded-2xl border border-[#30455c]/45 bg-[#111d2d]/70 px-3.5 py-3 text-left tap-feedback"
                    >
                      <Clock className="h-4 w-4 shrink-0 text-[#e2d0ba]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-[#f6f8fb]">
                          {surah?.name ?? `Sourate ${row.surahId}`}
                          {row.ayah != null ? ` · v. ${row.ayah}` : ''}
                        </span>
                        <span className="block truncate text-[11px] text-[#95a7ba]">
                          {reciter?.name ?? 'Récitateur'} · {relativeTimeLabel(row.updatedAt)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </section>
            )}
          </div>
        )
      )}

      {sub === 'voices' && (
        <div className="flex flex-col gap-5">
          <h3 className="text-lg font-bold text-[#f6f8fb] flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-current" />
            Vos récitateurs favoris
          </h3>
          {favoritedReciters.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center glass-panel rounded-3xl gap-4">
              <Heart className="w-12 h-12 text-[#46607b]" />
              <div>
                <h3 className="font-semibold text-[#e6edf5]">Aucune voix encore</h3>
                <p className="text-xs text-[#b4c0ce] max-w-xs mt-1">
                  Appuyez sur l’icône de cœur sur la carte d’un récitateur dans l’espace Écouter pour l’ajouter ici.
                </p>
              </div>
              <button
                type="button"
                onClick={onExplore}
                className="brand-button-primary px-5 py-2.5 rounded-xl font-semibold text-xs tap-feedback"
              >
                Aller vers Écouter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {favoritedReciters.map((reciter) => (
                <ReciterCard
                  key={reciter.id}
                  reciter={reciter}
                  isSelected={activeReciterId === reciter.id}
                  onSelect={() => onSelectReciter(reciter)}
                  isFavorite
                  onToggleFavorite={(e) => onToggleFavorite(reciter.id, e)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <AyahNoteSheet
        open={Boolean(noteTarget)}
        bookmark={noteTarget}
        onClose={() => setNoteTarget(null)}
        onSave={(note) => {
          if (!noteTarget) return;
          saveBookmarkNote(noteTarget.surahId, noteTarget.ayah, note);
        }}
        onDelete={() => {
          if (!noteTarget) return;
          removeBookmark(noteTarget.surahId, noteTarget.ayah);
        }}
      />
    </div>
  );
};
