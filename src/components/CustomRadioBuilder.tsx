import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Link2,
  Plus,
  Share,
  Shuffle,
  Sparkles,
  X,
} from '../icons/motion';
import { SURAHS } from '../data/surahs';
import type { Reciter } from '../types';
import { ReciterPortrait } from './ReciterPortrait';
import {
  CUSTOM_RADIO_MAX_RECITERS,
  CUSTOM_RADIO_MAX_SURAHS,
  SURAH_PACKS,
  customRadioShareLabel,
  customRadioShareUrl,
  normalizeCustomRadio,
  type CustomRadioConfig,
} from '../utils/customRadio';
import { buildCustomRadioSocialMeta } from '../utils/customRadioShare';
import { capturePostHogEvent } from '../utils/posthog';
import { copyTextToClipboard } from '../utils/clipboard';

const SUGGESTED_RECITER_IDS = [123, 54, 20, 86, 102, 92, 30, 31, 118, 112];

type CustomRadioBuilderProps = {
  reciters: Reciter[];
  initial?: CustomRadioConfig | null;
  starting?: boolean;
  onClose: () => void;
  onPlay: (config: CustomRadioConfig) => void;
};

export const CustomRadioBuilder: React.FC<CustomRadioBuilderProps> = ({
  reciters,
  initial = null,
  starting = false,
  onClose,
  onPlay,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState(initial?.name ?? 'Ma radio Sawra');
  const [reciterIds, setReciterIds] = useState<number[]>(initial?.reciterIds ?? []);
  const [surahIds, setSurahIds] = useState<number[]>(initial?.surahIds ?? []);
  const [shuffle, setShuffle] = useState(initial?.shuffle ?? true);
  const [reciterSearch, setReciterSearch] = useState('');
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const suggestedReciters = useMemo(() => {
    const byId = new Map(reciters.map((r) => [r.id, r]));
    const picked = SUGGESTED_RECITER_IDS.map((id) => byId.get(id)).filter(
      (r): r is Reciter => Boolean(r),
    );
    const rest = reciters.filter((r) => !SUGGESTED_RECITER_IDS.includes(r.id));
    return [...picked, ...rest];
  }, [reciters]);

  const filteredReciters = useMemo(() => {
    const q = reciterSearch.trim().toLowerCase();
    if (!q) return suggestedReciters.slice(0, 24);
    return suggestedReciters
      .filter((r) => r.name.toLowerCase().includes(q))
      .slice(0, 24);
  }, [reciterSearch, suggestedReciters]);

  const config = useMemo(
    () =>
      normalizeCustomRadio({
        name,
        reciterIds,
        surahIds,
        shuffle,
      }),
    [name, reciterIds, surahIds, shuffle],
  );

  const toggleReciter = (id: number) => {
    setReciterIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= CUSTOM_RADIO_MAX_RECITERS) return prev;
      return [...prev, id];
    });
  };

  const toggleSurah = (id: number) => {
    setSurahIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= CUSTOM_RADIO_MAX_SURAHS) return prev;
      return [...prev, id].sort((a, b) => a - b);
    });
  };

  const applyPack = (ids: number[]) => {
    setSurahIds((prev) => {
      const merged = [...new Set([...prev, ...ids])].sort((a, b) => a - b);
      return merged.slice(0, CUSTOM_RADIO_MAX_SURAHS);
    });
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sawra.app';
  const shareUrl = config ? customRadioShareUrl(config, origin) : '';
  const shareLabel = config ? customRadioShareLabel(config, origin) : '';

  const handleShare = async () => {
    if (!config || !shareUrl) return;
    const { title, shareText } = buildCustomRadioSocialMeta(config);
    capturePostHogEvent('custom_radio_share', {
      reciters: config.reciterIds.length,
      surahs: config.surahIds.length,
    });
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
        setShareFeedback('Partagé');
        return;
      }
    } catch {
      /* user cancelled or share failed — fall through to copy */
    }
    const ok = await copyTextToClipboard(shareUrl);
    setShareFeedback(ok ? 'Lien copié' : 'Impossible de copier');
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    const ok = await copyTextToClipboard(shareUrl);
    setShareFeedback(ok ? 'Lien copié ✓' : 'Impossible de copier');
    if (ok) {
      capturePostHogEvent('custom_radio_copy_link', {
        reciters: config?.reciterIds.length ?? 0,
        surahs: config?.surahIds.length ?? 0,
      });
    }
  };

  const handlePlay = async (alsoCopy: boolean) => {
    if (!config) return;
    if (alsoCopy && shareUrl) {
      const ok = await copyTextToClipboard(shareUrl);
      setShareFeedback(ok ? 'Lien copié — lancement…' : null);
    }
    capturePostHogEvent('custom_radio_play', {
      reciters: config.reciterIds.length,
      surahs: config.surahIds.length,
      copied: alsoCopy,
    });
    onPlay(config);
  };

  return (
    <div className="custom-radio" role="dialog" aria-modal="true" aria-labelledby="custom-radio-title">
      <div className="custom-radio__panel">
        <header className="custom-radio__header">
          <button
            type="button"
            className="custom-radio__icon-btn tap-feedback"
            onClick={() => {
              if (step === 1) onClose();
              else setStep((s) => (s - 1) as 1 | 2 | 3);
            }}
            aria-label={step === 1 ? 'Fermer' : 'Étape précédente'}
          >
            {step === 1 ? <X className="h-4.5 w-4.5" /> : <ArrowLeft className="h-4.5 w-4.5" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="custom-radio__eyebrow">
              <Sparkles className="h-3 w-3" aria-hidden />
              Radio perso
            </p>
            <h2 id="custom-radio-title" className="custom-radio__title">
              {step === 1 && 'Choisissez vos voix'}
              {step === 2 && 'Composez la playlist'}
              {step === 3 && 'Nommez & partagez'}
            </h2>
          </div>
          <span className="custom-radio__step">{step}/3</span>
        </header>

        {step === 1 && (
          <div className="custom-radio__body">
            <p className="custom-radio__hint">
              Jusqu’à {CUSTOM_RADIO_MAX_RECITERS} récitateurs — Sawra alterne les voix sur votre playlist.
            </p>
            <input
              type="search"
              value={reciterSearch}
              onChange={(e) => setReciterSearch(e.target.value)}
              placeholder="Rechercher un récitateur…"
              className="custom-radio__search"
            />
            <div className="custom-radio__reciters">
              {filteredReciters.map((reciter) => {
                const selected = reciterIds.includes(reciter.id);
                return (
                  <button
                    key={reciter.id}
                    type="button"
                    onClick={() => toggleReciter(reciter.id)}
                    className={`custom-radio__reciter tap-feedback ${selected ? 'is-selected' : ''}`}
                    aria-pressed={selected}
                  >
                    <span className="custom-radio__reciter-avatar">
                      <ReciterPortrait reciter={reciter} alt="" width={44} height={44} />
                      {selected ? (
                        <span className="custom-radio__check" aria-hidden>
                          <Check className="h-3 w-3" />
                        </span>
                      ) : null}
                    </span>
                    <span className="custom-radio__reciter-name">{reciter.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="custom-radio__body">
            <p className="custom-radio__hint">
              Jusqu’à {CUSTOM_RADIO_MAX_SURAHS} sourates · {surahIds.length} sélectionnée
              {surahIds.length > 1 ? 's' : ''}
            </p>
            <div className="custom-radio__packs">
              {SURAH_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  className="custom-radio__pack tap-feedback"
                  onClick={() => applyPack(pack.surahIds)}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {pack.label}
                </button>
              ))}
              <button
                type="button"
                className="custom-radio__pack is-muted tap-feedback"
                onClick={() => setSurahIds([])}
              >
                Tout retirer
              </button>
            </div>
            <div className="custom-radio__surahs">
              {SURAHS.map((surah) => {
                const selected = surahIds.includes(surah.id);
                return (
                  <button
                    key={surah.id}
                    type="button"
                    onClick={() => toggleSurah(surah.id)}
                    className={`custom-radio__surah tap-feedback ${selected ? 'is-selected' : ''}`}
                    aria-pressed={selected}
                  >
                    <span className="custom-radio__surah-id">{surah.id}</span>
                    <span className="custom-radio__surah-name">{surah.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="custom-radio__body custom-radio__body--summary">
            <label className="custom-radio__field">
              <span>Nom de la radio</span>
              <input
                type="text"
                value={name}
                maxLength={48}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ma radio Sawra"
              />
            </label>

            <button
              type="button"
              className={`custom-radio__shuffle tap-feedback ${shuffle ? 'is-on' : ''}`}
              onClick={() => setShuffle((v) => !v)}
              aria-pressed={shuffle}
            >
              <Shuffle className="h-4 w-4" aria-hidden />
              {shuffle ? 'Lecture aléatoire activée' : 'Ordre des sourates (croissant)'}
            </button>

            <button
              type="button"
              className="custom-radio__summary custom-radio__summary--copy tap-feedback"
              onClick={() => void handleCopy()}
              aria-label="Copier le lien de partage"
            >
              <p>
                <strong>{reciterIds.length}</strong> voix · <strong>{surahIds.length}</strong> sourates
              </p>
              <p className="custom-radio__summary-url" title={shareUrl}>
                <Link2 className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                <span className="truncate">{shareLabel}</span>
                <Copy className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              </p>
              <span className="custom-radio__summary-hint">Appuyer pour copier le lien</span>
            </button>

            <div className="custom-radio__share-row">
              <button type="button" className="custom-radio__share-btn tap-feedback" onClick={() => void handleShare()}>
                <Share className="h-4 w-4" aria-hidden />
                Partager
              </button>
              <button type="button" className="custom-radio__share-btn is-ghost tap-feedback" onClick={() => void handleCopy()}>
                <Copy className="h-4 w-4" aria-hidden />
                {shareFeedback?.startsWith('Lien copié') ? 'Copié ✓' : 'Copier le lien'}
              </button>
            </div>
            {shareFeedback ? <p className="custom-radio__feedback">{shareFeedback}</p> : null}
          </div>
        )}

        <footer className="custom-radio__footer">
          {step === 1 ? (
            <button type="button" className="custom-radio__secondary tap-feedback" onClick={onClose}>
              Annuler
            </button>
          ) : (
            <button
              type="button"
              className="custom-radio__secondary tap-feedback"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
            >
              Retour
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              className="custom-radio__primary tap-feedback"
              disabled={step === 1 ? reciterIds.length === 0 : surahIds.length === 0}
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
            >
              Continuer
            </button>
          ) : (
            <button
              type="button"
              className="custom-radio__primary tap-feedback"
              disabled={!config || starting}
              onClick={() => void handlePlay(true)}
            >
              {starting ? 'Lancement…' : 'Copier le lien & lancer'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
