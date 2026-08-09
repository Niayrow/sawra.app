import React from 'react';
import type { Reciter } from '../types';
import {
  RECITER_BACKGROUND,
  getGeneratedReciterAvatar,
  getReciterImage,
  hasLocalReciterImage,
} from '../utils/images';

type ReciterPortraitProps = {
  reciter: Reciter;
  className?: string;
  imgClassName?: string;
  alt?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string;
};

/**
 * Layers brand background + cutout portrait dynamically.
 * Cutouts live in /public/reciters/*.webp with transparency.
 */
export const ReciterPortrait: React.FC<ReciterPortraitProps> = ({
  reciter,
  className = '',
  imgClassName = '',
  alt,
  width,
  height,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  sizes,
}) => {
  const local = hasLocalReciterImage(reciter.id);
  const src = getReciterImage(reciter);
  const fallback = getGeneratedReciterAvatar(reciter);
  const label = alt ?? reciter.name;

  if (!local) {
    return (
      <img
        src={src}
        alt={label}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        sizes={sizes}
        className={`h-full w-full object-cover ${className} ${imgClassName}`.trim()}
      />
    );
  }

  return (
    <span className={`reciter-portrait ${className}`.trim()}>
      <img
        src={RECITER_BACKGROUND}
        alt=""
        aria-hidden
        className="reciter-portrait__bg"
        loading={loading}
        decoding={decoding}
      />
      <img
        src={src}
        alt={label}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        sizes={sizes}
        className={`reciter-portrait__fg ${imgClassName}`.trim()}
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src !== fallback) {
            img.src = fallback;
            img.classList.add('reciter-portrait__fg--fallback');
          }
        }}
      />
    </span>
  );
};
