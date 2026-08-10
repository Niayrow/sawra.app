import React from 'react';
import { Headphones } from '../icons/motion';
import { ConnectedBadge, type ExploreNavFusionProps, type ReciterNavFusionProps } from './Navbar';
import { ReciterPortrait } from './ReciterPortrait';
import type { NavTabIcon } from '../hooks/useNavMotionIcons';

type NavTabId = 'home' | 'listen' | 'moments' | 'favorites' | 'account' | 'more';

type NavIconMap = {
  home: NavTabIcon;
  listen: NavTabIcon;
  moments: NavTabIcon;
  favorites: NavTabIcon;
  account: NavTabIcon;
  more: NavTabIcon;
};

interface NavbarDesktopClassicProps {
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  showMoments?: boolean;
  reciterFusion?: ReciterNavFusionProps | null;
  exploreFusion?: ExploreNavFusionProps | null;
  icons: NavIconMap;
  motionReady?: boolean;
  isSignedIn?: boolean;
  connectedLabel?: string;
}

const LOGO_SRC = '/icons/appicon.webp';

export const NavbarDesktopClassic: React.FC<NavbarDesktopClassicProps> = ({
  activeTab,
  setActiveTab,
  showMoments = true,
  reciterFusion = null,
  exploreFusion = null,
  icons,
  motionReady = false,
  isSignedIn = false,
  connectedLabel = 'Connecté',
}) => {
  const fusionProgress = reciterFusion?.progress ?? exploreFusion?.progress ?? 0;
  const isFusing =
    (Boolean(reciterFusion) || Boolean(exploreFusion)) && fusionProgress > 0.01;
  const fusionStyle =
    reciterFusion || exploreFusion
      ? ({ ['--fusion-p' as string]: String(fusionProgress) } as React.CSSProperties)
      : undefined;

  const mainTabs: Array<{ id: Exclude<NavTabId, 'more'>; label: string; icon: NavTabIcon }> = [
    { id: 'home', label: 'Accueil', icon: icons.home },
    { id: 'listen', label: 'Écouter', icon: icons.listen },
    ...(showMoments
      ? [{ id: 'moments' as const, label: 'Moments', icon: icons.moments }]
      : []),
    { id: 'favorites', label: 'Favoris', icon: icons.favorites },
    ...(!isSignedIn
      ? [{ id: 'account' as const, label: 'Connexion', icon: icons.account }]
      : []),
  ];

  const renderTab = (id: NavTabId, label: string, Icon: NavTabIcon) => {
    const isActive = activeTab === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setActiveTab(id)}
        data-motion-icon-group={motionReady ? '' : undefined}
        className={`nav-tab nav-tab--desktop group relative inline-flex flex-col items-center px-3 py-1.5 transition-colors duration-300 ${
          isActive ? 'nav-tab--active' : 'nav-tab--idle'
        } ${motionReady ? 'nav-tab--draw-motion' : ''}`}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="relative inline-flex flex-col items-center gap-1">
          <Icon
            size={17}
            strokeWidth={isActive ? 2.35 : 1.9}
            {...(motionReady
              ? { trigger: 'parent-hover' as const, mode: 'signature' as const, duration: 0.55 }
              : {})}
            className={`nav-tab__glyph shrink-0 transition-colors duration-300 ${
              isActive
                ? 'text-[#e2d0ba]'
                : 'text-[#8fa3b0] group-hover:text-[#e6d5c2]'
            }`}
          />
          <span
            className={`text-[12px] leading-none tracking-wide transition-colors duration-300 ${
              isActive
                ? 'font-bold text-[#e6d5c2]'
                : 'font-medium text-[#9fb1c3] group-hover:text-[#e8eef5]'
            }`}
          >
            {label}
          </span>
          <span className="nav-tab__aurora" aria-hidden />
        </span>
      </button>
    );
  };

  return (
    <div
      className={`nav-desktop-classic-root fixed inset-x-0 top-0 z-50 hidden md:block ${
        isFusing ? 'is-fusing' : ''
      }`}
      style={fusionStyle}
    >
      <nav
        className="nav-desktop-classic glass-panel-opaque backdrop-blur-2xl border-b border-[#bfa078]/18"
        aria-label="Navigation principale"
      >
        <div className="nav-desktop-classic-inner mx-auto grid h-[4.15rem] max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-6 lg:px-8">
          <div className="flex min-w-0 items-center justify-start">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              aria-label="Sawra — Accueil"
              className="group/nav-brand flex shrink-0 items-center gap-2.5 rounded-2xl px-1.5 py-1 transition-all duration-300 hover:bg-[#162538]/55 tap-feedback"
            >
              <img
                src={LOGO_SRC}
                alt=""
                className="h-9 w-9 shrink-0 object-contain drop-shadow-[0_2px_16px_rgba(191,160,120,0.42)] transition-transform duration-300 group-hover/nav-brand:scale-105"
                draggable={false}
              />
              <span className="flex flex-col items-start justify-center leading-none">
                <span className="reciter-name-gradient is-selected text-[1.02rem] font-black tracking-[-0.03em]">
                  Sawra
                </span>
                <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-[#bfa078]/80">
                  Coran
                </span>
              </span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-1">
            {mainTabs.map((tab) => renderTab(tab.id, tab.label, tab.icon))}
          </div>

          <div className="flex items-center justify-end gap-2.5">
            {isSignedIn ? (
              <ConnectedBadge
                active={activeTab === 'account'}
                onClick={() => setActiveTab('account')}
                label={connectedLabel}
              />
            ) : null}
            {renderTab('more', 'Options', icons.more)}
          </div>
        </div>
      </nav>

      {reciterFusion && (
        <div
          className="nav-desktop-classic-fusion-dock nav-reciter-fusion-avatar-scope flex items-center gap-3 px-6 lg:px-8"
          aria-hidden={fusionProgress < 0.05}
          style={{ pointerEvents: fusionProgress >= 0.85 ? 'auto' : 'none' }}
        >
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
            <div className="nav-reciter-fusion-avatar w-9 h-9 rounded-lg overflow-hidden border border-[#46607b]/55 bg-[#111d2d] shrink-0">
              <ReciterPortrait
                reciter={reciterFusion.reciter}
                width={36}
                height={36}
              />
            </div>
            <div className="nav-reciter-fusion-meta min-w-0 flex-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#e2d0ba]/90">
                Récitateur
              </p>
              <p className="truncate text-sm font-semibold text-[#f6f8fb]">{reciterFusion.reciter.name}</p>
              {reciterFusion.activeMoshaf && (
                <p className="truncate text-[11px] text-[#b4c0ce]">{reciterFusion.activeMoshaf.name}</p>
              )}
            </div>
            <button
              type="button"
              onClick={reciterFusion.onChangeReciter}
              className="brand-button-secondary shrink-0 rounded-xl px-3 py-2 text-[11px] font-bold transition-colors tap-feedback"
              tabIndex={fusionProgress >= 0.85 ? 0 : -1}
            >
              Changer
            </button>
          </div>
        </div>
      )}

      {exploreFusion && !reciterFusion && (
        <div
          className="nav-desktop-classic-fusion-dock nav-explore-fusion-dock flex items-center gap-3 px-6 lg:px-8"
          aria-hidden={fusionProgress < 0.05}
          style={{ pointerEvents: fusionProgress >= 0.85 ? 'auto' : 'none' }}
        >
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
            <div className="nav-reciter-fusion-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#bfa078]/35 bg-[#e2d0ba]/12 text-[#e2d0ba]">
              <Headphones className="h-4 w-4" />
            </div>
            <div className="nav-reciter-fusion-meta min-w-0 flex-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#e2d0ba]/90">
                Explorer
              </p>
              <p className="truncate text-sm font-semibold text-[#f6f8fb]">Les voix</p>
              <p className="truncate text-[11px] text-[#b4c0ce]">Récitateurs &amp; sourates</p>
            </div>
            <button
              type="button"
              onClick={exploreFusion.onExplore}
              className="brand-button-primary shrink-0 rounded-xl px-3.5 py-2 text-[11px] font-bold transition-colors tap-feedback"
              tabIndex={fusionProgress >= 0.85 ? 0 : -1}
            >
              Ouvrir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
