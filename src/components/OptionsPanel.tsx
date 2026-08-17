'use client';

import React, { useState } from 'react';
import { HardDrive, Settings, Shield, Smartphone, Sparkles, Trash2 } from '../icons/motion';
import { useAudio } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';
import { useAppOptions } from '../utils/appOptions';
import {
  SUGGESTION_MAX_LENGTH,
  SUGGESTION_MIN_LENGTH,
  submitSuggestion,
  type SuggestionKind,
} from '../utils/suggestions';
import { NavDesktopStyleToggle } from './NavDesktopStyleToggle';
import type { NavDesktopStyle } from '../utils/navDesktopStyle';

type OptionsPanelProps = {
  navDesktopStyle: NavDesktopStyle;
  onNavDesktopStyleChange: (style: NavDesktopStyle) => void;
};

const SUGGEST_KIND_OPTIONS: { id: SuggestionKind; label: string }[] = [
  { id: 'feature', label: 'Fonctionnalité' },
  { id: 'improvement', label: 'Amélioration' },
];

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel rounded-3xl border border-[#30455c]/60 p-5">
      <div className="flex items-start gap-3">
        <span className="brand-chip-cool mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-black text-[#f6f8fb]">{title}</h2>
          {hint ? (
            <p className="mt-0.5 text-[11px] leading-snug text-[#95a7ba]">{hint}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  hint,
  pressed,
  onToggle,
}: {
  label: string;
  hint?: string;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={pressed}
      className="flex w-full items-center gap-3 rounded-2xl border border-[#30455c]/55 bg-[#0f1928]/75 px-3.5 py-3 text-left tap-feedback transition-colors hover:border-[#bfa078]/28"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-[#f6f8fb]">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[11px] leading-snug text-[#95a7ba]">{hint}</span>
        ) : null}
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
          pressed
            ? 'border-[#bfa078]/45 bg-[#e2d0ba]/25'
            : 'border-[#30455c] bg-[#162538]'
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full transition-transform ${
            pressed ? 'translate-x-6 bg-[#e2d0ba]' : 'translate-x-0.5 bg-[#7a93ab]'
          }`}
        />
      </span>
    </button>
  );
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({
  navDesktopStyle,
  onNavDesktopStyleChange,
}) => {
  const { cacheInfo, clearCache } = useAudio();
  const { user } = useAuth();
  const [appOpts, setAppOpts] = useAppOptions();
  const [clearing, setClearing] = useState(false);
  const [clearDone, setClearDone] = useState(false);
  const [suggestKind, setSuggestKind] = useState<SuggestionKind>('feature');
  const [suggestMessage, setSuggestMessage] = useState('');
  const [suggestHoneypot, setSuggestHoneypot] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestDone, setSuggestDone] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const handleClearCache = async () => {
    if (
      !confirm(
        'Supprimer toutes les sourates téléchargées pour l’écoute hors-ligne sur cet appareil ?',
      )
    ) {
      return;
    }
    setClearing(true);
    setClearDone(false);
    try {
      await clearCache();
      setClearDone(true);
    } finally {
      setClearing(false);
    }
  };

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (suggesting) return;
    setSuggesting(true);
    setSuggestError(null);
    setSuggestDone(false);
    try {
      const result = await submitSuggestion({
        kind: suggestKind,
        message: suggestMessage,
        userId: user?.id ?? null,
        honeypot: suggestHoneypot,
      });
      if (!result.ok) {
        setSuggestError(result.message);
        return;
      }
      setSuggestDone(true);
      setSuggestMessage('');
    } finally {
      setSuggesting(false);
    }
  };

  const cacheLabel = cacheInfo
    ? cacheInfo.count > 0
      ? `${cacheInfo.count} fichier${cacheInfo.count > 1 ? 's' : ''} · ${cacheInfo.totalSizeMb.toFixed(1)} Mo`
      : 'Aucun téléchargement hors-ligne'
    : 'Calcul du cache…';

  return (
    <div className="flex flex-col gap-5 pb-8">
      <section className="glass-panel rounded-3xl border border-[#30455c]/60 p-5">
        <span className="brand-chip-cool inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest">
          Options
        </span>
        <h1 className="mt-3 text-lg font-black text-[#f6f8fb]">Préférences</h1>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#95a7ba]">
          Navbar, hors-ligne, confidentialité et suggestions.
        </p>
      </section>

      <Section
        icon={Settings}
        title="Navbar & barre de lecture"
        hint="Sur ordinateur : flottantes ensemble, ou pleine largeur ensemble."
      >
        <NavDesktopStyleToggle value={navDesktopStyle} onChange={onNavDesktopStyleChange} />
      </Section>

      <Section icon={HardDrive} title="Hors-ligne" hint="Cache audio sur cet appareil.">
        <div className="rounded-2xl border border-[#30455c]/55 bg-[#0f1928]/75 px-3.5 py-3.5">
          <p className="text-[13px] font-bold text-[#f6f8fb]">Stockage</p>
          <p className="mt-0.5 text-[11px] text-[#95a7ba]">{cacheLabel}</p>
          <button
            type="button"
            disabled={clearing || !cacheInfo || cacheInfo.count === 0}
            onClick={() => void handleClearCache()}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#f08c8c]/35 bg-[#f08c8c]/10 px-3.5 text-[12px] font-bold text-[#f2a3a3] transition-colors hover:bg-[#f08c8c]/16 disabled:cursor-not-allowed disabled:opacity-45 tap-feedback"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {clearing ? 'Suppression…' : 'Vider le cache audio'}
          </button>
          {clearDone ? (
            <p className="mt-2 text-[11px] text-[#4ade80]">Cache vidé.</p>
          ) : null}
        </div>
      </Section>

      <Section
        icon={Sparkles}
        title="Suggérer une idée"
        hint="Une amélioration ou une fonctionnalité à ajouter."
      >
        <form className="relative flex flex-col gap-3" onSubmit={(e) => void handleSubmitSuggestion(e)}>
          <div
            className="flex w-full items-center gap-1 rounded-full border border-[#30455c]/70 bg-[#0c1522]/90 p-1"
            role="group"
            aria-label="Type de suggestion"
          >
            {SUGGEST_KIND_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSuggestKind(opt.id);
                  setSuggestDone(false);
                }}
                aria-pressed={suggestKind === opt.id}
                className={`min-h-10 flex-1 rounded-full px-3 py-2 text-[12px] font-bold transition-colors ${
                  suggestKind === opt.id
                    ? 'bg-[#e2d0ba]/18 text-[#e6d5c2]'
                    : 'text-[#95a7ba] hover:text-[#e6edf5]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="sr-only">Votre suggestion</span>
            <textarea
              value={suggestMessage}
              onChange={(e) => {
                setSuggestMessage(e.target.value.slice(0, SUGGESTION_MAX_LENGTH));
                setSuggestDone(false);
                setSuggestError(null);
              }}
              rows={4}
              maxLength={SUGGESTION_MAX_LENGTH}
              placeholder={
                suggestKind === 'feature'
                  ? 'Décrivez la fonctionnalité que vous aimeriez…'
                  : 'Décrivez ce qui pourrait mieux marcher…'
              }
              className="w-full resize-none rounded-2xl border border-[#30455c]/55 bg-[#0c1522]/70 px-3.5 py-3 text-sm text-[#e6edf5] placeholder:text-[#8295aa] focus:border-[#bfa078]/45 focus:outline-none focus:ring-2 focus:ring-[#bfa078]/20"
            />
            <span className="mt-1 block text-right text-[10px] text-[#8899ad]">
              {suggestMessage.length}/{SUGGESTION_MAX_LENGTH}
            </span>
          </label>

          <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
            <label>
              Site web
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={suggestHoneypot}
                onChange={(e) => setSuggestHoneypot(e.target.value)}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={suggesting || suggestMessage.trim().length < SUGGESTION_MIN_LENGTH}
            className="brand-button-primary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-[13px] font-bold disabled:opacity-45 tap-feedback"
          >
            {suggesting ? 'Envoi…' : 'Envoyer'}
          </button>

          {suggestError ? (
            <p className="text-[11px] text-[#f2a3a3]">{suggestError}</p>
          ) : null}
          {suggestDone ? (
            <p className="text-[11px] text-[#4ade80]">Merci, votre suggestion a bien été envoyée.</p>
          ) : null}
          <p className="text-[10px] leading-snug text-[#6d8298]">
            Le message est envoyé à l’équipe Sawra. Compte facultatif.
          </p>
        </form>
      </Section>

      <Section
        icon={Shield}
        title="Confidentialité"
        hint="Analytics, PWA et pages légales."
      >
        <ToggleRow
          label="Refuser les analytics"
          hint="Désactive PostHog (usage produit) sur cet appareil. Pas Vercel Analytics."
          pressed={appOpts.analyticsOptOut}
          onToggle={() => setAppOpts({ analyticsOptOut: !appOpts.analyticsOptOut })}
        />
        <ToggleRow
          label="Suggestion d’installation PWA"
          hint="Bannière sur l’accueil (iOS / Android)."
          pressed={appOpts.showPwaInstallSuggest}
          onToggle={() =>
            setAppOpts({ showPwaInstallSuggest: !appOpts.showPwaInstallSuggest })
          }
        />
        <div className="flex flex-wrap gap-2 pt-1">
          {(
            [
              { href: '/privacy', label: 'Confidentialité' },
              { href: '/terms', label: 'Conditions' },
              { href: '/sources', label: 'Sources' },
            ] as const
          ).map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex min-h-9 items-center rounded-full border border-[#30455c]/60 bg-[#0c1522]/80 px-3 text-[11px] font-semibold text-[#95a7ba] hover:border-[#bfa078]/35 hover:text-[#e6d5c2] tap-feedback"
            >
              {link.label}
            </a>
          ))}
        </div>
      </Section>

      <p className="flex items-center justify-center gap-2 text-center text-[10px] text-[#6d8298]">
        <Smartphone className="h-3 w-3" aria-hidden />
        Réglages locaux sur cet appareil
      </p>
    </div>
  );
};
