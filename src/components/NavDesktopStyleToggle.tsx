import React from 'react';
import type { NavDesktopStyle } from '../utils/navDesktopStyle';

interface NavDesktopStyleToggleProps {
  value: NavDesktopStyle;
  onChange: (style: NavDesktopStyle) => void;
}

/** Inline control in Options — desktop chrome (navbar + player bar) together. */
export const NavDesktopStyleToggle: React.FC<NavDesktopStyleToggleProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="mt-4 hidden md:flex flex-col gap-2 rounded-2xl border border-[#30455c]/55 bg-[#0f1928]/75 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-[#f6f8fb]">Navbar & barre de lecture</p>
        <p className="mt-0.5 text-[11px] leading-snug text-[#95a7ba]">
          Sur ordinateur, les deux barres suivent le même style : flottantes ensemble, ou pleine largeur ensemble.
        </p>
      </div>
      <div
        className="flex w-full max-w-md items-center gap-1 rounded-full border border-[#bfa078]/30 bg-[#0c1522]/90 p-1"
        role="group"
        aria-label="Style navbar et barre de lecture desktop"
      >
        <button
          type="button"
          onClick={() => onChange('dock')}
          aria-pressed={value === 'dock'}
          className={`min-h-9 flex-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078] ${
            value === 'dock'
              ? 'bg-[#e2d0ba]/18 text-[#e6d5c2]'
              : 'text-[#95a7ba] hover:text-[#e6edf5]'
          }`}
        >
          Les deux flottantes
        </button>
        <button
          type="button"
          onClick={() => onChange('classic')}
          aria-pressed={value === 'classic'}
          className={`min-h-9 flex-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078] ${
            value === 'classic'
              ? 'bg-[#e2d0ba]/18 text-[#e6d5c2]'
              : 'text-[#95a7ba] hover:text-[#e6edf5]'
          }`}
        >
          Les deux pleines
        </button>
      </div>
    </div>
  );
};
