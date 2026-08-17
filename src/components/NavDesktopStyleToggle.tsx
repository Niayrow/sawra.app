import React from 'react';
import type { NavDesktopStyle } from '../utils/navDesktopStyle';

interface NavDesktopStyleToggleProps {
  value: NavDesktopStyle;
  onChange: (style: NavDesktopStyle) => void;
}

/** Options page control — desktop chrome (navbar + player bar) together. */
export const NavDesktopStyleToggle: React.FC<NavDesktopStyleToggleProps> = ({
  value,
  onChange,
}) => {
  return (
    <div
      className="flex w-full items-center gap-1 rounded-full border border-[#bfa078]/30 bg-[#0c1522]/90 p-1"
      role="group"
      aria-label="Style navbar et barre de lecture desktop"
    >
      <button
        type="button"
        onClick={() => onChange('dock')}
        aria-pressed={value === 'dock'}
        className={`min-h-10 flex-1 rounded-full px-3 py-2 text-[12px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078] ${
          value === 'dock'
            ? 'bg-[#e2d0ba]/18 text-[#e6d5c2]'
            : 'text-[#95a7ba] hover:text-[#e6edf5]'
        }`}
      >
        Flottante
      </button>
      <button
        type="button"
        onClick={() => onChange('classic')}
        aria-pressed={value === 'classic'}
        className={`min-h-10 flex-1 rounded-full px-3 py-2 text-[12px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078] ${
          value === 'classic'
            ? 'bg-[#e2d0ba]/18 text-[#e6d5c2]'
            : 'text-[#95a7ba] hover:text-[#e6edf5]'
        }`}
      >
        Pleine
      </button>
    </div>
  );
};
