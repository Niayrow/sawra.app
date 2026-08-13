import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { useLearnLoop } from '../hooks/useLearnLoop';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useQuranText } from '../hooks/useQuranText';
import { useTimingCatalogReady } from './AyahSyncBadge';
import { ReciterPortrait } from './ReciterPortrait';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BookOpen,
  Eye,
  EyeOff,
  Pause,
  Play,
  RefreshCw,
  Search,
  Settings,
  WifiOff,
} from '../icons/motion';
import type { Moshaf, Reciter, Surah } from '../types';
import { ensureTimingCatalog } from '../utils/ayahTiming';
import {
  clampLearnWindowSize,
  getLearnEligibleReciters,
  getLearnMoshaf,
  getLearnSurahsForReciter,
  LEARN_REPEAT_COUNTS,
  LEARN_WINDOW_SIZE_MAX,
  LEARN_WINDOW_SIZE_MIN,
  type LearnRepeatCount,
} from '../utils/learnSession';
import {
  LEARN_SPEEDS,
  loadLearnPrefs,
  saveLearnPrefs,
  type LearnSpeed,
} from '../utils/learnPrefs';
import { JUZ_AMMA_START } from '../utils/quizQuestions';
import { scoreSurahMatch } from '../utils/surahSearch';

type LearnSurahFilter = 'all' | 'amma' | 'popular';

/** Sourates souvent apprises en premier */
const LEARN_POPULAR_SURAH_IDS = [1, 36, 55, 67, 78, 112, 113, 114] as const;

type LearnPageProps = {
  onBack: () => void;
  onListenSurah: (reciter: Reciter, moshaf: Moshaf, surah: Surah) => void;
};

const SWIPE_TOGGLE_PX = 56;

export const LearnPage: React.FC<LearnPageProps> = ({ onBack, onListenSurah }) => {
  const { reciters, pause } = useAudio();
  const isOnline = useOnlineStatus();
  const timingCatalogReady = useTimingCatalogReady();
  const initialPrefs = useMemo(() => loadLearnPrefs(), []);
  const loop = useLearnLoop({
    onBeforePlay: pause,
    initialAutoAdvance: initialPrefs.autoAdvance,
    initialSpeed: initialPrefs.speed,
  });

  const [reciterId, setReciterId] = useState<number | null>(initialPrefs.reciterId);
  const [surahId, setSurahId] = useState<number | null>(initialPrefs.surahId);
  const [surahQuery, setSurahQuery] = useState('');
  const [surahFilter, setSurahFilter] = useState<LearnSurahFilter>('amma');
  const [windowSize, setWindowSize] = useState(initialPrefs.windowSize);
  const [repeats, setRepeats] = useState<LearnRepeatCount>(initialPrefs.repeats);
  const [showPhonetic, setShowPhonetic] = useState(initialPrefs.showPhonetic);
  const [showFr, setShowFr] = useState(initialPrefs.showFr);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voicesOpen, setVoicesOpen] = useState(false);
  const focusRef = useRef<HTMLDivElement | null>(null);

  const eligible = useMemo(() => {
    if (!timingCatalogReady) return [];
    return getLearnEligibleReciters(reciters);
  }, [reciters, timingCatalogReady]);

  const selectedReciter = useMemo(
    () => eligible.find((r) => r.id === reciterId) ?? null,
    [eligible, reciterId],
  );

  const availableSurahs = useMemo(
    () => (selectedReciter ? getLearnSurahsForReciter(selectedReciter) : []),
    [selectedReciter],
  );

  const selectedSurah = useMemo(
    () => availableSurahs.find((s) => s.id === surahId) ?? null,
    [availableSurahs, surahId],
  );

  const filteredSurahs = useMemo(() => {
    const q = surahQuery.trim();
    let list = availableSurahs;
    if (surahFilter === 'amma') {
      list = list.filter((s) => s.id >= JUZ_AMMA_START);
    } else if (surahFilter === 'popular') {
      const popular = new Set<number>(LEARN_POPULAR_SURAH_IDS);
      list = list.filter((s) => popular.has(s.id));
    }
    if (!q) return list;
    return [...list]
      .map((s) => ({ s, score: scoreSurahMatch(s, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.s.id - b.s.id)
      .map((x) => x.s);
  }, [availableSurahs, surahFilter, surahQuery]);

  useEffect(() => {
    if (!availableSurahs.length) {
      setSurahId(null);
      return;
    }
    if (surahId != null && availableSurahs.some((s) => s.id === surahId)) return;
    const preferred =
      filteredSurahs[0] ??
      availableSurahs.find((s) => s.id >= JUZ_AMMA_START) ??
      availableSurahs[0];
    setSurahId(preferred.id);
  }, [availableSurahs, filteredSurahs, surahId]);

  const { ayahs, loading: textLoading, error: textError } = useQuranText(
    loop.config?.surah.id ?? selectedSurah?.id ?? null,
  );

  const maxWindow = Math.max(
    LEARN_WINDOW_SIZE_MIN,
    Math.min(LEARN_WINDOW_SIZE_MAX, ayahs.length || loop.timings.length || LEARN_WINDOW_SIZE_MAX),
  );

  useEffect(() => {
    void ensureTimingCatalog().catch(() => {});
  }, []);

  useEffect(() => {
    saveLearnPrefs({
      reciterId,
      surahId,
      windowSize,
      repeats,
      showPhonetic,
      showFr,
      autoAdvance: loop.autoAdvance,
      speed: loop.speed,
    });
  }, [
    loop.autoAdvance,
    loop.speed,
    reciterId,
    repeats,
    showFr,
    showPhonetic,
    surahId,
    windowSize,
  ]);

  useEffect(() => {
    if (!eligible.length) return;
    if (reciterId != null && eligible.some((r) => r.id === reciterId)) return;
    setReciterId(eligible[0].id);
  }, [eligible, reciterId]);

  useEffect(() => {
    return () => {
      loop.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loop.ayahWindow) return;
    focusRef.current?.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    });
  }, [loop.ayahWindow?.startAyah, loop.ayahWindow?.endAyah]);

  const canStart =
    isOnline &&
    timingCatalogReady &&
    eligible.length > 0 &&
    selectedReciter != null &&
    selectedSurah != null;

  const handleStart = () => {
    if (!selectedReciter || !selectedSurah) return;
    const moshaf = getLearnMoshaf(selectedReciter);
    if (!moshaf) return;
    void loop.start({
      reciter: selectedReciter,
      moshaf,
      surah: selectedSurah,
      windowSize: clampLearnWindowSize(windowSize, maxWindow),
      repeats,
    });
  };

  const goBack = () => {
    if (
      loop.phase !== 'idle' &&
      loop.phase !== 'error' &&
      loop.phase !== 'done'
    ) {
      loop.reset();
      return;
    }
    loop.reset();
    onBack();
  };

  const handleListenFullSurah = () => {
    if (!loop.config) return;
    const { reciter, moshaf, surah } = loop.config;
    loop.reset();
    onListenSurah(reciter, moshaf, surah);
  };

  const inSession =
    loop.phase === 'idle_surah' ||
    loop.phase === 'listening' ||
    loop.phase === 'ready';

  const allAyahNumbers = useMemo(() => ayahs.map((a) => a.number), [ayahs]);
  const swipeRef = useRef<{ x: number; y: number; id: number } | null>(null);

  const canGoPrev = Boolean(
    loop.ayahWindow &&
      loop.timings.some((t) => t.ayah > 0 && t.ayah < loop.ayahWindow!.startAyah),
  );

  const canGoNext = Boolean(
    loop.ayahWindow &&
      loop.timings.some((t) => t.ayah > loop.ayahWindow!.endAyah),
  );

  const statusLabel =
    loop.reciterSwitching
      ? 'Changement de voix…'
      : loop.phase === 'listening'
        ? `Écoute ${loop.repIndex + 1}/${loop.repeats}`
        : loop.phase === 'ready'
          ? loop.isLastWindow
            ? 'Dernier passage — terminé bientôt'
            : loop.autoAdvance
              ? 'Suite auto activée'
              : 'À vous — défloutez si besoin'
          : 'Touchez un verset pour l’écouter';

  const applyWindowSize = (n: number) => {
    const next = clampLearnWindowSize(n, maxWindow);
    setWindowSize(next);
    if (inSession) loop.setWindowSize(next);
  };

  const handleChangeReciter = (r: Reciter) => {
    const moshaf = getLearnMoshaf(r);
    if (!moshaf) return;
    setReciterId(r.id);
    setVoicesOpen(false);
    void loop.changeReciter(r, moshaf);
  };

  return (
    <div className={`learn-page ${inSession ? 'learn-page--session' : ''}`}>
      <div className="learn-page__glow" aria-hidden />

      <header className="learn-page__header">
        <div className="learn-page__topbar">
          <button
            type="button"
            onClick={goBack}
            className="learn-page__back tap-feedback"
            aria-label={inSession ? 'Retour au choix' : 'Retour à l’accueil'}
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>

          <div className="learn-brand" aria-label="sawra.app">
            <img
              src="/icons/sansfond.webp"
              alt=""
              width={48}
              height={48}
              decoding="async"
              className="learn-brand__logo"
              draggable={false}
              aria-hidden
            />
            <div className="learn-brand__text">
              <span className="learn-brand__name reciter-name-gradient is-selected">
                sawra.app
              </span>
              <span className="learn-brand__tag">Apprentissage</span>
            </div>
          </div>

          <span className="learn-page__topbar-spacer" aria-hidden />
        </div>

        <div className="learn-page__heading">
          <h2 className="learn-page__title">
            {inSession && loop.config
              ? loop.config.surah.name
              : loop.phase === 'done'
                ? 'Session terminée'
                : 'Apprendre une sourate'}
          </h2>
          {(loop.phase === 'idle' || loop.phase === 'error') && (
            <p className="learn-page__lead">
              Tout est flouté au départ — touchez un verset pour l’écouter, puis
              défloutez à votre rythme.
            </p>
          )}
          {inSession && loop.config && (
            <p className="learn-page__lead learn-page__lead--session">
              {statusLabel}
            </p>
          )}
        </div>
      </header>

      {(loop.phase === 'idle' || loop.phase === 'error') && (
        <section className="learn-page__stack">
          <div className="learn-hero-card">
            <span className="learn-hero-card__icon" aria-hidden>
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#f6f8fb]">Flou → écoute → révélation</p>
              <p className="mt-1 text-xs leading-relaxed text-[#95a7ba]">
                Cliquez un verset pour le lire. Défloutez quand vous voulez.
              </p>
            </div>
          </div>

          {!isOnline && (
            <div className="learn-alert learn-alert--warn">
              <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Une connexion est nécessaire pour charger l’audio et le texte.</p>
            </div>
          )}

          {isOnline && timingCatalogReady && eligible.length === 0 && (
            <div className="learn-alert learn-alert--error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Aucun récitateur avec sync verset n’est disponible pour le moment.</p>
            </div>
          )}

          {loop.error && (
            <div className="learn-alert learn-alert--error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{loop.error}</p>
            </div>
          )}

          <div>
            <p className="learn-label">Récitateur</p>
            <div className="learn-reciter-grid" role="listbox" aria-label="Récitateur">
              {eligible.map((r) => {
                const active = r.id === reciterId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => setReciterId(r.id)}
                    className={`learn-reciter-chip tap-feedback ${active ? 'is-active' : ''}`}
                  >
                    <span className="learn-reciter-chip__avatar">
                      <ReciterPortrait reciter={r} width={36} height={36} />
                    </span>
                    <span className="learn-reciter-chip__name">{r.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="learn-label">Sourate</p>
            <div className="learn-surah-picker">
              <div className="learn-surah-picker__search">
                <Search className="learn-surah-picker__search-icon" aria-hidden />
                <input
                  type="search"
                  value={surahQuery}
                  onChange={(e) => setSurahQuery(e.target.value)}
                  placeholder="Nom, n°, arabe…"
                  aria-label="Rechercher une sourate"
                  className="learn-surah-picker__input"
                  autoComplete="off"
                />
                {surahQuery && (
                  <button
                    type="button"
                    className="learn-surah-picker__clear tap-feedback"
                    aria-label="Effacer la recherche"
                    onClick={() => setSurahQuery('')}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="learn-surah-picker__filters" role="group" aria-label="Filtres sourates">
                {(
                  [
                    { id: 'amma' as const, label: 'Juz Amma' },
                    { id: 'popular' as const, label: 'Populaires' },
                    { id: 'all' as const, label: 'Toutes' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={surahFilter === f.id}
                    onClick={() => setSurahFilter(f.id)}
                    className={`learn-surah-picker__filter tap-feedback ${
                      surahFilter === f.id ? 'is-active' : ''
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {selectedSurah && (
                <p className="learn-surah-picker__selected">
                  Sélection : <strong>{selectedSurah.id}. {selectedSurah.name}</strong>
                  <span dir="rtl" lang="ar">
                    {' '}
                    · {selectedSurah.arabicName}
                  </span>
                </p>
              )}

              <div
                className="learn-surah-picker__list"
                role="listbox"
                aria-label="Liste des sourates"
              >
                {filteredSurahs.length === 0 ? (
                  <p className="learn-surah-picker__empty">Aucune sourate trouvée.</p>
                ) : (
                  filteredSurahs.map((s) => {
                    const active = s.id === surahId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => setSurahId(s.id)}
                        className={`learn-surah-picker__item tap-feedback ${
                          active ? 'is-active' : ''
                        }`}
                      >
                        <span className="learn-surah-picker__num">{s.id}</span>
                        <span className="learn-surah-picker__meta">
                          <span className="learn-surah-picker__name">{s.name}</span>
                          <span className="learn-surah-picker__trans">{s.translation}</span>
                        </span>
                        <span className="learn-surah-picker__ar" lang="ar" dir="rtl">
                          {s.arabicName}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            className="learn-cta tap-feedback"
          >
            Ouvrir la sourate
          </button>
        </section>
      )}

      {loop.phase === 'loading' && (
        <section className="learn-loading">
          <div className="learn-loading__orb" />
          <p className="text-sm font-bold text-[#f6f8fb]">Ouverture de la sourate…</p>
          <p className="text-xs text-[#95a7ba]">
            {selectedSurah?.name ?? 'Chargement'}
          </p>
        </section>
      )}

      {inSession && loop.config && (
        <section className="learn-page__stack learn-session">
          <div className="learn-chrome-sticky">
            <div className="learn-session-bar">
              <button
                type="button"
                className="learn-session-bar__reciter tap-feedback"
                aria-expanded={voicesOpen}
                aria-label="Changer de récitateur"
                onClick={() => {
                  setVoicesOpen((v) => !v);
                  setSettingsOpen(false);
                }}
              >
                <span className="learn-session-bar__avatar">
                  <ReciterPortrait
                    reciter={loop.config.reciter}
                    width={28}
                    height={28}
                  />
                </span>
                <span className="learn-session-bar__text min-w-0">
                  <span className="learn-session-bar__name">{loop.config.reciter.name}</span>
                  <span className="learn-session-bar__status">{statusLabel}</span>
                </span>
              </button>

              <div className="learn-session-bar__actions">
                {loop.phase === 'listening' && (
                  <span className="learn-session-meta__pulse" aria-hidden>
                    <AudioLines className="h-3.5 w-3.5" />
                  </span>
                )}
                <button
                  type="button"
                  className={`learn-session-bar__gear tap-feedback ${settingsOpen ? 'is-active' : ''}`}
                  aria-expanded={settingsOpen}
                  aria-label="Réglages d’apprentissage"
                  onClick={() => {
                    setSettingsOpen((v) => !v);
                    setVoicesOpen(false);
                  }}
                >
                  <Settings className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {voicesOpen && (
              <div className="learn-voice-strip" role="listbox" aria-label="Changer de voix">
                {eligible.map((r) => {
                  const active = r.id === loop.config!.reciter.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      disabled={loop.reciterSwitching}
                      title={r.name}
                      onClick={() => handleChangeReciter(r)}
                      className={`learn-voice-strip__item tap-feedback ${active ? 'is-active' : ''}`}
                    >
                      <span className="learn-voice-strip__avatar">
                        <ReciterPortrait reciter={r} width={32} height={32} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="learn-mini-bar">
              <button
                type="button"
                disabled={!canGoPrev}
                onClick={loop.goPrev}
                className="learn-mini-bar__nav tap-feedback"
                aria-label="Versets précédents"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="learn-mini-bar__range">
                {loop.ayahWindow
                  ? loop.ayahWindow.startAyah === loop.ayahWindow.endAyah
                    ? `v. ${loop.ayahWindow.startAyah}`
                    : `v. ${loop.ayahWindow.startAyah}–${loop.ayahWindow.endAyah}`
                  : '—'}
              </span>
              <button
                type="button"
                disabled={!canGoNext}
                onClick={loop.goNext}
                className="learn-mini-bar__nav tap-feedback"
                aria-label="Versets suivants"
              >
                <ArrowRight className="h-4 w-4" />
              </button>

              <span className="learn-mini-bar__sep" aria-hidden />

              <div className="learn-stepper learn-stepper--mini" role="group" aria-label="Nombre de versets">
                <button
                  type="button"
                  className="learn-stepper__btn tap-feedback"
                  aria-label="Moins de versets"
                  disabled={(loop.windowSize || windowSize) <= LEARN_WINDOW_SIZE_MIN}
                  onClick={() => applyWindowSize((loop.windowSize || windowSize) - 1)}
                >
                  −
                </button>
                <input
                  className="learn-stepper__value"
                  type="number"
                  inputMode="numeric"
                  min={LEARN_WINDOW_SIZE_MIN}
                  max={maxWindow}
                  value={loop.windowSize || windowSize}
                  aria-label="Nombre de versets à lire ensemble"
                  onChange={(e) => applyWindowSize(Number(e.target.value))}
                />
                <button
                  type="button"
                  className="learn-stepper__btn tap-feedback"
                  aria-label="Plus de versets"
                  disabled={(loop.windowSize || windowSize) >= maxWindow}
                  onClick={() => applyWindowSize((loop.windowSize || windowSize) + 1)}
                >
                  +
                </button>
              </div>
            </div>

            {settingsOpen && (
              <div className="learn-settings-panel">
                <div className="learn-settings-panel__row">
                  <span className="learn-settings-panel__label">Répétitions</span>
                  <div className="learn-toolbar__pills learn-toolbar__pills--mini" role="group" aria-label="Répétitions">
                    {LEARN_REPEAT_COUNTS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={loop.repeats === n}
                        onClick={() => {
                          setRepeats(n);
                          loop.setRepeats(n);
                        }}
                        className={`learn-toolbar__pill tap-feedback ${
                          loop.repeats === n ? 'is-active' : ''
                        }`}
                      >
                        {n}×
                      </button>
                    ))}
                  </div>
                </div>

                <div className="learn-settings-panel__row">
                  <span className="learn-settings-panel__label">Vitesse</span>
                  <div className="learn-toolbar__pills learn-toolbar__pills--mini" role="group" aria-label="Vitesse">
                    {LEARN_SPEEDS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={loop.speed === s}
                        onClick={() => loop.setSpeed(s as LearnSpeed)}
                        className={`learn-toolbar__pill tap-feedback ${
                          loop.speed === s ? 'is-active' : ''
                        }`}
                      >
                        {s === 1 ? '1×' : `${s}×`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="learn-settings-panel__row learn-settings-panel__row--toggles">
                  <button
                    type="button"
                    aria-pressed={loop.autoAdvance}
                    onClick={() => loop.setAutoAdvance(!loop.autoAdvance)}
                    className={`learn-toggle learn-toggle--chip tap-feedback ${
                      loop.autoAdvance ? 'is-active' : ''
                    }`}
                  >
                    Auto-suite
                  </button>
                  <button
                    type="button"
                    aria-pressed={showPhonetic}
                    onClick={() => setShowPhonetic((v) => !v)}
                    className={`learn-toggle learn-toggle--chip tap-feedback ${
                      showPhonetic ? 'is-active' : ''
                    }`}
                  >
                    Phonétique
                  </button>
                  <button
                    type="button"
                    aria-pressed={showFr}
                    onClick={() => setShowFr((v) => !v)}
                    className={`learn-toggle learn-toggle--chip tap-feedback ${
                      showFr ? 'is-active' : ''
                    }`}
                  >
                    Français
                  </button>
                </div>
              </div>
            )}
          </div>

          {loop.error && (
            <div className="learn-alert learn-alert--error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{loop.error}</p>
            </div>
          )}

          <div className="learn-surah" aria-label="Texte de la sourate">
            {textLoading && (
              <p className="text-sm text-[#95a7ba] px-1">Chargement du texte…</p>
            )}
            {textError && (
              <p className="text-sm text-rose-300 px-1">{textError}</p>
            )}
            <p className="learn-surah__hint">Touchez = écouter · Œil = flouter</p>
            {!textLoading &&
              !textError &&
              ayahs.map((a) => {
                const isFocus = loop.isFocusAyah(a.number);
                const revealed = loop.isAyahRevealed(a.number);
                return (
                  <div
                    key={a.key}
                    ref={
                      isFocus && loop.ayahWindow && a.number === loop.ayahWindow.startAyah
                        ? focusRef
                        : undefined
                    }
                    className={`learn-ayah-row ${isFocus ? 'is-focus' : ''} ${
                      revealed ? 'is-revealed' : 'is-blurred'
                    }`}
                    onTouchStart={(e) => {
                      const t = e.changedTouches[0];
                      swipeRef.current = { x: t.clientX, y: t.clientY, id: a.number };
                    }}
                    onTouchEnd={(e) => {
                      const start = swipeRef.current;
                      swipeRef.current = null;
                      if (!start || start.id !== a.number) return;
                      const t = e.changedTouches[0];
                      const dx = t.clientX - start.x;
                      const dy = t.clientY - start.y;
                      if (Math.abs(dx) < SWIPE_TOGGLE_PX || Math.abs(dx) < Math.abs(dy) * 1.2) {
                        return;
                      }
                      e.preventDefault();
                      loop.toggleAyahReveal(a.number, allAyahNumbers);
                    }}
                  >
                    <button
                      type="button"
                      className="learn-ayah-row__main tap-feedback"
                      onClick={() => loop.goToAyah(a.number, true)}
                      aria-current={isFocus ? 'true' : undefined}
                      aria-label={`Verset ${a.number}, écouter`}
                    >
                      <span className="learn-ayah-row__num">{a.number}</span>
                      <div className="learn-ayah-row__body">
                        <p className="learn-ayah-row__ar" lang="ar" dir="rtl">
                          {a.textUthmani}
                        </p>
                        {showPhonetic && a.phonetic && (
                          <p className="learn-ayah-row__phonetic">{a.phonetic}</p>
                        )}
                        {showFr && revealed && a.translationFr && (
                          <p className="learn-ayah-row__fr">{a.translationFr}</p>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`learn-ayah-row__reveal tap-feedback ${
                        revealed ? 'is-on' : ''
                      }`}
                      aria-label={
                        revealed
                          ? `Flouter le verset ${a.number}`
                          : `Déflouter le verset ${a.number}`
                      }
                      aria-pressed={revealed}
                      onClick={(e) => {
                        e.stopPropagation();
                        loop.toggleAyahReveal(a.number, allAyahNumbers);
                      }}
                    >
                      {revealed ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                );
              })}
          </div>

          <div className="learn-dock">
            {loop.phase === 'listening' ? (
              <button
                type="button"
                onClick={() => (loop.isPlaying ? loop.clip.stop() : loop.resume())}
                className="learn-dock__primary tap-feedback"
              >
                {loop.isPlaying ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Reprendre
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={loop.listen}
                disabled={loop.isLoadingClip || !loop.ayahWindow}
                className="learn-dock__primary tap-feedback"
              >
                {loop.isLoadingClip ? (
                  '…'
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Écouter
                  </>
                )}
              </button>
            )}

            {loop.allRevealed ? (
              <button
                type="button"
                onClick={loop.blurAll}
                className="learn-dock__secondary tap-feedback"
                aria-label="Tout flouter"
              >
                <EyeOff className="h-4 w-4" />
                <span>Flouter</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={loop.revealAll}
                className="learn-dock__secondary tap-feedback"
                aria-label="Tout voir"
              >
                <Eye className="h-4 w-4" />
                <span>Tout voir</span>
              </button>
            )}

            {loop.phase === 'ready' && loop.isLastWindow ? (
              <button
                type="button"
                onClick={() => loop.goNext()}
                className="learn-dock__secondary tap-feedback"
              >
                Terminer
              </button>
            ) : (
              <button
                type="button"
                onClick={handleListenFullSurah}
                className="learn-dock__icon tap-feedback"
                aria-label="Écouter la sourate entière"
                title="Sourate entière"
              >
                <AudioLines className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </section>
      )}

      {loop.phase === 'done' && loop.config && (
        <section className="learn-done">
          <div className="learn-done__orb" aria-hidden />
          <h3 className="learn-done__title">Bravo</h3>
          <p className="learn-done__lead">
            Vous avez parcouru {loop.config.surah.name} avec{' '}
            {loop.config.reciter.name}.
          </p>
          <button
            type="button"
            onClick={handleListenFullSurah}
            className="learn-cta tap-feedback"
          >
            <AudioLines className="h-4 w-4" />
            Écouter la sourate entière
          </button>
          <button
            type="button"
            onClick={() => loop.reset()}
            className="learn-cta learn-cta--ghost tap-feedback"
          >
            <RefreshCw className="h-4 w-4" />
            Nouvelle session
          </button>
        </section>
      )}
    </div>
  );
};
