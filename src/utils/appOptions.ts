import { useEffect, useState } from 'react';

export type AppOptions = {
  /** Reprendre automatiquement la dernière écoute au lancement */
  autoResumeOnLaunch: boolean;
  /** Garder l’écran allumé pendant la lecture */
  wakeLockWhilePlaying: boolean;
  /** Réduire les animations */
  reduceMotion: boolean;
  /** Contraste renforcé */
  highContrast: boolean;
  /** Refuser PostHog / analytics */
  analyticsOptOut: boolean;
  /** Afficher la suggestion d’installation PWA */
  showPwaInstallSuggest: boolean;
};

export const DEFAULT_APP_OPTIONS: AppOptions = {
  autoResumeOnLaunch: false,
  wakeLockWhilePlaying: false,
  reduceMotion: false,
  highContrast: false,
  analyticsOptOut: false,
  showPwaInstallSuggest: true,
};

const STORAGE_KEY = 'sawra_app_options_v1';
const PWA_DISMISS_KEY = 'sawra_pwa_install_dismissed';

const listeners = new Set<(opts: AppOptions) => void>();

export function loadAppOptions(): AppOptions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Migrate legacy PWA dismiss flag
      const dismissed = localStorage.getItem(PWA_DISMISS_KEY) === '1';
      return {
        ...DEFAULT_APP_OPTIONS,
        showPwaInstallSuggest: !dismissed,
      };
    }
    const parsed = JSON.parse(raw) as Partial<AppOptions>;
    return { ...DEFAULT_APP_OPTIONS, ...parsed };
  } catch {
    return { ...DEFAULT_APP_OPTIONS };
  }
}

let snapshot: AppOptions =
  typeof window !== 'undefined' ? loadAppOptions() : { ...DEFAULT_APP_OPTIONS };

export function getAppOptions(): AppOptions {
  return snapshot;
}

export function saveAppOptions(opts: AppOptions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(opts));
    localStorage.setItem(PWA_DISMISS_KEY, opts.showPwaInstallSuggest ? '0' : '1');
  } catch {
    // ignore
  }
}

export function updateAppOptions(partial: Partial<AppOptions>): AppOptions {
  const merged = { ...snapshot, ...partial };
  snapshot = merged;
  saveAppOptions(merged);
  listeners.forEach((l) => l(merged));
  return merged;
}

export function useAppOptions(): [AppOptions, (partial: Partial<AppOptions>) => void] {
  const [opts, setOpts] = useState<AppOptions>(() => snapshot);

  useEffect(() => {
    const onChange = (next: AppOptions) => setOpts(next);
    listeners.add(onChange);
    setOpts(getAppOptions());
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  return [opts, updateAppOptions];
}

export function applyAppOptionsToDocument(opts: AppOptions) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.reduceMotion = opts.reduceMotion ? '1' : '0';
  root.dataset.highContrast = opts.highContrast ? '1' : '0';
}
