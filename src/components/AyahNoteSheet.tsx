import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from '../icons/motion';
import { NOTE_MAX_LENGTH, type AyahBookmark } from '../utils/libraryTypes';
import { SURAHS } from '../data/surahs';

type AyahNoteSheetProps = {
  open: boolean;
  bookmark: AyahBookmark | null;
  onClose: () => void;
  onSave: (note: string) => void;
  onDelete: () => void;
};

export const AyahNoteSheet: React.FC<AyahNoteSheetProps> = ({
  open,
  bookmark,
  onClose,
  onSave,
  onDelete,
}) => {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open && bookmark) setNote(bookmark.note);
  }, [open, bookmark]);

  if (!open || !bookmark) return null;

  const surah = SURAHS.find((s) => s.id === bookmark.surahId);

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal>
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-[#07111d]/78 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl brand-card shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
        <div className="px-5 pt-4 pb-5">
          <div className="mb-3 flex justify-center sm:hidden">
            <span className="h-1 w-10 rounded-full bg-[#46607b]" />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#bfa078]">Note personnelle</p>
              <h3 className="mt-1 text-base font-black text-[#f6f8fb]">
                {surah?.name ?? `Sourate ${bookmark.surahId}`} · v. {bookmark.ayah}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#30455c] text-[#aab7c5] tap-feedback"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {bookmark.snippetAr ? (
            <p className="quran-uthmani mt-3 line-clamp-2 text-right text-sm text-[#e6d5c2]" dir="rtl" lang="ar">
              {bookmark.snippetAr}
            </p>
          ) : null}

          <label className="mt-4 block">
            <span className="sr-only">Votre note</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
              rows={5}
              placeholder="Une intention, un rappel, un mot pour plus tard…"
              className="w-full resize-none rounded-2xl border border-[#30455c] bg-[#07111d]/70 px-3.5 py-3 text-sm text-[#e6edf5] placeholder:text-[#8295aa] focus:border-[#bfa078]/45 focus:outline-none"
            />
            <span className="mt-1 block text-right text-[10px] text-[#8899ad]">
              {note.length}/{NOTE_MAX_LENGTH}
            </span>
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onSave(note);
                onClose();
              }}
              className="brand-button-primary min-h-11 flex-1 rounded-full px-4 text-sm font-bold tap-feedback"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-[#f08c8c]/30 bg-[#f08c8c]/10 px-4 text-xs font-bold text-[#f2a3a3] tap-feedback"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Retirer
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
