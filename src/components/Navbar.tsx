import React, { useState } from 'react';
import { Headphones, Sparkles } from '../icons/motion';
import type { Reciter, Moshaf } from '../types';
import { useAuth } from '../context/AuthContext';
import { ReciterPortrait } from './ReciterPortrait';
import type { NavDesktopStyle } from '../utils/navDesktopStyle';
import { useNavMotionIcons, type NavTabIcon } from '../hooks/useNavMotionIcons';
import { NavbarDesktopClassic } from './NavbarDesktopClassic';
import { NavPracticeMenu } from './NavPracticeMenu';
import { MobileAppHeader } from './MobileAppHeader';
import { MobilePracticeSheet } from './MobilePracticeSheet';

type NavTabId = 'home' | 'listen' | 'moments' | 'favorites' | 'account' | 'more';

export interface ReciterNavFusionProps {
  progress: number;
  reciter: Reciter;
  activeMoshaf: Moshaf | null;
  onChangeReciter: () => void;
}

export interface ExploreNavFusionProps {
  progress: number;
  onExplore: () => void;
}

interface NavbarProps {
  activeTab: NavTabId;
  setActiveTab: (tab: NavTabId) => void;
  /** When true on mobile, navbar visually docks with the player bar */
  dockWithPlayer?: boolean;
  /** Desktop only: floating dock (V1) or full-width classic bar (V2) */
  desktopStyle?: NavDesktopStyle;
  /** Hide Moments (YouTube) when offline */
  showMoments?: boolean;
  reciterFusion?: ReciterNavFusionProps | null;
  exploreFusion?: ExploreNavFusionProps | null;
  onOpenQuiz?: () => void;
  onOpenLearn?: () => void;
}

const LOGO_SRC = '/icons/appicon.webp';

/** Compact account chip when signed in — replaces the Connexion tab. */
export const ConnectedBadge: React.FC<{
  active?: boolean;
  onClick: () => void;
  label?: string;
}> = ({ active = false, onClick, label = 'Connecté' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`nav-connected-badge inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 tap-feedback transition-colors ${
      active
        ? 'border-[#bfa078]/45 bg-[#bfa078]/18 text-[#e2d0ba]'
        : 'border-[#bfa078]/28 bg-[#bfa078]/10 text-[#e2d0ba] hover:border-[#bfa078]/45 hover:bg-[#bfa078]/16'
    }`}
    aria-label="Compte connecté"
    aria-current={active ? 'page' : undefined}
    title="Compte"
  >
    <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
      <span className="absolute inset-0 rounded-full bg-emerald-400/80 animate-pulse" />
      <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
    </span>
    <span className="text-[10px] font-bold uppercase tracking-[0.12em] leading-none">
      {label}
    </span>
  </button>
);

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  dockWithPlayer = false,
  desktopStyle = 'dock',
  showMoments = true,
  reciterFusion = null,
  exploreFusion = null,
  onOpenQuiz,
  onOpenLearn,
}) => {
  const useClassicDesktop = desktopStyle === 'classic';
  const { ready: motionReady, icons, MotionIconConfig } = useNavMotionIcons();
  const { user, profile } = useAuth();
  const isSignedIn = Boolean(user);
  const connectedLabel = profile?.display_name?.trim()
    ? profile.display_name.trim().slice(0, 12)
    : 'Connecté';
  const [practiceOpen, setPracticeOpen] = useState(false);

  const desktopTabs: Array<{ id: Exclude<NavTabId, 'more'>; label: string; icon: NavTabIcon }> = [
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

  /** Mobile: Accueil · Écouter · Favoris · Pratiquer (Options est dans le header) */
  const mobileTabs: Array<{
    id: Exclude<NavTabId, 'more' | 'moments' | 'account'>;
    label: string;
    icon: NavTabIcon;
  }> = [
    { id: 'home', label: 'Accueil', icon: icons.home },
    { id: 'listen', label: 'Écouter', icon: icons.listen },
    {
      id: 'favorites',
      label: activeTab === 'moments' && showMoments ? 'Moments' : 'Favoris',
      icon: activeTab === 'moments' && showMoments ? icons.moments : icons.favorites,
    },
  ];

  const renderTab = (
    id: NavTabId,
    label: string,
    Icon: NavTabIcon,
    options?: { alsoActive?: NavTabId[] },
  ) => {
    const isActive =
      activeTab === id || Boolean(options?.alsoActive?.includes(activeTab));

    return (
      <button
        key={id}
        type="button"
        onClick={() => {
          setPracticeOpen(false);
          if (activeTab === id) return;
          if (options?.alsoActive?.includes(activeTab)) return;
          setActiveTab(id);
        }}
        data-motion-icon-group={motionReady ? '' : undefined}
        className={`nav-tab group relative flex flex-1 flex-col items-center justify-center h-full px-1 py-1 transition-all duration-300 md:flex-none md:rounded-none md:px-3 md:py-1.5 ${
          isActive ? 'nav-tab--active' : 'nav-tab--idle'
        } ${motionReady ? 'nav-tab--draw-motion' : ''}`}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="nav-tab__indicator md:hidden" aria-hidden />
        <span className="nav-tab__inner relative z-10 flex flex-col items-center gap-0.5 transition-transform duration-100 ease-out group-active:scale-95 md:gap-1">
          <span
            className={`nav-tab__icon relative flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 md:h-auto md:w-auto md:rounded-none md:bg-transparent ${
              isActive ? 'bg-[#e2d0ba]/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:bg-transparent md:shadow-none' : ''
            }`}
          >
            <Icon
              size={18}
              strokeWidth={isActive ? 2.45 : 2}
              {...(motionReady
                ? { trigger: 'parent-hover' as const, mode: 'signature' as const, duration: 0.55 }
                : {})}
              className={`nav-tab__glyph transition-colors duration-300 md:h-[17px] md:w-[17px] ${
                isActive
                  ? 'text-[#e2d0ba] drop-shadow-[0_0_10px_rgba(241,232,220,0.35)] md:drop-shadow-none'
                  : 'text-[#7f93a8] group-hover:text-[#e8eef5] md:group-hover:text-[#e6d5c2]'
              }`}
            />
          </span>
          <span
            className={`nav-tab__label text-[10px] font-semibold tracking-wide transition-colors duration-300 md:text-[12px] md:leading-none ${
              isActive
                ? 'text-[#e6d5c2] md:font-bold'
                : 'text-[#7a8fa3] group-hover:text-[#e8eef5] md:font-medium md:text-[#9fb1c3]'
            }`}
          >
            {label}
          </span>
          <span className="nav-tab__aurora hidden md:block" aria-hidden />
        </span>
      </button>
    );
  };

  const fusionProgress = reciterFusion?.progress ?? exploreFusion?.progress ?? 0;
  const isFusing =
    (Boolean(reciterFusion) || Boolean(exploreFusion)) && fusionProgress > 0.01;
  const fusionStyle =
    reciterFusion || exploreFusion
      ? ({ ['--fusion-p' as string]: String(fusionProgress) } as React.CSSProperties)
      : undefined;

  const canPractice = Boolean(onOpenQuiz && onOpenLearn);

  const tabs = (
    <>
      <MobileAppHeader
        onHome={() => {
          setPracticeOpen(false);
          setActiveTab('home');
        }}
        onOptions={() => {
          setPracticeOpen(false);
          setActiveTab('more');
        }}
        optionsActive={activeTab === 'more'}
      />

      {canPractice && (
        <MobilePracticeSheet
          open={practiceOpen}
          onClose={() => setPracticeOpen(false)}
          onOpenQuiz={onOpenQuiz!}
          onOpenLearn={onOpenLearn!}
        />
      )}

      {useClassicDesktop && (
        <NavbarDesktopClassic
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showMoments={showMoments}
          reciterFusion={reciterFusion}
          exploreFusion={exploreFusion}
          icons={icons}
          motionReady={motionReady}
          isSignedIn={isSignedIn}
          connectedLabel={connectedLabel}
          onOpenQuiz={onOpenQuiz}
          onOpenLearn={onOpenLearn}
        />
      )}

      <nav
        style={useClassicDesktop ? undefined : fusionStyle}
        className={`fixed z-50 glass-panel-opaque backdrop-blur-2xl transition-[box-shadow] duration-300 ease-out overflow-visible md:overflow-visible nav-reciter-fusion-shell
          left-0 right-0 w-full max-w-none translate-x-0 bottom-0
          h-[calc(4.35rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)]
          rounded-none border-x-0 border-b-0
          ${dockWithPlayer ? 'border-t-0 max-md:!border-t-0 max-md:!shadow-none' : 'border-t'} mobile-dock-chrome mobile-bar-nav
          ${dockWithPlayer ? 'max-md:mobile-bar-nav-docked' : ''}
          ${
            useClassicDesktop
              ? 'md:hidden'
              : 'md:left-8 md:right-8 md:translate-x-0 md:w-auto md:max-w-6xl md:mx-auto md:bottom-auto md:top-6 md:h-auto md:pb-0 md:rounded-[1.35rem] md:border md:border-[#46607b]/40 md:px-4 md:pt-3 md:pb-3.5 md:shadow-2xl md:shadow-black/40'
          }
          ${!useClassicDesktop && isFusing ? 'is-fusing overflow-hidden' : 'max-md:overflow-hidden'}
        `}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-full items-stretch justify-between gap-0 md:hidden">
            {mobileTabs.map((tab) =>
              renderTab(
                tab.id,
                tab.label,
                tab.icon,
                tab.id === 'favorites'
                  ? { alsoActive: showMoments ? ['moments'] : [] }
                  : undefined,
              ),
            )}
            {canPractice ? (
              <button
                type="button"
                onClick={() => setPracticeOpen((value) => !value)}
                className={`nav-tab group relative flex flex-1 flex-col items-center justify-center h-full px-1 py-1 transition-all duration-300 ${
                  practiceOpen ? 'nav-tab--active' : 'nav-tab--idle'
                }`}
                aria-label="Pratiquer"
                aria-expanded={practiceOpen}
                aria-haspopup="dialog"
              >
                <span className="nav-tab__indicator" aria-hidden />
                <span className="nav-tab__inner relative z-10 flex flex-col items-center gap-0.5 transition-transform duration-100 ease-out group-active:scale-95">
                  <span
                    className={`nav-tab__icon relative flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 ${
                      practiceOpen
                        ? 'bg-[#e2d0ba]/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                        : ''
                    }`}
                  >
                    <Sparkles
                      className={`nav-tab__glyph h-[18px] w-[18px] transition-colors duration-300 ${
                        practiceOpen
                          ? 'text-[#e2d0ba] drop-shadow-[0_0_10px_rgba(241,232,220,0.35)]'
                          : 'text-[#7f93a8] group-hover:text-[#e8eef5]'
                      }`}
                    />
                    {!practiceOpen ? <span className="nav-practice-dot" aria-hidden /> : null}
                  </span>
                  <span
                    className={`nav-tab__label text-[10px] font-semibold tracking-wide transition-colors duration-300 ${
                      practiceOpen ? 'text-[#e6d5c2]' : 'text-[#7a8fa3] group-hover:text-[#e8eef5]'
                    }`}
                  >
                    Pratiquer
                  </span>
                </span>
              </button>
            ) : (
              renderTab('more', 'Options', icons.more)
            )}
          </div>

          {!useClassicDesktop && (
            <div className="relative hidden md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-3">
              <div className="flex items-center justify-start gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  aria-label="Sawra — Accueil"
                  className="group/nav-brand flex shrink-0 items-center gap-2 rounded-2xl px-2 py-1.5 transition-all duration-300 hover:bg-[#162538]/60 tap-feedback"
                >
                  <img
                    src={LOGO_SRC}
                    alt=""
                    width="44"
                    height="44"
                    decoding="async"
                    className="h-10 w-10 shrink-0 object-contain drop-shadow-[0_2px_16px_rgba(191,160,120,0.42)] transition-transform duration-300 group-hover/nav-brand:scale-105"
                    draggable={false}
                  />
                  <span className="flex flex-col items-start justify-center leading-none">
                    <span className="reciter-name-gradient is-selected text-[1.05rem] font-black tracking-[-0.03em]">
                      Sawra
                    </span>
                    <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-[#bfa078]/80">
                      Coran
                    </span>
                  </span>
                </button>
                <span className="h-7 w-px shrink-0 bg-[#46607b]/40" aria-hidden />
              </div>

              <div className="flex items-center justify-center gap-1">
                {desktopTabs.map((tab) => renderTab(tab.id, tab.label, tab.icon))}
              </div>

              <div className="flex items-center justify-end gap-2.5 min-w-0">
                {isSignedIn ? (
                  <ConnectedBadge
                    active={activeTab === 'account'}
                    onClick={() => setActiveTab('account')}
                    label={connectedLabel}
                  />
                ) : null}
                {canPractice ? (
                  <NavPracticeMenu onOpenQuiz={onOpenQuiz!} onOpenLearn={onOpenLearn!} />
                ) : null}
                <span className="h-7 w-px shrink-0 bg-[#46607b]/40" aria-hidden />
                {renderTab('more', 'Options', icons.more)}
              </div>
            </div>
          )}

          {!useClassicDesktop && reciterFusion && (
            <div
              className="nav-reciter-fusion-dock hidden md:flex items-center gap-3 px-3 pb-3 pt-0"
              aria-hidden={fusionProgress < 0.05}
              style={{ pointerEvents: fusionProgress >= 0.85 ? 'auto' : 'none' }}
            >
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
                <p className="text-sm font-semibold text-[#f6f8fb] truncate">{reciterFusion.reciter.name}</p>
                {reciterFusion.activeMoshaf && (
                  <p className="text-[11px] text-[#b4c0ce] truncate">{reciterFusion.activeMoshaf.name}</p>
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
          )}

          {!useClassicDesktop && exploreFusion && !reciterFusion && (
            <div
              className="nav-explore-fusion-dock nav-reciter-fusion-dock hidden md:flex items-center gap-3 px-3 pb-3 pt-0"
              aria-hidden={fusionProgress < 0.05}
              style={{ pointerEvents: fusionProgress >= 0.85 ? 'auto' : 'none' }}
            >
              <div className="nav-reciter-fusion-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#bfa078]/35 bg-[#e2d0ba]/12 text-[#e2d0ba]">
                <Headphones className="h-4 w-4" />
              </div>
              <div className="nav-reciter-fusion-meta min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#e2d0ba]/90">
                  Explorer
                </p>
                <p className="text-sm font-semibold text-[#f6f8fb] truncate">Les voix</p>
                <p className="text-[11px] text-[#b4c0ce] truncate">Récitateurs &amp; sourates</p>
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
          )}
        </div>
      </nav>
    </>
  );

  if (MotionIconConfig) {
    return (
      <MotionIconConfig trigger="hover" mode="signature" duration={0.5}>
        {tabs}
      </MotionIconConfig>
    );
  }

  return tabs;
};
