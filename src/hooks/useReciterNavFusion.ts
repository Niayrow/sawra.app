import { useEffect, useRef, useState, useCallback } from 'react';

const DESKTOP_MIN = 768;
/** Scroll distance after sticky to complete the navbar merge (long pages). */
export const MERGE_SCROLL_RANGE = 460;
/** Faster merge when the page is short — less empty spacer needed. */
const SHORT_MERGE_SCROLL_RANGE = 280;
/** Extra room so the header can reach sticky before the merge scroll. */
const FUSION_STICK_BUFFER = 100;

/**
 * Desktop-only fusion progress (0→1).
 * Uses a sentinel placed just above the sticky header:
 * once the sentinel leaves the viewport under the navbar, further scroll
 * drives the merge into the navbar capsule.
 *
 * Short pages get a compact merge range + a minimal bottom spacer so fusion
 * can finish. Long pages keep the full MERGE_SCROLL_RANGE and spacerPx = 0.
 */
export function useReciterNavFusion(enabled: boolean) {
  const [progress, setProgress] = useState(0);
  const [spacerPx, setSpacerPx] = useState(0);
  const headerRef = useRef<HTMLElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const stuckRef = useRef(false);
  const stickScrollY = useRef(0);
  const mergeRangeRef = useRef(MERGE_SCROLL_RANGE);
  const spacerPxRef = useRef(0);
  const rafId = useRef<number | null>(null);

  const setHeaderRef = useCallback((node: HTMLElement | null) => {
    headerRef.current = node;
  }, []);

  const setSentinelRef = useCallback((node: HTMLDivElement | null) => {
    sentinelRef.current = node;
  }, []);

  useEffect(() => {
    spacerPxRef.current = spacerPx;
  }, [spacerPx]);

  useEffect(() => {
    if (!enabled) {
      stuckRef.current = false;
      stickScrollY.current = 0;
      mergeRangeRef.current = MERGE_SCROLL_RANGE;
      setProgress(0);
      setSpacerPx(0);
      spacerPxRef.current = 0;
      return;
    }

    const updateSpacer = () => {
      if (window.innerWidth < DESKTOP_MIN) {
        if (spacerPxRef.current !== 0) {
          spacerPxRef.current = 0;
          setSpacerPx(0);
        }
        mergeRangeRef.current = MERGE_SCROLL_RANGE;
        return;
      }

      const currentSpacer = spacerPxRef.current;
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const rawMaxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight - currentSpacer,
      );

      const header = headerRef.current;
      const sentinel = sentinelRef.current;
      const stickyTop = header
        ? parseFloat(getComputedStyle(header).top) || 96
        : 96;

      // ScrollY when the sticky header actually docks — fusion needs
      // mergeRange *after* this point, not just a tall page overall.
      let stickAt = scrollY;
      if (sentinel) {
        stickAt = scrollY + (sentinel.getBoundingClientRect().bottom - stickyTop);
      }
      const remainingAfterStick = rawMaxScroll - Math.max(0, stickAt);
      const neededAfterStick = SHORT_MERGE_SCROLL_RANGE + FUSION_STICK_BUFFER;
      const nextSpacer = Math.max(0, Math.ceil(neededAfterStick - remainingAfterStick));

      mergeRangeRef.current = SHORT_MERGE_SCROLL_RANGE;

      if (Math.abs(nextSpacer - currentSpacer) >= 8) {
        spacerPxRef.current = nextSpacer;
        setSpacerPx(nextSpacer);
      }
    };

    const compute = () => {
      rafId.current = null;
      updateSpacer();

      if (window.innerWidth < DESKTOP_MIN) {
        stuckRef.current = false;
        setProgress((prev) => (prev === 0 ? prev : 0));
        return;
      }

      const sentinel = sentinelRef.current;
      const header = headerRef.current;
      if (!sentinel || !header) return;

      const stickyTop = parseFloat(getComputedStyle(header).top) || 96;
      const sentinelBottom = sentinel.getBoundingClientRect().bottom;
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const isStuck = sentinelBottom <= stickyTop + 1;

      if (!isStuck) {
        stuckRef.current = false;
        setProgress((prev) => (prev === 0 ? prev : 0));
        return;
      }

      if (!stuckRef.current) {
        stuckRef.current = true;
        stickScrollY.current = scrollY;
        mergeRangeRef.current = SHORT_MERGE_SCROLL_RANGE;
      }

      const delta = Math.max(0, scrollY - stickScrollY.current);
      const next = Math.min(1, delta / Math.max(1, mergeRangeRef.current));
      setProgress((prev) => (Math.abs(prev - next) < 0.008 ? prev : next));
    };

    const schedule = () => {
      if (rafId.current != null) return;
      rafId.current = window.requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(schedule)
      : null;
    if (ro) {
      ro.observe(document.documentElement);
      if (headerRef.current) ro.observe(headerRef.current);
    }

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro?.disconnect();
      if (rafId.current != null) window.cancelAnimationFrame(rafId.current);
    };
  }, [enabled]);

  return { progress, spacerPx, setHeaderRef, setSentinelRef };
}
