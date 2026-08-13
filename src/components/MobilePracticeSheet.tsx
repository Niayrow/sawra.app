import React, { useEffect, useId, useRef, useState } from 'react';
import { BookOpen, Sparkles } from '../icons/motion';

type MobilePracticeSheetProps = {
  open: boolean;
  onClose: () => void;
  onOpenQuiz: () => void;
  onOpenLearn: () => void;
};

const BUBBLE_MS = 300;

/** Compact chooser that sits just above the mobile bottom nav. */
export const MobilePracticeSheet: React.FC<MobilePracticeSheetProps> = ({
  open,
  onClose,
  onOpenQuiz,
  onOpenLearn,
}) => {
  const titleId = useId();
  const [shown, setShown] = useState(open);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      if (closeTimer.current != null) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      setClosing(false);
      setShown(true);
      return;
    }
    if (!shown) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setShown(false);
      setClosing(false);
      closeTimer.current = null;
    }, BUBBLE_MS);
  }, [open, shown]);

  useEffect(() => {
    return () => {
      if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!shown) return null;

  return (
    <div
      className={`nav-practice-sheet md:hidden ${closing ? 'is-closing' : ''}`}
      role="presentation"
    >
      <button
        type="button"
        className="nav-practice-sheet__backdrop"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div
        className={`nav-practice-sheet__panel ${closing ? 'is-closing' : 'is-open'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="nav-practice-sheet__handle" aria-hidden />
        <p id={titleId} className="nav-practice-sheet__title">
          Pratiquer
        </p>
        <div className="nav-practice-sheet__grid">
          <button
            type="button"
            className="nav-practice-sheet__card tap-feedback"
            onClick={() => {
              onClose();
              onOpenQuiz();
            }}
          >
            <span className="nav-practice-sheet__icon nav-practice-sheet__icon--quiz" aria-hidden>
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[13px] font-black text-[#f6f8fb]">Quiz Coran</span>
                <span className="nav-practice__badge">Nouveau</span>
              </span>
              <span className="mt-0.5 block text-[11px] font-semibold text-[#95a7ba]">
                Devinez la sourate
              </span>
            </span>
          </button>

          <button
            type="button"
            className="nav-practice-sheet__card tap-feedback"
            onClick={() => {
              onClose();
              onOpenLearn();
            }}
          >
            <span className="nav-practice-sheet__icon nav-practice-sheet__icon--learn" aria-hidden>
              <BookOpen className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[13px] font-black text-[#f6f8fb]">Apprendre</span>
              <span className="mt-0.5 block text-[11px] font-semibold text-[#95a7ba]">
                Flou, écoute, mémorisation
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
