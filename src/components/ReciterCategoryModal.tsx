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

      <div className="grid grid-cols-2 gap-3">
        {RECITER_CATEGORIES.map((category) => {
          const count = counts[category.id] ?? 0;
          const isActive = activeCategoryId === category.id;

          return (
            <button
              key={category.id}
              type="button"
              disabled={count === 0}
              onClick={() => onOpenCategory(category.id)}
              className={`group relative aspect-square overflow-hidden rounded-2xl border bg-[#0c1522] text-left transition-all duration-300 tap-feedback disabled:opacity-40 disabled:pointer-events-none ${category.accent.border} ${
                isActive ? category.accent.glow : 'hover:brightness-110'
              }`}
            >
              <img
                src={category.image}
                alt=""
                aria-hidden="true"
                width="480"
                height="480"
                sizes="(max-width: 768px) 48vw, 280px"
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07111d]/92 via-[#07111d]/35 to-[#07111d]/10" />

              <div className="relative z-10 flex h-full items-end justify-between gap-2 p-3.5">
                <div className="min-w-0">
                  <p className="text-[15px] font-black text-white drop-shadow-md truncate">{category.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#d7e4ef]/80 truncate">{category.subtitle}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider backdrop-blur-md ${category.accent.badge}`}>
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
  const Icon = category.icon;

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
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reciter-category-title"
    >
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-[#07111d]/78 backdrop-blur-sm animate-page-enter"
        onClick={onClose}
      />

      <div
        className={`relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border ${category.accent.border} ${category.accent.bg} ${category.accent.glow} animate-page-enter`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#30455c]/80 px-5 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${category.accent.iconBg}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="reciter-category-title" className="text-lg font-black text-[#f6f8fb] truncate">
                  {category.title}
                </h2>
                <span className={`font-serif text-base opacity-70 ${category.accent.text}`}>
                  {category.arabicLabel}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#b4c0ce]">{category.subtitle}</p>
              <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${category.accent.badge}`}>
                {categoryReciters.length} récitateur{categoryReciters.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#46607b] bg-[#07111d]/70 text-[#d0d9e3] hover:text-white tap-feedback"
            aria-label="Fermer le modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 overscroll-contain">
          {categoryReciters.length === 0 ? (
            <div className="rounded-2xl border border-[#30455c] bg-[#07111d]/50 p-8 text-center text-sm text-[#b4c0ce]">
              Aucun récitateur disponible pour cette catégorie.
            </div>
          ) : (
            categoryReciters.map((reciter) => (
              <ReciterCard
                key={reciter.id}
                reciter={reciter}
                isSelected={activeReciterId === reciter.id}
                onSelect={() => onSelect(reciter)}
                isFavorite={favorites.includes(reciter.id)}
                onToggleFavorite={(e) => onToggleFavorite(reciter.id, e)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
