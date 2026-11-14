import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  Compass,
  Film,
  Info,
  Layers,
  Loader2,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Send,
  User,
} from 'lucide-react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  AssessmentState,
  CAMPUS_WALKTHROUGH_VIDEO_SRC,
  DEFAULT_QUICK_ASK_PROMPT,
  HERO_FALLBACK_VIDEO_SRC,
  HERO_POSTER_SRC,
  HERO_VIDEO_SRC,
  LearnerProfile,
  LessonItem,
  MENTOR_PROMPTS,
  MentorMessage,
  PortalPageId,
  SimulatedAgentInsight,
} from '../data/portalData';
import {
  askGeminiMentor,
  CareerMatchAnalysis,
  RankedCourse,
} from '../services/learningEngine';
import { CardSwap } from './CardSwap';

interface HomeDashboardProps {
  profile: LearnerProfile;
  careerMatch: CareerMatchAnalysis;
  rankedCourses: RankedCourse[];
  adaptiveRoadmap: {
    orderedLessons: LessonItem[];
    recommendedNext: LessonItem | null;
    adaptationHeadline: string;
    adaptationExplanation: string;
  };
  assessment: AssessmentState;
  agentInsights: SimulatedAgentInsight[];
  isAnalyzingAgents?: boolean;
  agentAnalysisError?: string | null;
  onRefreshAgents?: () => void;
  completedLessonIds: string[];
  inProgressLessonIds: string[];
  onStartLesson: (lessonId: string) => void;
  onToggleLesson: (lessonId: string) => void;
  onResetProgress: () => void;
  onSelectPage: (page: PortalPageId) => void;
  onScrollToTarget?: (targetId: string, yOffset?: number) => void;
  onScrollToPosition?: (y: number) => void;
  onScrollToPositionImmediate?: (y: number) => void;
  startOpenedToHero?: boolean;
  onConsumedStartOpened?: () => void;
  onExitDemo: () => void;
}

export function HomeDashboard({
  profile,
  careerMatch,
  rankedCourses,
  adaptiveRoadmap,
  assessment,
  agentInsights,
  isAnalyzingAgents = false,
  agentAnalysisError = null,
  onRefreshAgents,
  completedLessonIds,
  inProgressLessonIds,
  onStartLesson,
  onToggleLesson,
  onResetProgress,
  onSelectPage,
  onScrollToTarget,
  onScrollToPosition,
  onScrollToPositionImmediate,
  startOpenedToHero = false,
  onConsumedStartOpened,
  onExitDemo,
}: HomeDashboardProps) {
  const prefersReducedMotion = useReducedMotion();
  const openingRunwayRef = useRef<HTMLElement | null>(null);
  const heroRevealRef = useRef<HTMLDivElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);

  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const [skillFilter, setSkillFilter] = useState<'all' | 'have' | 'gaps'>('all');
  const [isBgVideoPlaying, setIsBgVideoPlaying] = useState(true);
  const [bgVideoSrc, setBgVideoSrc] = useState(HERO_VIDEO_SRC);
  const [bgVideoFailed, setBgVideoFailed] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [isPanelsOpened, setIsPanelsOpened] = useState(() =>
    Boolean(prefersReducedMotion || startOpenedToHero)
  );
  const [mentorInput, setMentorInput] = useState('');
  const [isMentorSending, setIsMentorSending] = useState(false);
  const [mentorMessages, setMentorMessages] = useState<MentorMessage[]>([
    {
      id: 'init-mentor',
      role: 'mentor',
      text: `Gemini AI Mentor: Welcome back, ${profile.name || 'Learner'}. Your ${profile.careerGoal} match is ${careerMatch.matchPercent}% — click “${DEFAULT_QUICK_ASK_PROMPT}” or ask any question about your roadmap.`,
    },
  ]);

  const cardCourses = useMemo(
    () => rankedCourses.map((r) => r.course),
    [rankedCourses]
  );

  // When entering Home right after clicking "Click to explore" on the video gate, reveal the Hero cleanly
  useEffect(() => {
    if (!startOpenedToHero) return;

    const rafId = window.requestAnimationFrame(() => {
      if (!prefersReducedMotion) {
        const runway = openingRunwayRef.current;
        const heroReveal = heroRevealRef.current;
        const scrollRange = runway ? Math.max(0, runway.offsetHeight - window.innerHeight) : 0;
        const revealY = heroReveal ? Math.max(0, heroReveal.offsetTop - 76) : 0;
        const targetY = Math.max(revealY, Math.round(scrollRange * 0.62));
        if (onScrollToPositionImmediate) {
          onScrollToPositionImmediate(targetY);
        } else {
          window.scrollTo({ top: targetY, behavior: 'auto' });
        }
        setIsPanelsOpened(true);
      }
      onConsumedStartOpened?.();
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [startOpenedToHero, prefersReducedMotion, onScrollToPositionImmediate, onConsumedStartOpened]);

  // Keep muted looping video playing automatically in the background
  useEffect(() => {
    const video = bgVideoRef.current;
    if (!video || bgVideoFailed) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const ensurePlay = () => {
      if (!isBgVideoPlaying || bgVideoFailed) return;
      video.muted = true;
      video.defaultMuted = true;
      if (video.paused) {
        const p = video.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            // Retry on visibility or user interaction if browser defers autoplay
          });
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        ensurePlay();
      }
    };

    if (isBgVideoPlaying) {
      ensurePlay();
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('pointerdown', ensurePlay, { once: true, passive: true });
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('pointerdown', ensurePlay);
      };
    } else if (!video.paused) {
      video.pause();
    }
  }, [isBgVideoPlaying, bgVideoFailed, bgVideoSrc]);

  const handleBgVideoReady = () => {
    const video = bgVideoRef.current;
    if (!video || !isBgVideoPlaying || bgVideoFailed) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    if (video.paused) {
      video.play().catch(() => {});
    }
  };

  const handleBgVideoError = () => {
    if (bgVideoSrc === HERO_VIDEO_SRC) {
      setBgVideoSrc(HERO_FALLBACK_VIDEO_SRC);
    } else {
      setBgVideoFailed(true);
    }
  };

  // Scroll-driven split-panel opening reveal on the tall opening section
  const { scrollYProgress: openingProgress } = useScroll({
    target: openingRunwayRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(openingProgress, 'change', (latest) => {
    if (!prefersReducedMotion) {
      setIsPanelsOpened(latest >= 0.36);
    }
  });

  const leftPanelX = useTransform(
    openingProgress,
    [0.02, 0.48],
    prefersReducedMotion ? ['-100%', '-100%'] : ['0%', '-100%']
  );
  const rightPanelX = useTransform(
    openingProgress,
    [0.02, 0.48],
    prefersReducedMotion ? ['100%', '100%'] : ['0%', '100%']
  );
  const bgVideoScale = useTransform(
    openingProgress,
    [0, 0.58],
    prefersReducedMotion ? [1, 1] : [1.14, 1]
  );
  const titleLeftX = useTransform(
    openingProgress,
    [0.02, 0.44],
    prefersReducedMotion ? [0, 0] : [0, -84]
  );
  const titleRightX = useTransform(
    openingProgress,
    [0.02, 0.44],
    prefersReducedMotion ? [0, 0] : [0, 84]
  );
  const introTitleScale = useTransform(
    openingProgress,
    [0.02, 0.44],
    prefersReducedMotion ? [1, 1] : [0.96, 1.08]
  );
  const introTitleOpacity = useTransform(
    openingProgress,
    [0, 0.28, 0.48],
    prefersReducedMotion ? [0, 0, 0] : [1, 0.9, 0]
  );
  const heroContentOpacity = useTransform(
    openingProgress,
    [0.20, 0.48],
    prefersReducedMotion ? [1, 1] : [0, 1]
  );
  const heroContentScale = useTransform(
    openingProgress,
    [0.20, 0.52],
    prefersReducedMotion ? [1, 1] : [0.97, 1]
  );

  const handleOpenPanelsByClick = () => {
    const video = bgVideoRef.current;
    if (video && isBgVideoPlaying && !bgVideoFailed) {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.play().catch(() => {});
    }

    if (prefersReducedMotion) {
      scrollToSectionId('home-learning-path');
      return;
    }

    const runway = openingRunwayRef.current;
    const heroReveal = heroRevealRef.current;
    const scrollRange = runway ? Math.max(0, runway.offsetHeight - window.innerHeight) : 0;
    const revealY = heroReveal ? Math.max(0, heroReveal.offsetTop - 76) : 0;
    const targetY = Math.max(revealY, Math.round(scrollRange * 0.62));
    if (onScrollToPosition) {
      onScrollToPosition(targetY);
    } else {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  const scrollToSectionId = (id: string) => {
    if (onScrollToTarget) {
      onScrollToTarget(id, -84);
      return;
    }
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const nextRecommendedLesson = adaptiveRoadmap.recommendedNext;

  const handleContinueLearning = () => {
    if (nextRecommendedLesson) {
      onStartLesson(nextRecommendedLesson.id);
      const idx = cardCourses.findIndex((l) => l.id === nextRecommendedLesson.id);
      if (idx >= 0) {
        setActiveCarouselIndex(idx);
      }
    }
    onSelectPage('courses');
  };

  const visibleSkillRows = useMemo(() => {
    if (skillFilter === 'have') return careerMatch.alreadyHave;
    if (skillFilter === 'gaps') return [...careerMatch.developing, ...careerMatch.missing];
    return careerMatch.allRows;
  }, [careerMatch, skillFilter]);

  const remainingGapsCount = careerMatch.developing.length + careerMatch.missing.length;

  const sendMentorQuestion = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isMentorSending) return;

    const historySnapshot = mentorMessages
      .filter((m) => !m.isError)
      .map((m) => ({ role: m.role, text: m.text }));

    setMentorMessages((prev) => [
      ...prev,
      { id: `learner-${Date.now()}`, role: 'learner', text: trimmed },
    ]);
    setMentorInput('');
    setIsMentorSending(true);

    try {
      const reply = await askGeminiMentor(trimmed, historySnapshot, {
        profile,
        match: careerMatch,
        recommendedNext: nextRecommendedLesson,
        assessment,
        completedCount: completedLessonIds.length,
        inProgressCount: inProgressLessonIds.length,
        totalModules: adaptiveRoadmap.orderedLessons.length,
      });

      setMentorMessages((prev) => [
        ...prev,
        { id: `mentor-${Date.now()}`, role: 'mentor', text: reply },
      ]);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to reach Gemini AI right now. Please try again.';
      setMentorMessages((prev) => [
        ...prev,
        { id: `mentor-err-${Date.now()}`, role: 'mentor', text: errMsg, isError: true },
      ]);
    } finally {
      setIsMentorSending(false);
    }
  };

  const handleMentorSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMentorQuestion(mentorInput);
  };

  const revealProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.06 },
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
      };

  const heroInnerMarkup = (
    <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
      {/* Left Column: Welcome Hero Card + Live Progress Summary */}
      <div className="lg:col-span-7 space-y-5">
        <div className="rounded-[26px] border border-[#E6D4AA] bg-[#FCFBF8]/92 backdrop-blur-md p-6 sm:p-8 shadow-[0_24px_60px_-18px_rgba(28,22,12,0.28)] space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#5A5140]">
            <span>Developer Learning Portal</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#9E7016] font-semibold">Goal: {profile.careerGoal}</span>
          </div>

          <h1
            id="welcome-heading"
            className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#1B1710] leading-[1.14] [text-wrap:balance]"
          >
            Welcome back, {profile.name || 'Learner'} — bridge your path to {profile.careerGoal}
          </h1>

          <p className="text-sm sm:text-[15px] text-[#5A5140] leading-relaxed max-w-[56ch]">
            {careerMatch.summaryText}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleContinueLearning}
              className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] text-[#1A150B] text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(166,120,30,0.26)] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FCFBF8]"
            >
              <span>
                {nextRecommendedLesson
                  ? `Continue learning: ${nextRecommendedLesson.skill}`
                  : 'Review completed lessons'}
              </span>
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => onSelectPage('learning-path')}
              className="inline-flex items-center justify-center gap-1.5 min-h-[48px] px-5 py-3 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-sm font-semibold text-[#1B1710] shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
            >
              <span>Open Learning Path</span>
              <ArrowUpRight className="w-4 h-4 text-[#9E7016] shrink-0" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Small Progress Summary Card */}
        <aside
          aria-label="Progress summary"
          className="rounded-2xl border border-[#E6D4AA] bg-[#FCFBF8]/92 backdrop-blur-md p-5 space-y-3 shadow-[0_18px_45px_-16px_rgba(28,22,12,0.22)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[#1B1710]">
              Progress Summary · <span className="text-[#9E7016]">{profile.careerGoal} Readiness</span>
            </span>
            <span className="text-[#5A5140] tabular-nums">
              {completedLessonIds.length} / {adaptiveRoadmap.orderedLessons.length} done ·{' '}
              {inProgressLessonIds.length} started · {remainingGapsCount} gaps left
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-2.5 rounded-full bg-[#EFE6CF] overflow-hidden"
              role="progressbar"
              aria-valuenow={careerMatch.matchPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${profile.careerGoal} readiness`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#DFB75B] to-[#9E7016] transition-all duration-300"
                style={{ width: `${careerMatch.matchPercent}%` }}
              />
            </div>
            <span className="font-display text-xl font-extrabold text-[#1B1710] tabular-nums shrink-0">
              {careerMatch.matchPercent}%
            </span>
          </div>
        </aside>
      </div>

      {/* Right Column: 3D Skill Cards Layered Above the Full-Page Video */}
      <div id="home-courses" className="lg:col-span-5 space-y-4">
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-full border border-[#E6D4AA] bg-[#FCFBF8]/90 backdrop-blur-md text-xs font-semibold text-[#9E7016] shadow-xs">
          <div className="inline-flex items-center gap-2">
            <Layers className="w-4 h-4" aria-hidden="true" />
            <span>Recommended 3D Skill Cards</span>
          </div>
          <span className="text-[#6A5F4B] font-normal">Hover to pause</span>
        </div>

        <CardSwap
          items={cardCourses}
          activeIndex={activeCarouselIndex}
          onActiveIndexChange={setActiveCarouselIndex}
          pauseOnHover
          label="Recommended developer skill courses"
          renderCard={(lesson) => {
            const isDone = completedLessonIds.includes(lesson.id);
            const isStarted = !isDone && inProgressLessonIds.includes(lesson.id);
            return (
              <article className="rounded-[24px] border border-[#E6D4AA] bg-white p-6 sm:p-7 shadow-[0_26px_60px_-16px_rgba(28,22,12,0.3)] flex flex-col justify-between min-h-[285px] sm:min-h-[304px] text-[#1B1710]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-[#6A5F4B]">
                    <span className="font-semibold text-[#9E7016]">
                      Module {String(lesson.order).padStart(2, '0')} · {lesson.skill}
                    </span>
                    <span className="tabular-nums">
                      {lesson.level} · {lesson.duration}
                    </span>
                  </div>

                  <h2 className="font-display text-lg sm:text-xl font-bold text-[#1B1710] leading-snug [text-wrap:balance]">
                    {lesson.title}
                  </h2>

                  <p className="text-sm text-[#5A5140] leading-relaxed">{lesson.summary}</p>
                </div>

                <div className="pt-5 mt-4 border-t border-[#F0E6CE] flex items-center justify-between gap-3">
                  <span className="text-xs text-[#6A5F4B] line-clamp-1">{lesson.outcome}</span>

                  <button
                    type="button"
                    onClick={() => onToggleLesson(lesson.id)}
                    className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] ${
                      isDone
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                        : 'border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] text-[#1A150B] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]'
                    }`}
                  >
                    {isDone ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Completed</span>
                      </>
                    ) : isStarted ? (
                      <span>Finish lesson</span>
                    ) : (
                      <span>Complete lesson</span>
                    )}
                  </button>
                </div>
              </article>
            );
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#FCFBF8] text-[#1B1710] overflow-x-clip">
      {/* Persistent Full-Page Background Video */}
      <motion.div
        aria-hidden="true"
        style={{ scale: bgVideoScale }}
        className="fixed inset-0 z-0 overflow-hidden bg-[#1D170E] transform-gpu"
      >
        <img
          src={HERO_POSTER_SRC}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />

        {!bgVideoFailed && (
          <video
            ref={bgVideoRef}
            src={bgVideoSrc}
            poster={HERO_POSTER_SRC}
            className="absolute inset-0 w-full h-full object-cover transform-gpu"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            onLoadedMetadata={handleBgVideoReady}
            onLoadedData={handleBgVideoReady}
            onCanPlay={handleBgVideoReady}
            onError={handleBgVideoError}
          />
        )}

        <div className="absolute inset-0 bg-[#FCFBF8]/22" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FCFBF8]/40 via-[#FCFBF8]/14 to-[#FCFBF8]/88" />
      </motion.div>

      {/* SECTION 1: Tall Opening Split-Panel Reveal */}
      {prefersReducedMotion ? (
        <section
          ref={openingRunwayRef}
          aria-labelledby="welcome-heading"
          className="relative z-10 pt-24 pb-10 sm:pt-28"
        >
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-6 flex justify-start">
            <button
              type="button"
              onClick={handleOpenPanelsByClick}
              className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-2.5 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] text-[#1A150B] text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(166,120,30,0.26)] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
            >
              <span>Click to explore</span>
              <ArrowDown className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>
          </div>
          {heroInnerMarkup}
        </section>
      ) : (
        <section
          ref={openingRunwayRef}
          aria-labelledby="welcome-heading"
          className="relative z-10 min-h-[195vh]"
        >
          <div className="sticky top-0 h-[100dvh] w-full overflow-hidden z-20 pointer-events-none flex items-center justify-center">
            <div aria-hidden="true" className="absolute inset-0 flex overflow-hidden">
              <motion.div
                style={{ x: leftPanelX }}
                className="w-1/2 h-full bg-[#FCFBF8]/78 backdrop-blur-[4px] border-r border-[#C89B3C]/45 shadow-[inset_-24px_0_48px_rgba(120,86,18,0.08)] transform-gpu"
              />
              <motion.div
                style={{ x: rightPanelX }}
                className="w-1/2 h-full bg-[#F8F3E6]/78 backdrop-blur-[4px] border-l border-[#C89B3C]/35 shadow-[inset_24px_0_48px_rgba(120,86,18,0.08)] transform-gpu"
              />
            </div>

            <motion.div
              style={{ opacity: introTitleOpacity, scale: introTitleScale }}
              aria-hidden={isPanelsOpened}
              className="relative z-10 flex flex-col items-center justify-center px-6 text-center pointer-events-none"
            >
              <p className="text-xs font-semibold tracking-wider text-[#9E7016] mb-3">
                Developer Learning Portal · {profile.careerGoal}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-5">
                <motion.span
                  style={{ x: titleLeftX }}
                  className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1B1710] [text-wrap:balance]"
                >
                  Your Next Skill
                </motion.span>
                <motion.span
                  style={{ x: titleRightX }}
                  className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#9E7016] [text-wrap:balance]"
                >
                  Starts Here
                </motion.span>
              </div>

              <p className="mt-4 max-w-[46ch] text-sm sm:text-base text-[#4C4332] leading-relaxed">
                Watch the studio backdrop play behind the center panels, then click or scroll to reveal {profile.name || 'your'} workspace.
              </p>

              <div
                className={`mt-7 ${
                  isPanelsOpened ? 'pointer-events-none' : 'pointer-events-auto'
                }`}
              >
                <button
                  type="button"
                  onClick={handleOpenPanelsByClick}
                  tabIndex={isPanelsOpened ? -1 : 0}
                  className="inline-flex items-center justify-center gap-2 min-h-[50px] px-7 py-3 rounded-full border border-[#F5DE9B]/85 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] text-[#1A150B] text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_14px_34px_rgba(166,120,30,0.32)] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FCFBF8]"
                >
                  <span>Click to explore</span>
                  <ArrowDown className="w-4 h-4 shrink-0" aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          </div>

          <motion.div
            ref={heroRevealRef}
            style={{ opacity: heroContentOpacity, scale: heroContentScale }}
            className={`relative z-10 -mt-[28vh] min-h-[88vh] flex items-center pt-6 pb-10 ${
              isPanelsOpened ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
            aria-hidden={!isPanelsOpened}
          >
            {heroInnerMarkup}
          </motion.div>
        </section>
      )}

      {/* Remaining Home Dashboard Sections */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24 md:pb-14 space-y-10 sm:space-y-12">
        {/* Utility Bar: Local Demo Notice + Video Pause/Play + Reset */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[22px] border border-[#E6D7B3] bg-[#FCFBF8]/94 backdrop-blur-md px-4 py-3 sm:px-5 shadow-[0_14px_36px_-20px_rgba(120,86,18,0.2)]">
          <div
            role="status"
            className="flex items-start sm:items-center gap-2.5 text-xs sm:text-sm text-[#5A5140]"
          >
            <Info className="w-4 h-4 text-[#9E7016] shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-[#1B1710]">Local Demo Workspace:</strong> All profile edits, courses, and check-ins save locally in your browser (5 AI roles are simulated locally without a backend).
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
            {(completedLessonIds.length > 0 || inProgressLessonIds.length > 0) && (
              <button
                type="button"
                onClick={onResetProgress}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-[#FAF6EC] hover:bg-[#F3EAD3] text-xs font-semibold text-[#7A5610] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset progress</span>
              </button>
            )}

            {!bgVideoFailed && (
              <button
                type="button"
                onClick={() => setIsBgVideoPlaying((prev) => !prev)}
                aria-label={isBgVideoPlaying ? 'Pause background video' : 'Play background video'}
                aria-pressed={!isBgVideoPlaying}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-xs font-semibold text-[#1B1710] shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
              >
                {isBgVideoPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-[#9E7016]" aria-hidden="true" />
                    <span>Pause video</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-[#9E7016]" aria-hidden="true" />
                    <span>Play video</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* SECTION 2: Adaptive Next-Steps Roadmap Preview */}
        <motion.section
          id="home-learning-path"
          {...revealProps}
          aria-labelledby="learning-path-heading"
          className="scroll-mt-24 rounded-[26px] border border-[#E6D7B3] bg-[#FCFBF8]/94 backdrop-blur-md p-6 sm:p-8 shadow-[0_20px_52px_-20px_rgba(120,86,18,0.22)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#EFE4CA]">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9E7016]">
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                <span>Adaptive Next-Steps Roadmap</span>
              </div>
              <h2
                id="learning-path-heading"
                className="mt-1 font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#1B1710]"
              >
                {adaptiveRoadmap.adaptationHeadline}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-[#6A5F4B] tabular-nums">
                {completedLessonIds.length} of {adaptiveRoadmap.orderedLessons.length} steps done
              </span>
              <button
                type="button"
                onClick={() => onSelectPage('learning-path')}
                className="min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-xs font-semibold text-[#1B1710] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
              >
                <span>Full adaptive roadmap</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#9E7016]" aria-hidden="true" />
              </button>
            </div>
          </div>

          <ol className="divide-y divide-[#EFE4CA] mt-2">
            {adaptiveRoadmap.orderedLessons.slice(0, 6).map((lesson, idx) => {
              const isDone = completedLessonIds.includes(lesson.id);
              const isStarted = !isDone && inProgressLessonIds.includes(lesson.id);
              const isNextUp = nextRecommendedLesson?.id === lesson.id;

              return (
                <li
                  key={lesson.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleLesson(lesson.id)}
                      aria-label={
                        isDone
                          ? `Mark ${lesson.title} incomplete`
                          : `Complete lesson ${lesson.title}`
                      }
                      aria-pressed={isDone}
                      className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center shrink-0 hover:bg-[#FAF5E8] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
                    >
                      <span
                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                          isDone
                            ? 'bg-[#C89B3C] border-[#9E7016] text-white'
                            : 'border-[#D4BE8A] bg-white'
                        }`}
                      >
                        {isDone && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                      </span>
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#6A5F4B]">
                        <span className="font-semibold text-[#1B1710] tabular-nums">
                          Step 0{idx + 1}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-[#9E7016]">{lesson.skill}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{lesson.duration}</span>
                        {isStarted && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-[#9E7016]">In Progress</span>
                          </>
                        )}
                        {isNextUp && !isDone && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-[#9E7016]">Up next</span>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectPage('learning-path')}
                        className={`min-h-[44px] py-1 text-left text-sm sm:text-[15px] font-semibold transition-colors cursor-pointer hover:text-[#9E7016] flex items-center ${
                          isDone ? 'line-through text-[#8D816B]' : 'text-[#1B1710]'
                        }`}
                      >
                        {lesson.title}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    {!isDone && !isStarted && (
                      <button
                        type="button"
                        onClick={() => onStartLesson(lesson.id)}
                        className="min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-xs font-semibold text-[#1B1710] whitespace-nowrap cursor-pointer"
                      >
                        Start
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleLesson(lesson.id)}
                      className={`min-h-[44px] px-5 py-2 rounded-full border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] ${
                        isDone
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          : 'border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-[#1B1710] shadow-xs'
                      }`}
                    >
                      {isDone ? 'Completed' : 'Mark complete'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </motion.section>

        {/* SECTION 3: Visual Summary of Current Skills vs. Missing Role Gaps */}
        <motion.section
          {...revealProps}
          aria-labelledby="skills-summary-heading"
          className="rounded-[26px] border border-[#E6D7B3] bg-[#FCFBF8]/94 backdrop-blur-md p-6 sm:p-8 shadow-[0_20px_52px_-20px_rgba(120,86,18,0.22)]"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#EFE4CA]">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9E7016]">
                <Compass className="w-4 h-4" aria-hidden="true" />
                <span>Live Skill-Gap Analysis · {profile.careerGoal}</span>
              </div>
              <h2
                id="skills-summary-heading"
                className="mt-1 font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#1B1710]"
              >
                Already Have vs. Developing &amp; Missing Skills
              </h2>
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-[#F7F2E5] border border-[#E6D7B3] rounded-[14px] self-start md:self-auto">
              {(
                [
                  { id: 'all', label: `All (${careerMatch.allRows.length})` },
                  { id: 'have', label: `Already Have (${careerMatch.alreadyHave.length})` },
                  { id: 'gaps', label: `Gaps (${remainingGapsCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSkillFilter(tab.id)}
                  className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-[10px] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] ${
                    skillFilter === tab.id
                      ? 'bg-white text-[#1B1710] shadow-xs border border-[#E6D7B3]'
                      : 'text-[#6A5F4B] hover:text-[#1B1710]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleSkillRows.map((row) => {
              const pct = Math.min(100, Math.round((row.effectiveLevel / row.requirement.targetLevel) * 100));
              const label =
                row.status === 'already-have'
                  ? 'Already Have'
                  : row.status === 'developing'
                  ? 'Developing'
                  : 'Missing';
              return (
                <div
                  key={row.requirement.id}
                  className="rounded-2xl border border-[#E6D7B3] bg-white p-4 space-y-2.5 shadow-[0_8px_24px_-18px_rgba(120,86,18,0.16)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold text-[#1B1710]">
                      {row.requirement.skill}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        row.status === 'already-have'
                          ? 'text-emerald-700'
                          : row.status === 'developing'
                          ? 'text-[#9E7016]'
                          : 'text-rose-700'
                      }`}
                    >
                      {label}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#6A5F4B] tabular-nums">
                      <span>{row.requirement.priority}</span>
                      <span>
                        {row.effectiveLevel}% / {row.requirement.targetLevel}% target
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#EFE6CF] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          row.status === 'already-have'
                            ? 'bg-emerald-600'
                            : row.status === 'developing'
                            ? 'bg-gradient-to-r from-[#DFB75B] to-[#B68623]'
                            : 'bg-rose-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-[#5A5140] leading-relaxed">{row.requirement.why}</p>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* SECTION 4: Simulated 5-Role AI Learning Team */}
        <motion.section
          {...revealProps}
          aria-labelledby="ai-team-heading"
          className="rounded-[26px] border border-[#E6D7B3] bg-[#FCFBF8]/94 backdrop-blur-md p-6 sm:p-8 shadow-[0_20px_52px_-20px_rgba(120,86,18,0.22)] space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#EFE4CA]">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9E7016]">
                <MessageSquare className="w-4 h-4" aria-hidden="true" />
                <span>5-Role Learning Team · Live Gemini AI</span>
              </div>
              <h2
                id="ai-team-heading"
                className="mt-1 font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#1B1710]"
              >
                How Your 5 AI Agents Collaborate
              </h2>
            </div>

            {onRefreshAgents && (
              <button
                type="button"
                disabled={isAnalyzingAgents}
                onClick={onRefreshAgents}
                className="self-start sm:self-auto inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-[#FAF6EC] hover:bg-[#F3EAD3] disabled:opacity-60 text-xs font-semibold text-[#1B1710] transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
              >
                {isAnalyzingAgents ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9E7016]" aria-hidden="true" />
                    <span>Analyzing with Gemini...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 text-[#9E7016]" aria-hidden="true" />
                    <span>Refresh 5 AI Agents</span>
                  </>
                )}
              </button>
            )}
          </div>

          {agentAnalysisError && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-[13px] text-rose-800 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{agentAnalysisError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {agentInsights.map((agent) => (
                <div
                  key={agent.role}
                  className="rounded-2xl border border-[#E6D7B3] bg-white p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-display text-sm font-bold text-[#1B1710]">
                      {agent.role}
                    </span>
                    <span className="text-[#9E7016] font-medium">
                      {agent.focus}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-[#6A5F4B]">{agent.status}</div>
                  <p className="text-xs sm:text-[13px] text-[#5A5140] leading-relaxed">
                    {agent.contribution}
                  </p>
                </div>
              ))}
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-[#E6D7B3] bg-[#FAF6EC] p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-sm font-bold text-[#1B1710]">
                  Ask AI Mentor
                </h3>
                <span className="text-xs font-semibold text-[#9E7016]">Live Gemini AI</span>
              </div>

              <div aria-live="polite" className="space-y-2.5 max-h-[210px] overflow-y-auto pr-1">
                {mentorMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed whitespace-pre-line ${
                      msg.isError
                        ? 'bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2'
                        : msg.role === 'mentor'
                        ? 'bg-white border border-[#E6D7B3] text-[#1B1710]'
                        : 'bg-gradient-to-b from-[#ECD082] to-[#C89B3C] text-[#1A150B] font-medium ml-6'
                    }`}
                  >
                    {msg.isError && (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <span>{msg.text}</span>
                  </div>
                ))}

                {isMentorSending && (
                  <div className="rounded-xl px-3.5 py-2.5 bg-white border border-[#E6D7B3] text-xs text-[#6A5F4B] inline-flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9E7016]" aria-hidden="true" />
                    <span>Thinking with Gemini...</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {MENTOR_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isMentorSending}
                    onClick={() => void sendMentorQuestion(prompt)}
                    className={`min-h-[44px] text-left text-xs px-3.5 py-2 rounded-[14px] border transition-colors cursor-pointer disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] ${
                      prompt === DEFAULT_QUICK_ASK_PROMPT
                        ? 'border-[#C89B3C] bg-[#FAF3DE] font-semibold text-[#1B1710] hover:bg-[#F3E7C5]'
                        : 'border-[#DEC99A] bg-white hover:bg-[#F7F1E2] text-[#3C3426]'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form onSubmit={handleMentorSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={mentorInput}
                  disabled={isMentorSending}
                  onChange={(e) => setMentorInput(e.target.value)}
                  placeholder="Ask a study question..."
                  aria-label="Ask Gemini AI Mentor"
                  className="flex-1 min-h-[44px] rounded-[14px] border border-[#E2CFA3] bg-white px-3.5 py-2 text-sm text-[#1B1710] placeholder:text-[#9A8E78] focus:outline-none focus:border-[#C89B3C] focus:ring-2 focus:ring-[#C89B3C]/40 disabled:opacity-65"
                />
                <button
                  type="submit"
                  disabled={isMentorSending || !mentorInput.trim()}
                  aria-label="Send question"
                  className="min-h-[44px] min-w-[44px] px-3.5 rounded-[14px] border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] disabled:opacity-55 text-[#1A150B] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
                >
                  {isMentorSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </motion.section>

        {/* SECTION 5: Live Learner Profile Summary + Optional User-Controlled Campus Tour */}
        <motion.section
          {...revealProps}
          aria-labelledby="profile-heading"
          className="rounded-[26px] border border-[#E6D7B3] bg-[#FCFBF8]/94 backdrop-blur-md p-6 sm:p-8 shadow-[0_20px_52px_-20px_rgba(120,86,18,0.22)] space-y-5"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9E7016]">
                <User className="w-4 h-4" aria-hidden="true" />
                <span>Learner Profile Summary</span>
              </div>
              <h2 id="profile-heading" className="font-display text-xl font-extrabold text-[#1B1710]">
                {profile.name || 'Learner'} · Target: {profile.careerGoal}
              </h2>
              <p className="text-sm text-[#5A5140] leading-relaxed">
                {profile.skills.length} skill(s), {profile.projects.length} project(s), and{' '}
                {profile.certifications.length} certification(s) saved locally. Edit skills, projects, or role requirements anytime from Profile.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowWalkthrough((prev) => !prev)}
                className="inline-flex items-center gap-1.5 min-h-[46px] px-4 py-2.5 rounded-full border border-[#DEC99A] bg-[#FAF6EC] hover:bg-[#F3EAD3] text-xs font-semibold text-[#7A5610] transition-colors whitespace-nowrap cursor-pointer"
              >
                <Film className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{showWalkthrough ? 'Hide campus preview' : 'Campus walkthrough video'}</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectPage('profile')}
                className="min-h-[46px] px-5 py-2.5 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-xs font-semibold text-[#1B1710] shadow-xs transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
              >
                Edit Profile &amp; Skills
              </button>
              <button
                type="button"
                onClick={onExitDemo}
                className="min-h-[46px] px-5 py-2.5 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] text-xs font-semibold text-[#1A150B] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
              >
                Return to sign in
              </button>
            </div>
          </div>

          {showWalkthrough && (
            <div className="rounded-2xl overflow-hidden border border-[#E6D7B3] bg-[#1B1710]">
              <video
                src={CAMPUS_WALKTHROUGH_VIDEO_SRC}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[380px] object-cover"
              />
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}
