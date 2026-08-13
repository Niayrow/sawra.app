import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useQuizAyahClip } from '../hooks/useQuizAyahClip';
import { useTimingCatalogReady } from './AyahSyncBadge';
import { ReciterPortrait } from './ReciterPortrait';
import {
  ArrowLeft,
  Check,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  WifiOff,
  AlertCircle,
  AudioLines,
} from '../icons/motion';
import type { Moshaf, Reciter, Surah } from '../types';
import {
  createQuizSession,
  getQuizEligibleReciters,
  prefetchQuizAudio,
  QUIZ_DIFFICULTIES,
  QUIZ_DIFFICULTY_META,
  QUIZ_LENGTHS,
  type QuizDifficulty,
  type QuizLength,
  type QuizQuestion,
  type QuizSession,
} from '../utils/quizQuestions';
import { ensureTimingCatalog } from '../utils/ayahTiming';

type QuizPhase = 'setup' | 'loading' | 'question' | 'score';

type QuizPageProps = {
  onBack: () => void;
  onListenSurah: (reciter: Reciter, moshaf: Moshaf, surah: Surah) => void;
};

export const QuizPage: React.FC<QuizPageProps> = ({ onBack, onListenSurah }) => {
  const { reciters, pause } = useAudio();
  const isOnline = useOnlineStatus();
  const timingCatalogReady = useTimingCatalogReady();
  const clip = useQuizAyahClip(pause);

  const [phase, setPhase] = useState<QuizPhase>('setup');
  const [length, setLength] = useState<QuizLength>(10);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('easy');
  const [session, setSession] = useState<QuizSession | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const eligibleCount = useMemo(() => {
    if (!timingCatalogReady) return 0;
    return getQuizEligibleReciters(reciters).length;
  }, [reciters, timingCatalogReady]);

  const question: QuizQuestion | null = session?.questions[index] ?? null;
  const answered = selectedId != null;
  const isLast = Boolean(session && index >= session.questions.length - 1);
  const progressPct = session
    ? ((index + (answered ? 1 : 0)) / session.questions.length) * 100
    : 0;

  useEffect(() => {
    void ensureTimingCatalog().catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      clip.unload();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'question' || !question) return;
    void clip.loadClip(
      {
        audioUrl: question.audioUrl,
        startMs: question.startMs,
        endMs: question.endMs,
      },
      true,
    );

    const next = session?.questions[index + 1];
    if (next) prefetchQuizAudio(next.audioUrl);

    return () => {
      clip.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, question?.id]);

  const startQuiz = useCallback(async () => {
    if (!isOnline || eligibleCount === 0) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoadError(null);
    setPhase('loading');
    setSession(null);
    setIndex(0);
    setScore(0);
    setSelectedId(null);
    clip.unload();

    try {
      const next = await createQuizSession(reciters, length, difficulty, ac.signal);
      if (ac.signal.aborted) return;
      setSession(next);
      setPhase('question');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setLoadError(
        err instanceof Error
          ? err.message
          : 'Impossible de démarrer le quiz. Réessayez.',
      );
      setPhase('setup');
    }
  }, [clip, difficulty, eligibleCount, isOnline, length, reciters]);

  const handleSelect = (surah: Surah) => {
    if (answered || !question) return;
    clip.stop();
    setSelectedId(surah.id);
    if (surah.id === question.surah.id) {
      setScore((s) => s + 1);
      // Replay the 2 quiz ayahs + the following one as a reward
      void clip.loadClip(
        {
          audioUrl: question.audioUrl,
          startMs: question.startMs,
          endMs: question.revealEndMs,
        },
        true,
      );
    }
  };

  const handleNext = () => {
    if (!session) return;
    if (isLast) {
      clip.unload();
      setPhase('score');
      return;
    }
    setSelectedId(null);
    setIndex((i) => i + 1);
  };

  const handleReplayQuiz = () => {
    clip.unload();
    setSession(null);
    setIndex(0);
    setScore(0);
    setSelectedId(null);
    setLoadError(null);
    setPhase('setup');
  };

  const goBack = () => {
    clip.unload();
    onBack();
  };

  const handleListenFullSurah = () => {
    if (!question) return;
    clip.unload();
    onListenSurah(question.reciter, question.moshaf, question.surah);
  };

  const choiceState = (surah: Surah) => {
    if (!answered || !question) return 'idle';
    if (surah.id === question.surah.id) return 'correct';
    if (surah.id === selectedId) return 'wrong';
    return 'muted';
  };

  return (
    <div className="quiz-page">
      <div className="quiz-page__glow" aria-hidden />

      <header className="quiz-page__header">
        <div className="quiz-page__topbar">
          <button
            type="button"
            onClick={goBack}
            className="quiz-page__back tap-feedback"
            aria-label="Retour à l’accueil"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>

          <div className="quiz-brand" aria-label="sawra.app">
            <img
              src="/icons/sansfond.webp"
              alt=""
              width={48}
              height={48}
              decoding="async"
              className="quiz-brand__logo"
              draggable={false}
              aria-hidden
            />
            <div className="quiz-brand__text">
              <span className="quiz-brand__name reciter-name-gradient is-selected">
                sawra.app
              </span>
              <span className="quiz-brand__tag">Quiz Coran</span>
            </div>
          </div>

          <span className="quiz-page__topbar-spacer" aria-hidden />
        </div>

        <div className="quiz-page__heading">
          <h2 className="quiz-page__title">De quelle sourate vient ce verset ?</h2>
          {phase === 'setup' && (
            <p className="quiz-page__lead">
              Écoutez deux versets, puis choisissez la bonne sourate parmi quatre.
            </p>
          )}
        </div>
      </header>

      {phase === 'setup' && (
        <section className="quiz-page__stack">
          <div className="quiz-hero-card">
            <span className="quiz-hero-card__icon" aria-hidden>
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#f6f8fb]">Prêt à jouer</p>
              <p className="mt-1 text-xs leading-relaxed text-[#95a7ba]">
                Un récitateur différent à chaque question — oreille fine, sans texte.
              </p>
            </div>
          </div>

          {!isOnline && (
            <div className="quiz-alert quiz-alert--warn">
              <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Le quiz nécessite une connexion pour charger l’audio des versets.</p>
            </div>
          )}

          {isOnline && timingCatalogReady && eligibleCount === 0 && (
            <div className="quiz-alert quiz-alert--error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Aucun récitateur avec sync verset n’est disponible pour le moment.</p>
            </div>
          )}

          {loadError && (
            <div className="quiz-alert quiz-alert--error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{loadError}</p>
            </div>
          )}

          <div>
            <p className="quiz-label">Difficulté</p>
            <div className="quiz-diff-grid" role="group" aria-label="Difficulté">
              {QUIZ_DIFFICULTIES.map((level) => {
                const meta = QUIZ_DIFFICULTY_META[level];
                const active = difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDifficulty(level)}
                    className={`quiz-diff-card quiz-diff-card--${level} tap-feedback ${active ? 'is-active' : ''}`}
                  >
                    <span className="quiz-diff-card__label">{meta.label}</span>
                    <span className="quiz-diff-card__hint">{meta.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="quiz-label">Nombre de questions</p>
            <div className="quiz-length-grid" role="group" aria-label="Nombre de questions">
              {QUIZ_LENGTHS.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={length === n}
                  onClick={() => setLength(n)}
                  className={`quiz-length-btn tap-feedback ${length === n ? 'is-active' : ''}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void startQuiz()}
            disabled={!isOnline || !timingCatalogReady || eligibleCount === 0}
            className="quiz-cta tap-feedback"
          >
            Commencer
          </button>
        </section>
      )}

      {phase === 'loading' && (
        <section className="quiz-loading">
          <div className="quiz-loading__orb" />
          <p className="text-sm font-bold text-[#f6f8fb]">Préparation des versets…</p>
          <p className="text-xs text-[#95a7ba]">
            Niveau {QUIZ_DIFFICULTY_META[difficulty].label.toLowerCase()}
          </p>
        </section>
      )}

      {phase === 'question' && session && question && (
        <section className="quiz-page__stack">
          <div className="quiz-progress">
            <div className="quiz-progress__meta">
              <span>
                Question{' '}
                <strong>
                  {index + 1}/{session.questions.length}
                </strong>
              </span>
              <span>
                {QUIZ_DIFFICULTY_META[session.difficulty].label}
                {' · '}
                Score <strong>{score}</strong>
              </span>
            </div>
            <div className="quiz-progress__track" aria-hidden>
              <div className="quiz-progress__fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <div className="quiz-reciter">
            <div className="quiz-reciter__portrait">
              <ReciterPortrait reciter={question.reciter} width={64} height={64} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#f6f8fb]">
                {question.reciter.name}
              </p>
              <p className="mt-0.5 text-[11px] text-[#95a7ba]">
                Récitateur de cette question
              </p>
            </div>
          </div>

          <div className={`quiz-listen ${clip.isPlaying ? 'is-playing' : ''}`}>
            <div className="quiz-listen__badge">
              <AudioLines className="h-3.5 w-3.5" />
              Écoutez les 2 versets
            </div>

            <div className="quiz-wave" aria-hidden>
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} style={{ ['--i' as string]: i }} />
              ))}
            </div>

            <div className="quiz-listen__controls">
              <button
                type="button"
                onClick={() => void clip.toggle()}
                disabled={clip.status === 'error'}
                className="quiz-play tap-feedback"
                aria-label={clip.isPlaying ? 'Pause' : 'Lecture'}
              >
                {clip.isLoading ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : clip.isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 translate-x-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => void clip.replay()}
                disabled={clip.status === 'error' || clip.status === 'idle'}
                className="quiz-replay tap-feedback"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Rejouer
              </button>
            </div>
            {clip.error && (
              <p className="mt-3 text-center text-xs text-rose-300">{clip.error}</p>
            )}
          </div>

          <div className="quiz-choices">
            {question.choices.map((surah, choiceIndex) => {
              const state = choiceState(surah);
              return (
                <button
                  key={surah.id}
                  type="button"
                  disabled={answered}
                  onClick={() => handleSelect(surah)}
                  className={`quiz-choice quiz-choice--${state} tap-feedback`}
                  style={{ ['--stagger' as string]: choiceIndex }}
                >
                  <span className="quiz-choice__index">{choiceIndex + 1}</span>
                  <span className="quiz-choice__body">
                    <span className="quiz-choice__name">{surah.name}</span>
                    <span className="quiz-choice__ar" dir="rtl" lang="ar">
                      {surah.arabicName}
                    </span>
                  </span>
                  {state === 'correct' && (
                    <span className="quiz-choice__mark" aria-hidden>
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="quiz-feedback">
              <p
                className={`quiz-feedback__text ${
                  selectedId === question.surah.id ? 'is-ok' : 'is-ko'
                }`}
              >
                {selectedId === question.surah.id
                  ? question.revealEndMs > question.endMs
                    ? 'Bonne réponse — écoutez la suite…'
                    : 'Bonne réponse !'
                  : `C’était ${question.surah.name}`}
              </p>
              <button
                type="button"
                onClick={handleListenFullSurah}
                className="quiz-listen-full tap-feedback"
              >
                <span className="quiz-listen-full__portrait" aria-hidden>
                  <ReciterPortrait reciter={question.reciter} width={48} height={48} />
                </span>
                <span className="quiz-listen-full__body">
                  <span className="quiz-listen-full__eyebrow">Continuer l’écoute</span>
                  <span className="quiz-listen-full__title">
                    {question.surah.name}
                    <span dir="rtl" lang="ar">
                      {question.surah.arabicName}
                    </span>
                  </span>
                  <span className="quiz-listen-full__meta">
                    Sourate complète · {question.reciter.name}
                  </span>
                </span>
                <span className="quiz-listen-full__play" aria-hidden>
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                </span>
              </button>
              <button type="button" onClick={handleNext} className="quiz-cta tap-feedback">
                {isLast ? 'Voir mon score' : 'Question suivante'}
              </button>
            </div>
          )}
        </section>
      )}

      {phase === 'score' && session && (
        <section className="quiz-score">
          <p className="quiz-page__eyebrow">
            Terminé · {QUIZ_DIFFICULTY_META[session.difficulty].label}
          </p>
          <p className="quiz-score__value">
            {score}
            <span>/{session.questions.length}</span>
          </p>
          <p className="quiz-score__msg">
            {score === session.questions.length
              ? 'Parfait — toutes les réponses sont justes.'
              : score >= session.questions.length * 0.7
                ? 'Très bon score — continuez comme ça.'
                : 'Entraînez-vous encore, les oreilles progressent vite.'}
          </p>
          <div className="quiz-score__actions">
            <button type="button" onClick={handleReplayQuiz} className="quiz-cta tap-feedback">
              Rejouer
            </button>
            <button type="button" onClick={goBack} className="quiz-cta quiz-cta--ghost tap-feedback">
              Retour à l’accueil
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
