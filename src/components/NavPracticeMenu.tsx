import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronDown, Sparkles } from '../icons/motion';

type PracticeTarget = 'quiz' | 'learn';

type NavPracticeMenuProps = {
  onOpenQuiz: () => void;
  onOpenLearn: () => void;
  /** Compact trigger for desktop chrome; default matches dock density */
  dense?: boolean;
};

const BUBBLE_MS = 300;

/**
 * Single navbar control that opens Quiz / Apprendre — avoids two extra tabs.
 * Menu is portaled to document.body so navbar overflow cannot clip it.
 */
export const NavPracticeMenu: React.FC<NavPracticeMenuProps> = ({
  onOpenQuiz,
  onOpenLearn,
  dense = false,
}) => {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [closing, setClosing] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const menuId = useId();

  const place = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  const closeMenu = () => {
    if (!shown || closing) return;
    setOpen(false);
    setClosing(true);
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setShown(false);
      setClosing(false);
      closeTimer.current = null;
    }, BUBBLE_MS);
  };

  const openMenu = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    place();
    setClosing(false);
    setShown(true);
    setOpen(true);
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      const menu = document.getElementById(menuId);
      if (menu?.contains(target)) return;
      closeMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    place();
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, menuId, shown, closing]);

  const go = (target: PracticeTarget) => {
    closeMenu();
    window.setTimeout(() => {
      if (target === 'quiz') onOpenQuiz();
      else onOpenLearn();
    }, 120);
  };

  const menu = shown && coords
    ? createPortal(
        <div
          id={menuId}
          role="menu"
          aria-label="Pratiquer"
          className={`nav-practice__menu ${closing ? 'is-closing' : 'is-open'}`}
          style={{ top: coords.top, right: coords.right }}
        >
          <button
            type="button"
            role="menuitem"
            className="nav-practice__item tap-feedback"
            onClick={() => go('quiz')}
          >
            <span className="nav-practice__icon nav-practice__icon--quiz" aria-hidden>
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[12px] font-bold text-[#f6f8fb]">Quiz Coran</span>
              <span className="mt-0.5 block text-[10px] font-semibold text-[#95a7ba]">
                Deviner la sourate
              </span>
            </span>
            <span className="nav-practice__badge">Nouveau</span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="nav-practice__item tap-feedback"
            onClick={() => go('learn')}
          >
            <span className="nav-practice__icon nav-practice__icon--learn" aria-hidden>
              <BookOpen className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[12px] font-bold text-[#f6f8fb]">Apprendre</span>
              <span className="mt-0.5 block text-[10px] font-semibold text-[#95a7ba]">
                Flou, écoute, mémorisation
              </span>
            </span>
          </button>
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className="nav-practice relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        className={`nav-practice__trigger tap-feedback ${dense ? 'is-dense' : ''} ${
          open ? 'is-open' : ''
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (open ? closeMenu() : openMenu())}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>Pratiquer</span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 opacity-80 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  );
};
