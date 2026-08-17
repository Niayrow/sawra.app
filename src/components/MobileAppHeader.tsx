import React from 'react';
import { Settings } from '../icons/motion';

const LOGO_SRC = '/icons/sansfond.webp';

type MobileAppHeaderProps = {
  onHome: () => void;
  onOptions: () => void;
  optionsActive?: boolean;
};

/** Permanent mobile top chrome — logo + Options (Options leaves the bottom nav). */
export const MobileAppHeader: React.FC<MobileAppHeaderProps> = ({
  onHome,
  onOptions,
  optionsActive = false,
}) => (
  <header className="mobile-app-header md:hidden" role="banner">
    <div className="mobile-app-header__inner">
      <button
        type="button"
        onClick={onHome}
        className="mobile-app-header__brand tap-feedback"
        aria-label="Sawra — Accueil"
      >
        <img
          src={LOGO_SRC}
          alt=""
          width="36"
          height="36"
          decoding="async"
          className="mobile-app-header__logo"
          draggable={false}
        />
        <span className="mobile-app-header__titles">
          <span className="reciter-name-gradient is-selected mobile-app-header__name">Sawra</span>
          <span className="mobile-app-header__tag">Coran</span>
        </span>
      </button>

      <button
        type="button"
        onClick={onOptions}
        className={`mobile-app-header__options tap-feedback ${
          optionsActive ? 'is-active' : ''
        }`}
        aria-label="Options"
        aria-current={optionsActive ? 'page' : undefined}
      >
        <Settings className="h-4 w-4" aria-hidden />
        <span>Options</span>
      </button>
    </div>
  </header>
);
