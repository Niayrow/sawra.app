import React, { useEffect, useRef, useState } from 'react';
import type { Reciter } from '../types';
import { useAudio } from '../context/AudioContext';
import { Play, Volume2, Heart } from '../icons/motion';
import { ReciterPortrait } from './ReciterPortrait';
import { AyahSyncBadge } from './AyahSyncBadge';

interface ReciterCardProps {
  reciter: Reciter;
  isSelected: boolean;
  onSelect: () => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  searchQuery?: string;
  /** Avatar + actions on top, full name on its own single line below */
  layout?: 'row' | 'stacked';
}

/** Scrolls the name only when it overflows its container. */
const ReciterNameMarquee: React.FC<{
  name: string;
  trackClassName?: string;
  children: React.ReactNode;
}> = ({ name, trackClassName = '', children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLHeadingElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const measure = () => {
      const distance = Math.max(0, track.scrollWidth - container.clientWidth);
      container.style.setProperty('--reciter-name-marquee', `${distance}px`);
      setOverflowing(distance > 2);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [name]);

  return (
    <div ref={containerRef} className="reciter-name-marquee min-w-0 flex-1 overflow-hidden">
      <h3
        ref={trackRef}
        title={name}
        className={`reciter-name-marquee__track text-[13px] font-bold leading-none tracking-tight sm:text-[15px] ${trackClassName} ${
          overflowing ? 'is-overflowing' : ''
        }`}
      >
        {children}
      </h3>
    </div>
  );
};

export const ReciterCard: React.FC<ReciterCardProps> = ({
  reciter,
  isSelected,
  onSelect,
  isFavorite,
  onToggleFavorite,
  searchQuery,
  layout = 'row',
}) => {
  const { currentTrack, playbackStatus } = useAudio();

  const highlightMatch = (text: string, query: string) => {
    if (!query || !query.trim()) return <span>{text}</span>;

    const normQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const tokens = normQuery.split(' ').filter(t => t.length > 0);
    if (tokens.length === 0) return <span>{text}</span>;

    const normText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    let matchedToken = '';
    let index = -1;
    for (const token of tokens) {
      index = normText.indexOf(token);
      if (index !== -1) {
        matchedToken = token;
        break;
      }
    }

    if (index === -1) return <span>{text}</span>;

    const before = text.substring(0, index);
    const match = text.substring(index, index + matchedToken.length);
    const after = text.substring(index + matchedToken.length);

    return (
      <span>
        {before}
        <span className="text-[#e6d5c2] font-extrabold bg-[#e2d0ba]/10 px-0.5 rounded border-b border-[#bfa078]/35 shadow-[0_0_8px_rgba(191,160,120,0.18)]">
          {match}
        </span>
        {after}
      </span>
    );
  };

  const isPlayingThisReciter = currentTrack?.reciter.id === reciter.id && playbackStatus === 'playing';

  const nameClass = searchQuery?.trim()
    ? isSelected
      ? 'text-[#e6d5c2]'
      : 'text-[#f6f8fb] group-hover:text-[#e6d5c2]'
    : `reciter-name-gradient${isSelected ? ' is-selected' : ''}`;

  const actions = (
    <div className="flex items-center gap-1.5 shrink-0 sm:gap-2">
      <button
        type="button"
        onClick={onToggleFavorite}
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all border tap-feedback focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfa078] ${
          isFavorite
            ? 'bg-[#f08c8c]/14 border-[#f08c8c]/30 text-[#f2a3a3] shadow-[0_0_12px_rgba(240,140,140,0.14)]'
            : 'bg-[#07111d]/60 border-[#30455c]/80 text-[#95a7ba] hover:text-[#f2a3a3] hover:bg-[#f08c8c]/10'
        }`}
        title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        aria-pressed={isFavorite}
      >
        <Heart className={`w-4.5 h-4.5 ${isFavorite ? 'fill-current' : ''}`} />
      </button>

      <span
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${
          isSelected
            ? 'bg-[#e2d0ba] text-[#111d2d] shadow-lg shadow-[#8a7350]/20'
            : 'bg-[#162538]/85 text-[#d0d9e3] border border-[#46607b]/50 group-hover:bg-[#e2d0ba] group-hover:text-[#111d2d]'
        }`}
      >
        {isPlayingThisReciter ? (
          <div className="flex gap-0.5 items-end justify-center h-4 w-4">
            <div className="w-1 bg-current animate-[shimmer_0.8s_infinite_alternate] h-full rounded-full" style={{ animationDelay: '0.1s' }} />
            <div className="w-1 bg-current animate-[shimmer_0.8s_infinite_alternate] h-3/4 rounded-full" style={{ animationDelay: '0.3s' }} />
            <div className="w-1 bg-current animate-[shimmer_0.8s_infinite_alternate] h-full rounded-full" style={{ animationDelay: '0.5s' }} />
          </div>
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </span>
    </div>
  );

  const shellClass = `glass-panel-interactive cursor-pointer rounded-2xl tap-feedback relative group ${
    isSelected
      ? 'border-[#bfa078]/40 bg-[#111d2d]/92 shadow-[0_0_28px_rgba(191,160,120,0.16)] ring-1 ring-[#e2d0ba]/25'
      : 'hover:border-[#bfa078]/30'
  }`;

  if (layout === 'stacked') {
    return (
      <div
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
        className={`${shellClass} content-visibility-auto flex flex-col gap-3.5 overflow-hidden p-3.5`}
      >
        <div className="flex items-center justify-between gap-3">
          <div
            className={`relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl transition-transform duration-300 group-hover:scale-[1.03] ${
              isSelected
                ? 'ring-2 ring-[#e2d0ba] ring-offset-2 ring-offset-[#07111d] shadow-[0_10px_28px_rgba(191,160,120,0.28)]'
                : 'border border-[#46607b]/45 shadow-[0_10px_24px_rgba(0,0,0,0.35)]'
            }`}
          >
            <ReciterPortrait reciter={reciter} width={72} height={72} loading="lazy" decoding="async" />
          </div>
          {actions}
        </div>
        <div className="min-w-0">
          {isPlayingThisReciter && (
            <div className="mb-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[#e6d5c2] bg-[#e2d0ba]/10 px-2 py-0.5 rounded-full">
                <Volume2 className="w-3 h-3 animate-playback-pulse" /> Lecture en cours
              </span>
            </div>
          )}
          <h3 className="flex min-w-0 items-center gap-2 font-semibold text-[15px] leading-none">
            <span className={`min-w-0 truncate ${nameClass}`}>
              {highlightMatch(reciter.name, searchQuery || '')}
            </span>
            <AyahSyncBadge reciter={reciter} className="shrink-0" />
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`${shellClass} mb-1.5 flex h-[5.75rem] items-stretch gap-0 overflow-visible p-0`}
    >
      {/* Dominant portrait panel — fades into the card on the right */}
      <div
        className={`relative h-full w-[5.25rem] shrink-0 overflow-hidden rounded-l-2xl sm:w-[6.75rem] ${
          isSelected ? 'shadow-[inset_0_0_0_1px_rgba(241,232,220,0.28)]' : ''
        }`}
      >
        <ReciterPortrait
          reciter={reciter}
          width={108}
          height={108}
          loading="lazy"
          decoding="async"
          className="h-full w-full"
          imgClassName="transition-transform duration-500 group-hover:scale-[1.06]"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-[72%] bg-gradient-to-r from-transparent via-[#111d2d]/45 to-[#111d2d]"
          aria-hidden
        />
        {isPlayingThisReciter && (
          <span className="absolute bottom-2 left-2 z-[3] inline-flex items-center gap-1 rounded-full border border-[#bfa078]/35 bg-[#07111d]/75 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#e6d5c2] backdrop-blur-md">
            <Volume2 className="h-3 w-3 animate-playback-pulse" />
            Live
          </span>
        )}
      </div>

      <div className="relative flex min-w-0 flex-1 items-center justify-between gap-2.5 overflow-visible rounded-r-2xl py-3 pr-3.5 pl-3 sm:gap-3 sm:pr-4 sm:pl-3.5">
        <ReciterNameMarquee name={reciter.name} trackClassName={nameClass}>
          {highlightMatch(reciter.name, searchQuery || '')}
        </ReciterNameMarquee>
        {actions}
      </div>

      <AyahSyncBadge reciter={reciter} className="reciter-card-versets-badge" />
    </div>
  );
};
