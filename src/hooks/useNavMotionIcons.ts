import { useEffect, useState, type ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Heart as HeartStatic,
  House as HouseStatic,
  Headphones as HeadphonesStatic,
  Play as PlayStatic,
  Settings as SettingsStatic,
  User as UserStatic,
} from '../icons/motion';

export type NavTabIcon = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
  trigger?: 'hover' | 'click' | 'mount' | 'in-view' | 'parent-hover' | 'manual';
  mode?: 'draw' | 'signature';
  duration?: number;
}>;

type NavMotionModule = typeof import('../icons/navMotion');

const STATIC_ICONS = {
  home: HouseStatic as NavTabIcon,
  listen: HeadphonesStatic as NavTabIcon,
  moments: PlayStatic as NavTabIcon,
  favorites: HeartStatic as NavTabIcon,
  account: UserStatic as NavTabIcon,
  more: SettingsStatic as NavTabIcon,
} as const;

/**
 * Serves static Lucide icons immediately, then upgrades to
 * lucide-react-motion only after real user interaction (keeps LCP light).
 */
export function useNavMotionIcons() {
  const [mod, setMod] = useState<NavMotionModule | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded = false;

    const teardown = () => {
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
      window.removeEventListener('touchstart', onInteract);
      window.removeEventListener('scroll', onInteract);
    };

    const onInteract = () => {
      if (loaded || cancelled) return;
      loaded = true;
      teardown();
      void import('../icons/navMotion').then((loadedMod) => {
        if (!cancelled) setMod(loadedMod);
      });
    };

    window.addEventListener('pointerdown', onInteract, { once: true, passive: true });
    window.addEventListener('keydown', onInteract, { once: true });
    window.addEventListener('touchstart', onInteract, { once: true, passive: true });
    window.addEventListener('scroll', onInteract, { once: true, passive: true });

    return () => {
      cancelled = true;
      teardown();
    };
  }, []);

  const ready = Boolean(mod);

  return {
    ready,
    MotionIconConfig: mod?.MotionIconConfig ?? null,
    icons: {
      home: (mod?.House as NavTabIcon | undefined) ?? STATIC_ICONS.home,
      listen: (mod?.Headphones as NavTabIcon | undefined) ?? STATIC_ICONS.listen,
      moments: (mod?.Play as NavTabIcon | undefined) ?? STATIC_ICONS.moments,
      favorites: (mod?.Heart as NavTabIcon | undefined) ?? STATIC_ICONS.favorites,
      account: (mod?.User as NavTabIcon | undefined) ?? STATIC_ICONS.account,
      more: (mod?.Settings as NavTabIcon | undefined) ?? STATIC_ICONS.more,
    },
  };
}

export type { LucideIcon };
