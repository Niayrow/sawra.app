import React from 'react';
import type { Reciter } from '../types';
import { useAudio } from '../context/AudioContext';
import { Play, Volume2, Heart } from '../icons/motion';
import { getGeneratedReciterAvatar, getReciterImage } from '../utils/images';
import { AyahSyncBadge } from './AyahSyncBadge';

interface ReciterCardProps {
  reciter: Reciter;
  isSelected: boolean;
  onSelect: () => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  searchQuery?: string;
}

export const ReciterCard: React.FC<ReciterCardProps> = ({
  reciter,
  isSelected,
  onSelect,
  isFavorite,
  onToggleFavorite,
  searchQuery
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
        <span className="text-[#f1d4c1] font-extrabold bg-[#f0d1bc]/10 px-0.5 rounded border-b border-[#cea687]/35 shadow-[0_0_8px_rgba(206,166,135,0.18)]">
          {match}
        </span>
        {after}
      </span>
    );
  };

  const isPlayingThisReciter = currentTrack?.reciter.id === reciter.id && playbackStatus === 'playing';
  const imageUrl = getReciterImage(reciter);
  const fallbackImage = getGeneratedReciterAvatar(reciter);

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
      className={`glass-panel-interactive content-visibility-auto cursor-pointer p-4 rounded-2xl flex items-center justify-between gap-4 tap-feedback relative overflow-hidden group ${
        isSelected
          ? 'border-[#cea687]/35 bg-[#111d2d]/88 shadow-[0_0_20px_rgba(206,166,135,0.12)] ring-1 ring-[#f0d1bc]/20'
          : 'hover:border-[#46607b]'
      }`}
    >
      {isSelected && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#f0d1bc]/8 blur-3xl rounded-full pointer-events-none -mr-8 -mt-8" />
      )}

      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`relative w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center font-bold text-lg overflow-hidden transition-transform duration-300 ${
          isSelected
            ? 'bg-gradient-to-tr from-[#7990a1] via-[#b8c7d2] to-[#f0d1bc] text-[#111d2d] shadow-lg ring-2 ring-[#f0d1bc] ring-offset-2 ring-offset-[#07111d]'
            : 'bg-gradient-to-tr from-[#162538] to-[#111d2d] text-[#9fb1c3] border border-[#46607b]/50 group-hover:border-[#cea687]/40'
        }`}>
          <img
            src={imageUrl}
            alt={reciter.name}
            width="56"
            height="56"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== fallbackImage) {
                img.src = fallbackImage;
              }
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          {isPlayingThisReciter && (
            <div className="mb-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[#f1d4c1] bg-[#f0d1bc]/10 px-2 py-0.5 rounded-full">
                <Volume2 className="w-3 h-3 animate-playback-pulse" /> Lecture en cours
              </span>
            </div>
          )}
          <h3
            className={`flex min-w-0 items-center gap-2 font-semibold text-lg transition-colors ${
              isSelected ? 'text-[#f1d4c1]' : 'text-[#f6f8fb] group-hover:text-[#f1d4c1]'
            }`}
          >
            <span className="min-w-0 truncate">
              {highlightMatch(reciter.name, searchQuery || '')}
            </span>
            <AyahSyncBadge reciter={reciter} />
          </h3>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleFavorite}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all border tap-feedback focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cea687] ${
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
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-[#f0d1bc] text-[#111d2d] shadow-lg shadow-[#b98d6e]/20'
              : 'bg-[#162538]/85 text-[#d0d9e3] border border-[#46607b]/50 group-hover:bg-[#f0d1bc] group-hover:text-[#111d2d]'
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
    </div>
  );
};
