import type { ReactNode } from 'react';
import {
  House,
  Headphones,
  Heart,
  Settings,
  User,
} from './motion';

/** Navbar animated icons — re-export from the shared AnimateIcons barrel */
export { House, Headphones, Heart, Settings, User };

/**
 * Compatibility stub for Navbar's former MotionIconConfig wrapper.
 * AnimateIcons animate on hover without a config provider.
 */
export function MotionIconConfig({
  children,
}: {
  children: ReactNode;
  trigger?: string;
  mode?: string;
  duration?: number;
}) {
  return children;
}
