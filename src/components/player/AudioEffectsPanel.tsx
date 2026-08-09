import React, { useEffect, useRef } from 'react';
import { Waves, RotateCcw, SlidersHorizontal } from '../../icons/motion';
import {
  AUDIO_EFFECT_PRESETS,
  DEFAULT_AUDIO_EFFECTS,
  type AudioEffectPresetId,
  type AudioEffectsSettings,
} from '../../audio/effectsTypes';

type ThemeBits = {
  accentText: string;
  accentBgLight: string;
  accentBorderActive: string;
  sliderAccentColor: string;
};

type Props = {
  effects: AudioEffectsSettings;
  supported: boolean;
  theme: ThemeBits;
  onChange: (next: AudioEffectsSettings) => void;
};

const EffectSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  accent: string;
  onChange: (v: number) => void;
  onInteract: () => void;
}> = ({ label, value, min, max, step, display, accent, onChange, onInteract }) => (
  <label className="block">
    <div className="mb-0 flex items-end justify-between gap-2 leading-none">
      <span className="text-xs font-semibold text-[#d0d9e3]">{label}</span>
      <span className="text-[11px] font-mono tabular-nums text-[#95a7ba]">{display}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onPointerDown={onInteract}
      onChange={(e) => {
        onInteract();
        onChange(parseFloat(e.target.value));
      }}
      className="effect-slider mt-px w-full cursor-pointer"
      style={{ ['--effect-thumb' as string]: accent, accentColor: accent }}
    />
  </label>
);

export const AudioEffectsPanel: React.FC<Props> = ({ effects, supported, theme, onChange }) => {
  const customBtnRef = useRef<HTMLButtonElement | null>(null);
  const shouldFocusCustomRef = useRef(false);

  useEffect(() => {
    if (!shouldFocusCustomRef.current || effects.preset !== 'custom') return;
    shouldFocusCustomRef.current = false;
    const btn = customBtnRef.current;
    if (!btn) return;
    btn.focus({ preventScroll: true });
    btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [effects.preset, effects.bass, effects.treble, effects.echo, effects.reverb]);

  const applyPreset = (id: AudioEffectPresetId) => {
    if (id === 'custom') {
      onChange({
        ...effects,
        preset: 'custom',
        enabled: true,
      });
      return;
    }
    const preset = AUDIO_EFFECT_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    onChange({ ...preset.settings, preset: id });
  };

  const focusCustomFromDrag = () => {
    shouldFocusCustomRef.current = true;
    if (effects.preset !== 'custom' || !effects.enabled) {
      onChange({
        ...effects,
        preset: 'custom',
        enabled: true,
      });
    } else {
      // Already custom — still focus the button
      customBtnRef.current?.focus({ preventScroll: true });
    }
  };

  const patch = (partial: Partial<AudioEffectsSettings>) => {
    shouldFocusCustomRef.current = true;
    onChange({
      ...effects,
      ...partial,
      preset: 'custom',
      enabled: true,
    });
  };

  const reset = () => onChange({ ...DEFAULT_AUDIO_EFFECTS });

  if (!supported) {
    return (
      <p className="text-xs text-[#95a7ba] leading-relaxed">
        Les effets audio ne sont pas disponibles sur ce navigateur.
      </p>
    );
  }

  const customActive = effects.preset === 'custom';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${theme.accentBgLight} ${theme.accentText}`}>
            <Waves className="w-4 h-4" />
          </span>
          <p className="text-[11px] leading-snug text-[#95a7ba]">
            Reverb, écho, basses &amp; clarté
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="h-9 px-2.5 rounded-xl border border-[#30455c] text-[11px] font-bold text-[#aab7c5] flex items-center gap-1.5 shrink-0"
          title="Réinitialiser"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {AUDIO_EFFECT_PRESETS.map((preset) => {
          const active = effects.preset === preset.id || (preset.id === 'off' && !effects.enabled && !customActive);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={`rounded-xl border px-1.5 py-2.5 text-center transition-[opacity,filter,border-color,background-color] duration-200 tap-feedback ${
                active
                  ? `${theme.accentBgLight} ${theme.accentBorderActive}`
                  : 'border-[#30455c]/70 bg-[#111d2d]/25 opacity-[0.48] hover:opacity-75'
              }`}
              title={preset.description}
              aria-pressed={active}
            >
              <span className={`block text-[11px] font-bold ${active ? theme.accentText : 'text-[#9aabbc]'}`}>
                {preset.label}
              </span>
              <span className={`block text-[9px] mt-0.5 leading-tight ${active ? 'text-[#8092a6]' : 'text-[#657687]'}`}>
                {preset.description}
              </span>
            </button>
          );
        })}

        <button
          ref={customBtnRef}
          type="button"
          onClick={() => applyPreset('custom')}
          className={`rounded-xl border-2 px-1.5 py-2.5 text-center transition-[opacity,filter,border-color,background-color,box-shadow] duration-200 tap-feedback outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111d] ${
            customActive
              ? `${theme.accentBgLight} ${theme.accentBorderActive}`
              : 'border-dashed border-[#c9a06a]/35 bg-[#e4ccb4]/[0.04] opacity-[0.48] hover:opacity-75'
          }`}
          style={
            customActive
              ? { boxShadow: `0 0 0 1px ${theme.sliderAccentColor}66, 0 0 18px ${theme.sliderAccentColor}28` }
              : { boxShadow: 'inset 0 1px 0 rgba(240,209,188,0.05)' }
          }
          title="Réglages manuels"
          aria-pressed={customActive}
        >
          <span className={`flex items-center justify-center gap-1 text-[11px] font-black ${customActive ? theme.accentText : 'text-[#a89a88]'}`}>
            <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={2.4} />
            Perso
          </span>
          <span className={`block text-[9px] mt-0.5 leading-tight ${customActive ? 'text-[#b8a08a]' : 'text-[#6f6558]'}`}>
            Personnalisé
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <EffectSlider
          label="Basses"
          value={effects.bass}
          min={-12}
          max={12}
          step={0.5}
          display={`${effects.bass > 0 ? '+' : ''}${effects.bass.toFixed(1)} dB`}
          accent={theme.sliderAccentColor}
          onInteract={focusCustomFromDrag}
          onChange={(bass) => patch({ bass })}
        />
        <EffectSlider
          label="Aigus"
          value={effects.treble}
          min={-12}
          max={12}
          step={0.5}
          display={`${effects.treble > 0 ? '+' : ''}${effects.treble.toFixed(1)} dB`}
          accent={theme.sliderAccentColor}
          onInteract={focusCustomFromDrag}
          onChange={(treble) => patch({ treble })}
        />
        <EffectSlider
          label="Écho"
          value={effects.echo}
          min={0}
          max={1}
          step={0.01}
          display={`${Math.round(effects.echo * 100)}%`}
          accent={theme.sliderAccentColor}
          onInteract={focusCustomFromDrag}
          onChange={(echo) => patch({ echo })}
        />
        <EffectSlider
          label="Reverb"
          value={effects.reverb}
          min={0}
          max={1}
          step={0.01}
          display={`${Math.round(effects.reverb * 100)}%`}
          accent={theme.sliderAccentColor}
          onInteract={focusCustomFromDrag}
          onChange={(reverb) => patch({ reverb })}
        />
      </div>

      {!effects.enabled && (
        <p className="text-[11px] text-[#8092a6] leading-relaxed">
          Choisis un preset ou bouge un curseur pour activer le traitement audio.
        </p>
      )}
    </div>
  );
};
