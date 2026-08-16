'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type PlayerTooltipProps = {
  label: string;
  children: ReactNode;
  /** Player theme accent (sliderAccentColor) */
  accentColor?: string;
  side?: 'top' | 'bottom';
  className?: string;
  disabled?: boolean;
};

/**
 * Themed tooltip for player-bar controls — glass + accent border,
 * positioned via portal so overflow-hidden docks don't clip it.
 */
export function PlayerTooltip({
  label,
  children,
  accentColor = '#bfa078',
  side = 'top',
  className = '',
  disabled = false,
}: PlayerTooltipProps) {
  const tipId = useId();
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  const measure = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({
      x: r.left + r.width / 2,
      y: side === 'top' ? r.top : r.bottom,
    });
  }, [side]);

  const show = useCallback(() => {
    if (disabled || !label.trim()) return;
    measure();
    setOpen(true);
  }, [disabled, label, measure]);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => measure();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, measure]);

  return (
    <span
      ref={wrapRef}
      className={['player-tooltip-host', className || 'inline-flex max-w-full'].filter(Boolean).join(' ')}
      onPointerEnter={(e) => {
        if (e.pointerType === 'touch') return;
        show();
      }}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            id={tipId}
            role="tooltip"
            className={`player-tooltip player-tooltip--${side}`}
            style={{
              left: coords.x,
              top: coords.y,
              borderColor: `${accentColor}66`,
              boxShadow: `0 14px 32px rgba(0,0,0,0.5), 0 0 18px ${accentColor}28`,
              ['--player-tip-accent' as string]: accentColor,
            }}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}
