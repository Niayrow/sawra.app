'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Share, Smartphone, X } from '../icons/motion';
import type { PwaPlatform } from '../utils/pwaPlatform';

type PwaInstallModalProps = {
  open: boolean;
  platform: PwaPlatform;
  onClose: () => void;
};

const IOS_STEPS = [
  'Ouvrez Sawra dans Safari (pas Chrome).',
  'Appuyez sur le bouton Partager.',
  'Choisissez « Sur l’écran d’accueil », puis Ajouter.',
];

const ANDROID_STEPS = [
  'Ouvrez le menu ⋮ de Chrome.',
  'Appuyez sur « Installer l’application » ou « Ajouter à l’écran d’accueil ».',
  'Confirmez — Sawra s’ouvre ensuite comme une app.',
];

const DESKTOP_STEPS = [
  'Dans Chrome ou Edge, ouvrez le menu du navigateur.',
  'Choisissez « Installer Sawra » ou l’icône d’installation dans la barre d’adresse.',
  'Lancez Sawra depuis le bureau ou le dock.',
];

function stepsFor(platform: PwaPlatform): string[] {
  if (platform === 'ios') return IOS_STEPS;
  if (platform === 'android') return ANDROID_STEPS;
  return DESKTOP_STEPS;
}

function titleFor(platform: PwaPlatform): string {
  if (platform === 'ios') return 'Installer sur iPhone ou iPad';
  if (platform === 'android') return 'Installer sur Android';
  return 'Installer Sawra';
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  open,
  platform,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyTouch = body.style.touchAction;
    const prevPaddingRight = body.style.paddingRight;
    const scrollbarGap = window.innerWidth - html.clientWidth;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    if (scrollbarGap > 0) body.style.paddingRight = `${scrollbarGap}px`;

    const preventScroll = (event: Event) => {
      event.preventDefault();
    };

    document.addEventListener('wheel', preventScroll, { passive: false, capture: true });
    document.addEventListener('touchmove', preventScroll, { passive: false, capture: true });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevBodyTouch;
      body.style.paddingRight = prevPaddingRight;
      document.removeEventListener('wheel', preventScroll, true);
      document.removeEventListener('touchmove', preventScroll, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const steps = stepsFor(platform);
  const isIos = platform === 'ios';

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      style={{ overscrollBehavior: 'none', touchAction: 'none' }}
    >
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-[#07111d]/82 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="batch-toast-enter relative z-10 w-full max-w-md overflow-hidden rounded-3xl brand-card shadow-[0_28px_80px_rgba(0,0,0,0.65)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(241,232,220,0.16),transparent_50%)] pointer-events-none" />

        <div className="relative px-5 pt-5 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="brand-chip flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
                {isIos ? <Share className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#e2d0ba]">
                  Application
                </p>
                <h2
                  id="pwa-install-title"
                  className="text-lg font-black text-[#f6f8fb] leading-tight"
                >
                  {titleFor(platform)}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#30455c] bg-[#111d2d] text-[#95a7ba] hover:text-[#f6f8fb] tap-feedback"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-[#c8d1db]">
            Ajoutez Sawra à votre écran d’accueil pour un accès rapide, hors navigateur, sans
            passer par les stores.
          </p>

          <ol className="mt-4 space-y-2.5">
            {steps.map((step, index) => (
              <li key={step} className="flex items-start gap-2.5 text-xs text-[#d7e4ef]">
                <span className="brand-chip flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[11px] font-black">
                  {index + 1}
                </span>
                <span className="pt-1.5 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={onClose}
            className="brand-button-primary mt-5 w-full rounded-xl px-4 py-3 text-sm font-black tap-feedback"
          >
            Compris
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
