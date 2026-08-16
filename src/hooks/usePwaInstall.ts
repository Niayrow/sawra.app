'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getPwaPlatform,
  isPwaStandalone,
  pwaInstallButtonLabel,
  pwaInstallHint,
  type PwaPlatform,
} from '../utils/pwaPlatform';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export type UsePwaInstallResult = {
  platform: PwaPlatform;
  standalone: boolean;
  /** Mobile (iOS/Android) and not already installed — good moment to suggest. */
  canSuggest: boolean;
  /** Chrome/Edge deferred install prompt is available. */
  canNativeInstall: boolean;
  buttonLabel: string;
  hint: string;
  promptNativeInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
};

export function usePwaInstall(): UsePwaInstallResult {
  const [platform, setPlatform] = useState<PwaPlatform>('unknown');
  const [standalone, setStandalone] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(getPwaPlatform());
    setStandalone(isPwaStandalone());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferred(null);
      setStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    const media = window.matchMedia('(display-mode: standalone)');
    const onDisplayMode = () => setStandalone(isPwaStandalone());
    media.addEventListener?.('change', onDisplayMode);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener?.('change', onDisplayMode);
    };
  }, []);

  const promptNativeInstall = useCallback(async () => {
    if (!deferred) return 'unavailable' as const;
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      setDeferred(null);
      if (outcome === 'accepted') setStandalone(true);
      return outcome;
    } catch {
      setDeferred(null);
      return 'unavailable' as const;
    }
  }, [deferred]);

  const canSuggest = !standalone && (platform === 'ios' || platform === 'android');

  return {
    platform,
    standalone,
    canSuggest,
    canNativeInstall: Boolean(deferred) && !standalone,
    buttonLabel: pwaInstallButtonLabel(platform),
    hint: pwaInstallHint(platform),
    promptNativeInstall,
  };
}
