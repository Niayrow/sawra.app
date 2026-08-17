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
  ChevronDown,
  Eye,
  EyeOff,
  Gauge,
  Pause,
  Play,
  RefreshCw,
  Repeat,
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
import { capturePostHogEvent } from '../utils/posthog';
import { AYAT_AL_KURSI } from '../utils/ayatAlKursi';

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
  }, [
    loop.ayahWindow?.startAyah,
    loop.ayahWindow?.endAyah,
    loop.ayahWindow?.segmentIndex,
  ]);

  const isKursiSession = Boolean(loop.config?.kursiMode);

  const canStart =
    isOnline &&
    timingCatalogReady &&
    eligible.length > 0 &&
    selectedReciter != null &&
    selectedSurah != null;

  const kursiSurah = useMemo(
    () => availableSurahs.find((s) => s.id === AYAT_AL_KURSI.surahId) ?? null,
    [availableSurahs],
  );

  const canStartKursi =
    isOnline &&
    timingCatalogReady &&
    selectedReciter != null &&
    kursiSurah != null;

  const handleStart = () => {
    if (!selectedReciter || !selectedSurah) return;
    const moshaf = getLearnMoshaf(selectedReciter);
    if (!moshaf) return;
    capturePostHogEvent('learning_session_started', {
      reciter_id: selectedReciter.id,
      moshaf_id: moshaf.id,
      surah_id: selectedSurah.id,
      window_size: clampLearnWindowSize(windowSize, maxWindow),
      repeat_count: repeats,
    });
    void loop.start({
      reciter: selectedReciter,
      moshaf,
      surah: selectedSurah,
      windowSize: clampLearnWindowSize(windowSize, maxWindow),
      repeats,
    });
  };

  const handleStartKursi = () => {
    if (!selectedReciter || !kursiSurah) return;
    const moshaf = getLearnMoshaf(selectedReciter);
    if (!moshaf) return;
    setSurahId(AYAT_AL_KURSI.surahId);
    setWindowSize(1);
    capturePostHogEvent('learning_session_started', {
      reciter_id: selectedReciter.id,
      moshaf_id: moshaf.id,
      surah_id: AYAT_AL_KURSI.surahId,
      window_size: 1,
      repeat_count: repeats,
      focus: 'ayat_al_kursi',
    });
    void loop.start({
      reciter: selectedReciter,
      moshaf,
      surah: kursiSurah,
      windowSize: 1,
      repeats,
      kursiMode: true,
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

  const sessionAyahs = useMemo(() => {
    if (!isKursiSession) return ayahs;
    return ayahs.filter((a) => a.number === AYAT_AL_KURSI.ayah);
  }, [ayahs, isKursiSession]);

  const canGoPrev = Boolean(
    loop.ayahWindow &&
      (isKursiSession
        ? (loop.ayahWindow.segmentIndex ?? 0) > 0
        : loop.timings.some((t) => t.ayah > 0 && t.ayah < loop.ayahWindow!.startAyah)),
  );

  const canGoNext = Boolean(
    loop.ayahWindow &&
      (isKursiSession
        ? (loop.ayahWindow.segmentIndex ?? 0) <
          (loop.ayahWindow.segmentCount ?? 1) - 1
        : loop.timings.some((t) => t.ayah > loop.ayahWindow!.endAyah)),
  );

  const statusLabel =
    loop.reciterSwitching
      ? 'Changement de voix…'
      : loop.phase === 'listening'
        ? loop.repeats === 0
          ? `Écoute ${loop.repIndex + 1} · ∞`
          : `Écoute ${loop.repIndex + 1}/${loop.repeats}`
        : loop.phase === 'ready'
          ? loop.isLastWindow
            ? isKursiSession
              ? 'Dernière phrase — terminé bientôt'
              : 'Dernier passage — terminé bientôt'
            : loop.autoAdvance
              ? 'Suite auto activée'
              : isKursiSession
                ? 'À vous — phrase suivante quand vous voulez'
                : 'À vous — défloutez si besoin'
          : isKursiSession
            ? 'Écoutez phrase par phrase'
            : 'Touchez un verset pour l’écouter';

  const activeWindowSize = loop.windowSize || windowSize;
  const repeatVersesLabel =
    activeWindowSize <= 1 ? 'Répétitions du verset' : 'Répétitions des versets';
  const isFullSurahWindow = activeWindowSize >= maxWindow;

  const rangeLabel = (() => {
    const win = loop.ayahWindow;
    if (!win) return '—';
    if (isKursiSession && win.segmentCount != null && win.segmentIndex != null) {
      return `partie ${win.segmentIndex + 1}/${win.segmentCount}`;
    }
    if (win.startAyah === win.endAyah) return `v. ${win.startAyah}`;
    return `v. ${win.startAyah}–${win.endAyah}`;
  })();

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
              ? isKursiSession
                ? AYAT_AL_KURSI.title
                : loop.config.surah.name
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

          <div className="learn-featured">
            <p className="learn-label">À mémoriser</p>
            <button
              type="button"
              disabled={!canStartKursi}
              onClick={handleStartKursi}
              className="learn-featured__card tap-feedback"
              aria-label={`Apprendre ${AYAT_AL_KURSI.title}`}
            >
              <span className="learn-featured__badge">Verset 255</span>
              <span className="learn-featured__titles">
                <span className="learn-featured__title">{AYAT_AL_KURSI.title}</span>
                <span className="learn-featured__ar" lang="ar" dir="rtl">
                  {AYAT_AL_KURSI.arabicTitle}
                </span>
              </span>
              <span className="learn-featured__teaser" lang="ar" dir="rtl">
                {AYAT_AL_KURSI.teaser}
              </span>
              <span className="learn-featured__meta">
                Al-Baqarah · verset 255 · 8 phrases
              </span>
              <span className="learn-featured__cta">
                Apprendre
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </button>
            {!selectedReciter && eligible.length > 0 ? (
              <p className="learn-featured__hint">Choisissez d’abord un récitateur ci-dessous.</p>
            ) : null}
            {selectedReciter && !kursiSurah ? (
              <p className="learn-featured__hint">
                Cette voix n’a pas Al-Baqarah synchronisée.
              </p>
            ) : null}
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
            <div
              className={`learn-session-bar ${
                loop.phase === 'listening' ? 'learn-session-bar--listening' : ''
              }`}
            >
              <button
                type="button"
                className="learn-session-bar__reciter tap-feedback"
                aria-expanded={voicesOpen}
                aria-label={`Changer de récitateur — ${loop.config.reciter.name}`}
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
                  <span className="learn-session-bar__name-row">
                    <span className="learn-session-bar__name">{loop.config.reciter.name}</span>
                    <span className="learn-session-bar__voice-hint" aria-hidden>
                      Changer
                      <ChevronDown
                        className={`learn-session-bar__chevron ${voicesOpen ? 'is-open' : ''}`}
                      />
                    </span>
                  </span>
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
              <div className="learn-mini-bar__cluster learn-mini-bar__cluster--nav">
                <button
                  type="button"
                  disabled={!canGoPrev}
                  onClick={loop.goPrev}
                  className="learn-mini-bar__nav tap-feedback"
                  aria-label={isKursiSession ? 'Phrase précédente' : 'Versets précédents'}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="learn-mini-bar__range">{rangeLabel}</span>
                <button
                  type="button"
                  disabled={!canGoNext}
                  onClick={loop.goNext}
                  className="learn-mini-bar__nav tap-feedback"
                  aria-label={isKursiSession ? 'Phrase suivante' : 'Versets suivants'}
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {!isKursiSession && (
                <div className="learn-mini-bar__window">
                  <div className="learn-mini-bar__cluster learn-mini-bar__cluster--stepper">
                    <div className="learn-stepper learn-stepper--mini" role="group" aria-label="Nombre de versets">
                      <button
                        type="button"
                        className="learn-stepper__btn tap-feedback"
                        aria-label="Moins de versets"
                        disabled={activeWindowSize <= LEARN_WINDOW_SIZE_MIN}
                        onClick={() => applyWindowSize(activeWindowSize - 1)}
                      >
                        −
                      </button>
                      <input
                        className="learn-stepper__value"
                        type="number"
                        inputMode="numeric"
                        min={LEARN_WINDOW_SIZE_MIN}
                        max={maxWindow}
                        value={activeWindowSize}
                        aria-label="Nombre de versets à lire ensemble"
                        onChange={(e) => applyWindowSize(Number(e.target.value))}
                      />
                      <button
                        type="button"
                        className="learn-stepper__btn tap-feedback"
                        aria-label="Plus de versets"
                        disabled={activeWindowSize >= maxWindow}
                        onClick={() => applyWindowSize(activeWindowSize + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`learn-mini-bar__all-btn tap-feedback ${isFullSurahWindow ? 'is-active' : ''}`}
                    aria-pressed={isFullSurahWindow}
                    aria-label="Toute la sourate"
                    title="Toute la sourate"
                    onClick={() => applyWindowSize(maxWindow)}
                  >
                    ALL
                  </button>
                </div>
              )}
            </div>

            {settingsOpen && (
              <div className="learn-settings-panel">
                <div className="learn-settings-panel__block">
                  <div className="learn-settings-panel__head">
                    <Repeat className="learn-settings-panel__icon" aria-hidden />
                    <span className="learn-settings-panel__label">{repeatVersesLabel}</span>
                  </div>
                  <div className="learn-seg" role="group" aria-label={repeatVersesLabel}>
                    {LEARN_REPEAT_COUNTS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={loop.repeats === n}
                        onClick={() => {
                          setRepeats(n);
                          loop.setRepeats(n);
                        }}
                        className={`learn-seg__btn tap-feedback ${
                          loop.repeats === n ? 'is-active' : ''
                        }`}
                      >
                        {n === 0 ? '∞' : `${n}×`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="learn-settings-panel__block">
                  <div className="learn-settings-panel__head">
                    <Gauge className="learn-settings-panel__icon" aria-hidden />
                    <span className="learn-settings-panel__label">Vitesse</span>
                  </div>
                  <div className="learn-seg" role="group" aria-label="Vitesse">
                    {LEARN_SPEEDS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={loop.speed === s}
                        onClick={() => loop.setSpeed(s as LearnSpeed)}
                        className={`learn-seg__btn tap-feedback ${
                          loop.speed === s ? 'is-active' : ''
                        }`}
                      >
                        {s === 1 ? '1×' : `${s}×`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="learn-settings-panel__toggles">
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
            {isKursiSession && loop.ayahWindow?.phraseAr && (
              <div className="learn-kursi-phrase" ref={focusRef}>
                <p className="learn-kursi-phrase__meta">
                  Phrase {(loop.ayahWindow.segmentIndex ?? 0) + 1}/
                  {loop.ayahWindow.segmentCount ?? 8}
                </p>
                <p className="learn-kursi-phrase__ar" lang="ar" dir="rtl">
                  {loop.ayahWindow.phraseAr}
                </p>
                {showPhonetic && loop.ayahWindow.phrasePhonetic ? (
                  <p className="learn-kursi-phrase__phonetic">
                    {loop.ayahWindow.phrasePhonetic}
                  </p>
                ) : null}
                {showFr && loop.ayahWindow.phraseFr ? (
                  <p className="learn-kursi-phrase__fr">{loop.ayahWindow.phraseFr}</p>
                ) : null}
              </div>
            )}
            <p className="learn-surah__hint">
              {isKursiSession
                ? 'Écoutez chaque phrase · flèches pour changer'
                : 'Touchez = écouter · Œil = flouter'}
            </p>
            {!textLoading &&
              !textError &&
              sessionAyahs.map((a) => {
                const isFocus = loop.isFocusAyah(a.number);
                const revealed = loop.isAyahRevealed(a.number);
                return (
                  <div
                    key={a.key}
                    ref={
                      !isKursiSession &&
                      isFocus &&
                      loop.ayahWindow &&
                      a.number === loop.ayahWindow.startAyah
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
                      onClick={() =>
                        isKursiSession ? loop.listen() : loop.goToAyah(a.number, true)
                      }
                      aria-current={isFocus ? 'true' : undefined}
                      aria-label={
                        isKursiSession
                          ? 'Réécouter la phrase'
                          : `Verset ${a.number}, écouter`
                      }
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
