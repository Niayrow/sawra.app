import React from 'react';
import { Cloud, Heart, Headphones, X, LogIn } from '../icons/motion';

interface AuthPromptModalProps {
  open: boolean;
  onClose: () => void;
  onConnect: () => void;
}

export const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  open,
  onClose,
  onConnect,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-prompt-title"
    >
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-[#07111d]/78 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl brand-card shadow-[0_20px_60px_rgba(0,0,0,0.55)] animate-[slide-up_0.28s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(241,232,220,0.16),transparent_50%)] pointer-events-none" />

        <div className="relative px-5 pt-4 pb-5">
          <div className="flex justify-center sm:hidden mb-3">
            <span className="h-1 w-10 rounded-full bg-[#46607b]" />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="brand-chip flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
                <Cloud className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#e2d0ba]">
                  Compte Sawra
                </p>
                <h2 id="auth-prompt-title" className="text-lg font-black text-[#f6f8fb] leading-tight">
                  Gardez vos favoris et votre lecture
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
            Connectez-vous pour sauvegarder vos récitateurs préférés et reprendre
            l&apos;écoute exactement où vous vous êtes arrêté, sur tous vos appareils.
          </p>

          <ul className="mt-4 space-y-2.5">
            <li className="flex items-center gap-2.5 text-xs text-[#d7e4ef]">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f08c8c]/10 text-[#f2a3a3]">
                <Heart className="h-3.5 w-3.5" />
              </span>
              Favoris synchronisés dans le cloud
            </li>
            <li className="flex items-center gap-2.5 text-xs text-[#d7e4ef]">
              <span className="brand-chip flex h-8 w-8 items-center justify-center rounded-xl">
                <Headphones className="h-3.5 w-3.5" />
              </span>
              Reprise automatique de votre dernière sourate
            </li>
          </ul>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onConnect}
              className="brand-button-primary flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black tap-feedback"
            >
              <LogIn className="h-4 w-4" />
              Se connecter
            </button>
            <button
              type="button"
              onClick={onClose}
              className="brand-button-secondary flex-1 rounded-xl px-4 py-3 text-sm font-bold tap-feedback"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
