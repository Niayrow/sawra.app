import React, { useEffect, useMemo } from 'react';
import { X } from '../icons/motion';
import type { Reciter } from '../types';
import { RECITER_CATEGORIES, type ReciterCategory, type ReciterCategoryId } from '../data/reciterCategories';
import { ReciterCard } from './ReciterCard';

interface ReciterCategoryGridProps {
  reciters: Reciter[];
  activeCategoryId: ReciterCategoryId | null;
  onOpenCategory: (id: ReciterCategoryId) => void;
}

export const ReciterCategoryGrid: React.FC<ReciterCategoryGridProps> = ({
  reciters,
  activeCategoryId,
  onOpenCategory,
}) => {
  const counts = useMemo(() => {
    const byId = new Map(reciters.map((r) => [r.id, r]));
    return Object.fromEntries(
      RECITER_CATEGORIES.map((category) => [
        category.id,
        category.reciterIds.filter((id) => byId.has(id)).length,
      ])
    ) as Record<ReciterCategoryId, number>;
  }, [reciters]);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-bold text-[#d7e4ef]">Parcourir par lieu</h3>
        <p className="mt-0.5 text-[11px] text-[#95a7ba]">
          Ouvre une sélection courte d&apos;imams et de voix.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
        {RECITER_CATEGORIES.map((category) => {
          const count = counts[category.id] ?? 0;
          const isActive = activeCategoryId === category.id;

          return (
            <button
              key={category.id}
              type="button"
              disabled={count === 0}
              onClick={() => onOpenCategory(category.id)}
              className={`group relative h-[4.75rem] overflow-hidden rounded-xl border bg-[#0c1522] text-left transition-all duration-300 tap-feedback disabled:opacity-40 disabled:pointer-events-none sm:h-[5.25rem] ${category.accent.border} ${
                isActive ? category.accent.glow : 'hover:brightness-110'
              }`}
            >
              <img
                src={category.image}
                alt=""
                aria-hidden="true"
                width="400"
                height="400"
                sizes="(max-width: 640px) 45vw, 160px"
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07111d]/92 via-[#07111d]/40 to-[#07111d]/12" />

              <div className="relative z-10 flex h-full items-end justify-between gap-1.5 p-2 sm:p-2.5">
                <div className="min-w-0">
                  <p className="text-[12px] font-black text-white drop-shadow-md truncate sm:text-[13px]">
                    {category.title}
                  </p>
                  <p className="mt-0.5 text-[9px] text-[#d7e4ef]/80 truncate sm:text-[10px]">
                    {category.subtitle}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider backdrop-blur-md sm:text-[9px] ${category.accent.badge}`}>
                  {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

interface ReciterCategoryModalProps {
  category: ReciterCategory;
  reciters: Reciter[];
  activeReciterId?: number | null;
  favorites: number[];
  onClose: () => void;
  onSelect: (reciter: Reciter) => void;
  onToggleFavorite: (id: number, e: React.MouseEvent) => void;
}

export const ReciterCategoryModal: React.FC<ReciterCategoryModalProps> = ({
  category,
  reciters,
  activeReciterId,
  favorites,
  onClose,
  onSelect,
  onToggleFavorite,
}) => {
  const categoryReciters = useMemo(() => {
    const byId = new Map(reciters.map((r) => [r.id, r]));
    return category.reciterIds
      .map((id) => byId.get(id))
      .filter((r): r is Reciter => !!r);
  }, [category, reciters]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reciter-category-title"
    >
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-[#040a12]/72 backdrop-blur-[6px] animate-page-enter"
        onClick={onClose}
      />

      <div
        className={`relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.75rem] border border-[#30455c]/70 bg-[#0b1522] shadow-[0_-24px_80px_rgba(0,0,0,0.55)] sm:max-h-[min(860px,90dvh)] sm:rounded-[1.75rem] ${category.accent.glow} animate-page-enter`}
        style={{ maxHeight: 'min(920px, 94dvh)' }}
      >
        {/* Mobile drag affordance */}
        <div className="flex justify-center pt-3 sm:hidden" aria-hidden>
          <span className="h-1.5 w-11 rounded-full bg-[#46607b]/70" />
        </div>

        {/* Hero */}
        <header className="relative shrink-0 overflow-hidden">
          <div className="relative h-[9.5rem] sm:h-[11.5rem]">
            <img
              src={category.image}
              alt=""
              aria-hidden
              width="960"
              height="480"
              className="absolute inset-0 h-full w-full object-cover object-center"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1522] via-[#0b1522]/55 to-[#0b1522]/15" />
            <div className={`absolute inset-0 opacity-35 mix-blend-soft-light ${category.accent.bg}`} />

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#07111d]/55 text-[#f6f8fb] shadow-lg backdrop-blur-md transition hover:bg-[#07111d]/8 tap-feedback sm:top-4"
              aria-label="Fermer le modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative -mt-10 px-5 pb-4 sm:px-7 sm:pb-5">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className={`mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] ${category.accent.text}`}>
                  {category.arabicLabel}
                </p>
                <h2
                  id="reciter-category-title"
                  className="text-[1.65rem] font-black tracking-tight text-[#f6f8fb] sm:text-[1.85rem]"
                >
                  {category.title}
                </h2>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[#b4c0ce]">
                  {category.subtitle} · choisissez une voix pour ouvrir les sourates.
                </p>
              </div>
              <span
                className={`mb-1 shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wider backdrop-blur-md ${category.accent.badge}`}
              >
                {categoryReciters.length} voix
              </span>
            </div>
          </div>
        </header>

        {/* List */}
        <div className="flex min-h-0 flex-1 flex-col border-t border-[#30455c]/45">
          <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8899ad]">
              Récitateurs
            </p>
            <p className="text-[11px] text-[#95a7ba]">Touchez une carte pour écouter</p>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            {categoryReciters.length === 0 ? (
              <div className="rounded-2xl border border-[#30455c] bg-[#07111d]/50 px-6 py-12 text-center text-sm text-[#b4c0ce]">
                Aucun récitateur disponible pour cette catégorie.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {categoryReciters.map((reciter) => (
                  <ReciterCard
                    key={reciter.id}
                    reciter={reciter}
                    isSelected={activeReciterId === reciter.id}
                    onSelect={() => onSelect(reciter)}
                    isFavorite={favorites.includes(reciter.id)}
                    onToggleFavorite={(e) => onToggleFavorite(reciter.id, e)}
                    layout="stacked"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[#30455c]/45 bg-[#08111c]/90 px-5 py-3.5 pb-[max(0.9rem,env(safe-area-inset-bottom))] sm:px-7">
            <button
              type="button"
              onClick={onClose}
              className="brand-button-secondary w-full rounded-2xl px-4 py-3.5 text-sm font-bold tap-feedback"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
