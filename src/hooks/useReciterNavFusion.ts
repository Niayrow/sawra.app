import { useEffect, useRef, useState, useCallback } from 'react';

const DESKTOP_MIN = 768;
export const MERGE_SCROLL_RANGE = 460;
const SHORT_MERGE_SCROLL_RANGE = 280;
const FUSION_STICK_BUFFER = 100;
const FUSION_VAR = '--fusion-p';

function collectTargets(header: HTMLElement | null) {
  const nodes: HTMLElement[] = [];
  if (header) nodes.push(header);
  document
    .querySelectorAll<HTMLElement>(
      '.nav-reciter-fusion-shell, .nav-desktop-classic-root, .home-explore-fusion',
    )
    .forEach((node) => {
      if (node !== header) nodes.push(node);
    });
  return nodes;
}

/**
 * Desktop fusion 0→1, same math as the home "Explorer les voix" button.
 *
 * `--fusion-p` is written on the header + navbar nodes only (never <html>),
 * so a 114-surah list is not restyled on every wheel tick.
 * React `progress` only flips at 0 / fusing / done for className + dock.
 */
export function useReciterNavFusion(enabled: boolean, resetKey = '') {
  const [progress, setProgress] = useState(0);
  const [spacerPx, setSpacerPx] = useState(0);
  const headerRef = useRef<HTMLElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const stuckRef = useRef(false);
  const stickScrollY = useRef(0);
  const mergeRangeRef = useRef(MERGE_SCROLL_RANGE);
  const spacerPxRef = useRef(0);
  const lastCssRef = useRef(-1);
  const targetsRef = useRef<HTMLElement[]>([]);
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
    stuckRef.current = false;
    stickScrollY.current = 0;
    mergeRangeRef.current = MERGE_SCROLL_RANGE;
    lastCssRef.current = -1;

    const applyCss = (value: number) => {
      if (value === lastCssRef.current) return;
      lastCssRef.current = value;
      if (targetsRef.current.length === 0) {
        targetsRef.current = collectTargets(headerRef.current);
      }
      const text = String(value);
      for (const node of targetsRef.current) {
        node.style.setProperty(FUSION_VAR, text);
      }
    };

    const clearCss = () => {
      for (const node of targetsRef.current) {
        node.style.removeProperty(FUSION_VAR);
      }
      document.documentElement.style.removeProperty(FUSION_VAR);
      targetsRef.current = [];
      lastCssRef.current = -1;
    };

    if (!enabled) {
      clearCss();
      setProgress(0);
      setSpacerPx(0);
      spacerPxRef.current = 0;
      return;
    }

    targetsRef.current = collectTargets(headerRef.current);
    applyCss(0);
    setProgress(0);
    setSpacerPx(0);
    spacerPxRef.current = 0;

    const publish = (next: number) => {
      applyCss(next);
      const ui = next <= 0.01 ? 0 : next >= 0.98 ? 1 : 0.5;
      setProgress((prev) => (prev === ui ? prev : ui));
    };

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
        publish(0);
        return;
      }

      const sentinel = sentinelRef.current;
      const header = headerRef.current;
      if (!sentinel || !header) return;

      if (!targetsRef.current.includes(header)) {
        targetsRef.current = collectTargets(header);
      }

      const stickyTop = parseFloat(getComputedStyle(header).top) || 96;
      const sentinelBottom = sentinel.getBoundingClientRect().bottom;
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const isStuck = sentinelBottom <= stickyTop + 1;

      if (!isStuck) {
        stuckRef.current = false;
        publish(0);
        return;
      }

      if (!stuckRef.current) {
        stuckRef.current = true;
        stickScrollY.current = scrollY;
        mergeRangeRef.current = SHORT_MERGE_SCROLL_RANGE;
      }

      const delta = Math.max(0, scrollY - stickScrollY.current);
      publish(Math.min(1, delta / Math.max(1, mergeRangeRef.current)));
    };

    const schedule = () => {
      if (rafId.current != null) return;
      rafId.current = window.requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });

    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (ro) {
      ro.observe(document.documentElement);
    }

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro?.disconnect();
      if (rafId.current != null) window.cancelAnimationFrame(rafId.current);
      clearCss();
    };
  }, [enabled, resetKey]);

  return { progress, spacerPx, setHeaderRef, setSentinelRef };
}
