'use client';

import React, { useEffect, useState } from 'react';
import { Share, Smartphone, X } from '../icons/motion';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { useAppOptions } from '../utils/appOptions';
import { PwaInstallModal } from './PwaInstallModal';

const DISMISS_KEY = 'sawra_pwa_install_dismissed';

type PwaInstallBannerProps = {
  /** Delay before showing (ms). Avoids competing with first paint. */
  delayMs?: number;
};

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({ delayMs = 1800 }) => {
  const pwa = usePwaInstall();
  const [appOpts, setAppOpts] = useAppOptions();
  const [visible, setVisible] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  useEffect(() => {
    if (!pwa.canSuggest || !appOpts.showPwaInstallSuggest) {
      setVisible(false);
      return;
    }
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      /* ignore */
    }
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [pwa.canSuggest, appOpts.showPwaInstallSuggest, delayMs]);

  const dismiss = () => {
    setVisible(false);
    setAppOpts({ showPwaInstallSuggest: false });
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const onInstall = async () => {
    if (pwa.canNativeInstall) {
      const outcome = await pwa.promptNativeInstall();
      if (outcome === 'accepted') {
        dismiss();
        return;
      }
      if (outcome === 'dismissed') return;
    }
    setInstallOpen(true);
  };

  if (!visible || !pwa.canSuggest || !appOpts.showPwaInstallSuggest) return null;

  const Icon = pwa.platform === 'ios' ? Share : Smartphone;

  return (
    <>
      <PwaInstallModal
        open={installOpen}
        platform={pwa.platform}
        onClose={() => setInstallOpen(false)}
      />
      <aside
        className="relative overflow-hidden rounded-[1.25rem] border border-[#bfa078]/30 bg-[linear-gradient(135deg,rgba(226,208,186,0.12),rgba(12,21,34,0.92))] px-3.5 py-3"
        aria-label="Installer Sawra"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#bfa078]/35 bg-[#e2d0ba]/14 text-[#e6d5c2]">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-[#f6f8fb]">
              {pwa.platform === 'ios' ? 'Sur votre iPhone / iPad' : 'Sur votre Android'}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-[#95a7ba]">
              Installez Sawra en PWA pour un accès rapide depuis l’écran d’accueil.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void onInstall()}
                className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#bfa078]/40 bg-[#e2d0ba]/18 px-3.5 text-[11px] font-bold text-[#e6d5c2] tap-feedback hover:bg-[#e2d0ba]/26"
              >
                {pwa.buttonLabel}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="inline-flex min-h-9 items-center px-2 text-[11px] font-semibold text-[#8ea1b3] hover:text-[#c8d1db] tap-feedback"
              >
                Plus tard
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8ea1b3] hover:bg-[#162538]/80 hover:text-[#f6f8fb] tap-feedback"
            aria-label="Fermer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>
    </>
  );
};
