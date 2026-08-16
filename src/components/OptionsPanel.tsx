'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Gauge,
  HardDrive,
  Headphones,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  Trash2,
} from '../icons/motion';
import { useAudio } from '../context/AudioContext';
import { useAppOptions } from '../utils/appOptions';
import {
  READER_FONT_SCALES,
  useReaderPrefs,
  type ReaderFontScale,
} from './reader/readerPrefs';
import {
  type PlayerBarDensity,
  type SeekStepSeconds,
} from './player/playerV2Prefs';
import { PLAYER_THEME_IDS, PLAYER_THEMES, type PlayerThemeId } from './player/playerThemes';
import { NavDesktopStyleToggle } from './NavDesktopStyleToggle';
import type { NavDesktopStyle } from '../utils/navDesktopStyle';
import {
  LEARN_SPEEDS,
  loadLearnPrefs,
  saveLearnPrefs,
  type LearnPrefs,
  type LearnSpeed,
} from '../utils/learnPrefs';
import {
  LEARN_REPEAT_COUNTS as REPEAT_COUNTS,
  clampLearnWindowSize,
  type LearnRepeatCount,
} from '../utils/learnSession';

type OptionsPanelProps = {
  navDesktopStyle: NavDesktopStyle;
  onNavDesktopStyleChange: (style: NavDesktopStyle) => void;
};

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;
const DENSITY_OPTIONS: { id: PlayerBarDensity; label: string }[] = [
  { id: 'compact', label: 'Compact' },
  { id: 'comfortable', label: 'Confort' },
  { id: 'expanded', label: 'Élargi' },
];
const SEEK_OPTIONS: SeekStepSeconds[] = [5, 10, 15];

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

function ChipGroup<T extends string | number>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#30455c]/55 bg-[#0f1928]/75 px-3.5 py-3.5">
      <p className="text-[13px] font-bold text-[#f6f8fb]">{label}</p>
      {hint ? <p className="mt-0.5 text-[11px] leading-snug text-[#95a7ba]">{hint}</p> : null}
      <div
        className="mt-3 flex flex-wrap gap-1.5"
        role="group"
        aria-label={label}
      >
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={`min-h-9 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors ${
              value === opt.value
                ? 'border-[#bfa078]/45 bg-[#e2d0ba]/18 text-[#e6d5c2]'
                : 'border-[#30455c]/70 bg-[#0c1522]/80 text-[#95a7ba] hover:text-[#e6edf5]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({
  navDesktopStyle,
  onNavDesktopStyleChange,
}) => {
  const router = useRouter();
  const {
    playbackSpeed,
    setPlaybackSpeed,
    repeatMode,
    setRepeatMode,
    playerTheme,
    setPlayerTheme,
    playerV2Prefs,
    setPlayerV2Prefs,
    cacheInfo,
    clearCache,
  } = useAudio();
  const [readerPrefs, setReaderPrefs] = useReaderPrefs();
  const [appOpts, setAppOpts] = useAppOptions();
  const [learnPrefs, setLearnPrefsState] = useState<LearnPrefs>(() => loadLearnPrefs());
  const [clearing, setClearing] = useState(false);
  const [clearDone, setClearDone] = useState(false);

  const updateLearn = (partial: Partial<LearnPrefs>) => {
    setLearnPrefsState((prev) => {
      const next = { ...prev, ...partial };
      saveLearnPrefs(next);
      return next;
    });
  };

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
          Apparence, lecture, texte, apprendre, hors-ligne et confidentialité — enregistrés sur cet
          appareil.
        </p>
      </section>

      <Section
        icon={Settings}
        title="Apparence"
        hint="Chrome desktop, barre de lecture et thème."
      >
        <NavDesktopStyleToggle value={navDesktopStyle} onChange={onNavDesktopStyleChange} />
        <ChipGroup
          label="Densité de la barre"
          hint="Change clairement la taille du lecteur (jaquette, boutons, marges) sur mobile et ordinateur."
          value={playerV2Prefs.density}
          options={DENSITY_OPTIONS.map((d) => ({ value: d.id, label: d.label }))}
          onChange={(density) => setPlayerV2Prefs((p) => ({ ...p, density }))}
        />
        <ChipGroup
          label="Thème du lecteur"
          value={playerTheme as PlayerThemeId}
          options={PLAYER_THEME_IDS.map((id) => ({
            value: id,
            label: PLAYER_THEMES[id].name,
          }))}
          onChange={(theme) => setPlayerTheme(theme)}
        />
        <ToggleRow
          label="Halo / glow du lecteur"
          pressed={playerV2Prefs.showGlow}
          onToggle={() => setPlayerV2Prefs((p) => ({ ...p, showGlow: !p.showGlow }))}
        />
        <ToggleRow
          label="Contrôles rapides"
          hint="Boutons secondaires sur la barre (vitesse, etc.)."
          pressed={playerV2Prefs.showQuickControls}
          onToggle={() =>
            setPlayerV2Prefs((p) => ({ ...p, showQuickControls: !p.showQuickControls }))
          }
        />
        <ToggleRow
          label="Volume toujours visible"
          pressed={playerV2Prefs.alwaysShowVolume}
          onToggle={() =>
            setPlayerV2Prefs((p) => ({ ...p, alwaysShowVolume: !p.alwaysShowVolume }))
          }
        />
        <ToggleRow
          label="Réduire les animations"
          hint="Moins de motion dans l’interface."
          pressed={appOpts.reduceMotion}
          onToggle={() => setAppOpts({ reduceMotion: !appOpts.reduceMotion })}
        />
        <ToggleRow
          label="Contraste renforcé"
          pressed={appOpts.highContrast}
          onToggle={() => setAppOpts({ highContrast: !appOpts.highContrast })}
        />
      </Section>

      <Section icon={Headphones} title="Lecture" hint="Comportement audio et reprise.">
        <ChipGroup
          label="Vitesse"
          value={playbackSpeed}
          options={SPEED_OPTIONS.map((s) => ({
            value: s,
            label: s === 1 ? '1×' : `${s}×`,
          }))}
          onChange={(speed) => setPlaybackSpeed(speed)}
        />
        <ChipGroup
          label="Pas de seek"
          hint="Reculer / avancer depuis le lecteur."
          value={playerV2Prefs.seekStep}
          options={SEEK_OPTIONS.map((s) => ({ value: s, label: `${s} s` }))}
          onChange={(seekStep) => setPlayerV2Prefs((p) => ({ ...p, seekStep }))}
        />
        <ChipGroup
          label="Fin de sourate"
          hint="Que faire quand une sourate se termine."
          value={repeatMode === 'one' ? 'one' : repeatMode === 'all' ? 'all' : 'none'}
          options={[
            { value: 'none' as const, label: 'S’arrêter' },
            { value: 'all' as const, label: 'Sourate suivante' },
            { value: 'one' as const, label: 'Boucler' },
          ]}
          onChange={(mode) => setRepeatMode(mode)}
        />
        <ToggleRow
          label="Reprendre au lancement"
          hint="Relance automatiquement la dernière écoute (peut être bloqué par le navigateur)."
          pressed={appOpts.autoResumeOnLaunch}
          onToggle={() => setAppOpts({ autoResumeOnLaunch: !appOpts.autoResumeOnLaunch })}
        />
        <ToggleRow
          label="Garder l’écran allumé"
          hint="Pendant la lecture (Wake Lock, si supporté)."
          pressed={appOpts.wakeLockWhilePlaying}
          onToggle={() =>
            setAppOpts({ wakeLockWhilePlaying: !appOpts.wakeLockWhilePlaying })
          }
        />
      </Section>

      <Section icon={BookOpen} title="Texte" hint="Lecteur de sourate synchronisé.">
        <ChipGroup
          label="Taille du texte"
          value={readerPrefs.fontScale}
          options={READER_FONT_SCALES.map((scale) => ({
            value: scale,
            label: scale === 1 ? 'Normal' : `${scale}×`,
          }))}
          onChange={(fontScale) => setReaderPrefs({ fontScale: fontScale as ReaderFontScale })}
        />
        <ToggleRow
          label="Arabe"
          pressed={readerPrefs.showArabic}
          onToggle={() => setReaderPrefs({ showArabic: !readerPrefs.showArabic })}
        />
        <ToggleRow
          label="Français"
          pressed={readerPrefs.showFrench}
          onToggle={() => setReaderPrefs({ showFrench: !readerPrefs.showFrench })}
        />
        <ToggleRow
          label="Phonétique"
          pressed={readerPrefs.showPhonetic}
          onToggle={() => setReaderPrefs({ showPhonetic: !readerPrefs.showPhonetic })}
        />
        <ToggleRow
          label="Ouvrir le lecteur à la lecture"
          pressed={readerPrefs.autoOpenOnPlay}
          onToggle={() => setReaderPrefs({ autoOpenOnPlay: !readerPrefs.autoOpenOnPlay })}
        />
        <ToggleRow
          label="Surlignage du verset"
          hint="Suit l’audio quand les timings existent."
          pressed={readerPrefs.syncHighlight}
          onToggle={() => setReaderPrefs({ syncHighlight: !readerPrefs.syncHighlight })}
        />
      </Section>

      <Section icon={Sparkles} title="Apprendre" hint="Réglages par défaut du mode Apprendre.">
        <ChipGroup
          label="Fenêtre (versets)"
          value={learnPrefs.windowSize}
          options={[1, 2, 3, 5, 7, 10].map((n) => ({ value: n, label: String(n) }))}
          onChange={(windowSize) =>
            updateLearn({ windowSize: clampLearnWindowSize(windowSize) })
          }
        />
        <ChipGroup
          label="Répétitions"
          value={learnPrefs.repeats}
          options={REPEAT_COUNTS.map((n) => ({
            value: n,
            label: n === 0 ? '∞' : `${n}×`,
          }))}
          onChange={(repeats) => updateLearn({ repeats: repeats as LearnRepeatCount })}
        />
        <ChipGroup
          label="Vitesse Apprendre"
          value={learnPrefs.speed}
          options={LEARN_SPEEDS.map((s) => ({
            value: s,
            label: s === 1 ? '1×' : `${s}×`,
          }))}
          onChange={(speed) => updateLearn({ speed: speed as LearnSpeed })}
        />
        <ToggleRow
          label="Avancer automatiquement"
          pressed={learnPrefs.autoAdvance}
          onToggle={() => updateLearn({ autoAdvance: !learnPrefs.autoAdvance })}
        />
        <ToggleRow
          label="Phonétique (Apprendre)"
          pressed={learnPrefs.showPhonetic}
          onToggle={() => updateLearn({ showPhonetic: !learnPrefs.showPhonetic })}
        />
        <ToggleRow
          label="Français (Apprendre)"
          pressed={learnPrefs.showFr}
          onToggle={() => updateLearn({ showFr: !learnPrefs.showFr })}
        />
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
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey ||
                  event.button !== 0
                ) {
                  return;
                }
                event.preventDefault();
                router.push(link.href);
              }}
              className="inline-flex min-h-9 items-center rounded-full border border-[#30455c]/60 bg-[#0c1522]/80 px-3 text-[11px] font-semibold text-[#95a7ba] hover:border-[#bfa078]/35 hover:text-[#e6d5c2] tap-feedback"
            >
              {link.label}
            </a>
          ))}
        </div>
      </Section>

      <p className="flex items-center justify-center gap-2 text-center text-[10px] text-[#6d8298]">
        <Smartphone className="h-3 w-3" aria-hidden />
        <Gauge className="h-3 w-3" aria-hidden />
        Réglages locaux · sync cloud si compte connecté (volume, thème, boucle…)
      </p>
    </div>
  );
};
