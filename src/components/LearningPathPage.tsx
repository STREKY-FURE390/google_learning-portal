import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Compass,
  GitBranch,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  AssessmentState,
  AssessmentStatus,
  LEARNING_PATH_FALLBACK_VIDEO_SRC,
  LEARNING_PATH_VIDEO_SRC,
  LearnerProfile,
  LessonItem,
  PortalPageId,
  SimulatedAgentInsight,
} from '../data/portalData';
import { CareerMatchAnalysis } from '../services/learningEngine';
import { LearningPathChatbot } from './LearningPathChatbot';

interface LearningPathPageProps {
  profile: LearnerProfile;
  careerMatch: CareerMatchAnalysis;
  adaptiveRoadmap: {
    orderedLessons: LessonItem[];
    recommendedNext: LessonItem | null;
    adaptationHeadline: string;
    adaptationExplanation: string;
  };
  assessment: AssessmentState;
  agentInsights: SimulatedAgentInsight[];
  completedLessonIds: string[];
  inProgressLessonIds: string[];
  onUpdateAssessment: (status: AssessmentStatus, focusTopic?: string) => void;
  onStartLesson: (lessonId: string) => void;
  onToggleLesson: (lessonId: string) => void;
  onResetProgress: () => void;
  onSelectPage: (page: PortalPageId) => void;
  onScrollToTarget?: (targetId: string) => void;
}

export function LearningPathPage({
  profile,
  careerMatch,
  adaptiveRoadmap,
  assessment,
  agentInsights,
  completedLessonIds,
  inProgressLessonIds,
  onUpdateAssessment,
  onStartLesson,
  onToggleLesson,
  onResetProgress,
  onSelectPage,
  onScrollToTarget,
}: LearningPathPageProps) {
  const prefersReducedMotion = useReducedMotion();
  const roadmapSectionRef = useRef<HTMLElement | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(
    () => adaptiveRoadmap.recommendedNext?.id ?? adaptiveRoadmap.orderedLessons[0]?.id ?? null
  );
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [heroVideoSrc, setHeroVideoSrc] = useState(LEARNING_PATH_VIDEO_SRC);
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);

  const { orderedLessons, recommendedNext, adaptationHeadline, adaptationExplanation } = adaptiveRoadmap;

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video || heroVideoFailed) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    if (isVideoPlaying) {
      if (video.paused) {
        video.play().catch(() => {
          // Autoplay handled silently if browser restricts
        });
      }
    } else if (!video.paused) {
      video.pause();
    }
  }, [heroVideoSrc, heroVideoFailed, isVideoPlaying]);

  // Scroll-linked subtle progress indicator along the roadmap rail
  const { scrollYProgress } = useScroll({
    target: roadmapSectionRef,
    offset: ['start 75%', 'end 65%'],
  });
  const railScaleY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? [1, 1] : [0.08, 1]
  );

  const handleSelectCheckIn = (nextStatus: AssessmentStatus) => {
    onUpdateAssessment(nextStatus, assessment.focusTopic);
    if (nextStatus === 'struggled') {
      setExpandedLessonId('lesson-js-review');
    } else if (nextStatus === 'confident') {
      const target = orderedLessons.find(
        (l) => l.skill.toLowerCase() === 'react' || l.skill.toLowerCase() === 'node.js'
      );
      if (target) setExpandedLessonId(target.id);
    }
  };

  const completedInPathCount = orderedLessons.filter((l) =>
    completedLessonIds.includes(l.id)
  ).length;

  const scrollToElement = (id: string) => {
    if (onScrollToTarget) {
      onScrollToTarget(id);
      return;
    }
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const handleStartRecommended = () => {
    if (!recommendedNext) {
      scrollToElement('roadmap-section');
      return;
    }
    onStartLesson(recommendedNext.id);
    setExpandedLessonId(recommendedNext.id);
    scrollToElement(`step-${recommendedNext.id}`);
  };

  const revealProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.06 },
        transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const },
      };

  const progressCoachNote =
    agentInsights.find((a) => a.role === 'Progress Coach')?.contribution ?? '';

  return (
    <div id="learning-path-top" className="min-h-screen bg-[#FCFBF8] text-[#1B1710]">
      {/* HERO AREA WITH CLEARLY VISIBLE AUTOPLAYING BACKGROUND VIDEO (NO BLUR, NO HEAVY DARK OVERLAY) */}
      <section
        aria-labelledby="learner-goal-heading"
        className="relative w-full min-h-[540px] sm:min-h-[600px] overflow-hidden border-b border-[#E6D7B3] bg-[#EFE6CF] flex flex-col"
      >
        {!heroVideoFailed && (
          <video
            ref={heroVideoRef}
            src={heroVideoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onError={() => {
              if (heroVideoSrc !== LEARNING_PATH_FALLBACK_VIDEO_SRC) {
                setHeroVideoSrc(LEARNING_PATH_FALLBACK_VIDEO_SRC);
              } else {
                setHeroVideoFailed(true);
              }
            }}
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
          />
        )}

        {/* Subtle light edge tint only so video details remain crisp & unobstructed */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              'linear-gradient(180deg, rgba(252,251,248,0.18) 0%, rgba(252,251,248,0.04) 48%, rgba(252,251,248,0.32) 100%)',
          }}
        />

        <div className="relative z-10 flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10 sm:pt-24 sm:pb-12 flex flex-col justify-between gap-6 sm:gap-8">
          {/* Top Breadcrumb, Video Pause/Play & Reset Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onSelectPage('home')}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-[#FCFBF8]/90 hover:bg-white text-xs font-semibold text-[#1B1710] shadow-sm transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#9E7016]" aria-hidden="true" />
              <span>Back to Home dashboard</span>
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              {!heroVideoFailed && (
                <button
                  type="button"
                  onClick={() => setIsVideoPlaying((prev) => !prev)}
                  aria-label={isVideoPlaying ? 'Pause background video' : 'Play background video'}
                  aria-pressed={!isVideoPlaying}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-[#FCFBF8]/92 hover:bg-white text-xs font-semibold text-[#1B1710] shadow-sm transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
                >
                  {isVideoPlaying ? (
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

              {(completedInPathCount > 0 ||
                inProgressLessonIds.length > 0 ||
                assessment.status !== 'steady') && (
                <button
                  type="button"
                  onClick={() => {
                    onResetProgress();
                    setExpandedLessonId(orderedLessons[0]?.id ?? null);
                  }}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-[#FAF6EC]/92 hover:bg-[#F3EAD3] text-xs font-semibold text-[#7A5610] shadow-sm whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset path &amp; check-in</span>
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Top-of-Page Gemini AI Study Chatbot */}
          <LearningPathChatbot
            profile={profile}
            careerMatch={careerMatch}
            recommendedNext={recommendedNext}
            assessment={assessment}
            completedCount={completedInPathCount}
            inProgressCount={inProgressLessonIds.length}
            totalModules={orderedLessons.length}
          />

          {/* Goal & Readiness Content Grid with Light Translucent Overlays Behind Text & Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            {/* Left Column: Goal Narrative */}
            <div className="lg:col-span-7 rounded-[24px] border border-[#E6D7B3] bg-[#FCFBF8]/88 p-6 sm:p-8 shadow-[0_18px_48px_-20px_rgba(40,28,8,0.28)] flex flex-col justify-between space-y-5">
              <div className="space-y-3.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#9E7016]">
                  <span>{profile.name || 'Learner'}’s Learning Path</span>
                  <span aria-hidden="true">·</span>
                  <span>Target Role: {profile.careerGoal}</span>
                </div>

                <h1
                  id="learner-goal-heading"
                  className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#1B1710] leading-[1.15] [text-wrap:balance]"
                >
                  {profile.name || 'Your'} roadmap toward {profile.careerGoal}
                </h1>

                <p className="text-sm sm:text-[15px] text-[#3E372A] leading-relaxed max-w-[60ch]">
                  {careerMatch.summaryText} Each step below includes hands-on lesson steps and a practical exercise that adapt to your saved assessment check-in.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleStartRecommended}
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] text-[#1A150B] text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_24px_rgba(166,120,30,0.24)] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] focus-visible:ring-offset-2"
                >
                  <span>
                    {recommendedNext
                      ? `Start next: ${recommendedNext.skill}`
                      : 'Review completed roadmap'}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToElement('checkin-section')}
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-full border border-[#DEC99A] bg-white/95 hover:bg-[#FAF6EC] text-sm font-semibold text-[#1B1710] shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
                >
                  <span>Update assessment check-in</span>
                </button>
              </div>
            </div>

            {/* Right Column: Live Progress Summary Card */}
            <aside
              aria-label="Learner readiness summary"
              className="lg:col-span-5 rounded-[24px] border border-[#E6D7B3] bg-[#FCFBF8]/88 p-6 sm:p-8 shadow-[0_18px_48px_-20px_rgba(40,28,8,0.28)] flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 text-xs text-[#5A5140]">
                  <span className="font-semibold text-[#9E7016]">{profile.careerGoal} Match</span>
                  <span className="tabular-nums">
                    {completedInPathCount} / {orderedLessons.length} steps · {inProgressLessonIds.length} started
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-display text-4xl font-extrabold text-[#1B1710] tabular-nums">
                    {careerMatch.matchPercent}%
                  </span>
                  <span className="text-xs font-medium text-[#5A5140] text-right">
                    {assessment.status === 'struggled'
                      ? 'Adaptive mode · Review moved earlier'
                      : assessment.status === 'confident'
                      ? 'Accelerated · Next core skill highlighted'
                      : 'Standard ordered track'}
                  </span>
                </div>

                <div
                  className="h-3 w-full rounded-full bg-[#EFE6CF] overflow-hidden"
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
              </div>

              <div className="pt-4 border-t border-[#E6D7B3] space-y-1.5">
                <div className="text-xs font-semibold text-[#9E7016]">Recommended Next Step</div>
                {recommendedNext ? (
                  <div className="space-y-1">
                    <div className="font-display text-base font-bold text-[#1B1710]">
                      {recommendedNext.title}
                    </div>
                    <div className="text-xs text-[#4C4332] tabular-nums">
                      {recommendedNext.skill} · {recommendedNext.duration} · {recommendedNext.outcome}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-emerald-700">
                    All roadmap lessons completed — add new courses or update projects on your Profile.
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <main className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24 md:pt-12 md:pb-14 space-y-10 sm:space-y-12">
        {/* SECTION 2: LIVE STRENGTHS & SKILL-GAP COMPARISON */}
        <motion.section
          {...revealProps}
          aria-labelledby="current-skills-heading"
          className="space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9E7016]">
                <Layers className="w-4 h-4" aria-hidden="true" />
                <span>Synced From Your Profile</span>
              </div>
              <h2
                id="current-skills-heading"
                className="mt-1 font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#1B1710]"
              >
                {profile.name || 'Learner'}’s Strengths vs. {profile.careerGoal} Gaps
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onSelectPage('profile')}
              className="self-start sm:self-auto min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-xs font-semibold text-[#1B1710] cursor-pointer"
            >
              Edit skills &amp; goal in Profile →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-[#E6D7B3] bg-white p-5 space-y-3 shadow-[0_10px_28px_-20px_rgba(120,86,18,0.16)]">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-emerald-800">Already Have ({careerMatch.alreadyHave.length})</span>
                <span className="text-[#6A5F4B]">Strong</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {careerMatch.alreadyHave.length > 0 ? (
                  careerMatch.alreadyHave.map((row) => (
                    <span
                      key={row.requirement.id}
                      className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800"
                    >
                      {row.requirement.skill} ({row.effectiveLevel}%)
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-[#5A5140]">Complete lessons or add skills in Profile.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#E6D7B3] bg-white p-5 space-y-3 shadow-[0_10px_28px_-20px_rgba(120,86,18,0.16)]">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-[#9E7016]">Developing ({careerMatch.developing.length})</span>
                <span className="text-[#6A5F4B]">In progress</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {careerMatch.developing.length > 0 ? (
                  careerMatch.developing.map((row) => (
                    <span
                      key={row.requirement.id}
                      className="px-3 py-1 rounded-full bg-[#FAF3DE] border border-[#E2CFA3] text-xs font-semibold text-[#8E6514]"
                    >
                      {row.requirement.skill} ({row.effectiveLevel}%)
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-[#5A5140]">No developing skills remaining.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#E6D7B3] bg-white p-5 space-y-3 shadow-[0_10px_28px_-20px_rgba(120,86,18,0.16)]">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-rose-800">Missing Gaps ({careerMatch.missing.length})</span>
                <span className="text-[#6A5F4B]">Priority focus</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {careerMatch.missing.length > 0 ? (
                  careerMatch.missing.map((row) => (
                    <span
                      key={row.requirement.id}
                      className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800"
                    >
                      {row.requirement.skill}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-emerald-700 font-medium">Zero missing role skills!</p>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {/* SECTION 3: PERSISTENT ADAPTIVE ASSESSMENT CHECK-IN */}
        <motion.section
          id="checkin-section"
          {...revealProps}
          aria-labelledby="checkin-heading"
          className="scroll-mt-24 rounded-[24px] border border-[#E6D7B3] bg-white p-6 sm:p-8 shadow-[0_18px_48px_-22px_rgba(120,86,18,0.16)] space-y-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9E7016]">
                <Compass className="w-4 h-4" aria-hidden="true" />
                <span>Assessment Check-In · Saved Across Reloads</span>
              </div>
              <h2
                id="checkin-heading"
                className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#1B1710]"
              >
                How confident does {profile.name || 'the learner'} feel with {assessment.focusTopic}?
              </h2>
              <p className="text-sm text-[#5A5140]">
                Select a check-in response to immediately adapt the roadmap sequence and recommendation. Last updated: {assessment.updatedAt}.
              </p>
            </div>
          </div>

          <div
            role="radiogroup"
            aria-label="Assessment check-in"
            className="grid grid-cols-1 md:grid-cols-3 gap-3.5"
          >
            <button
              type="button"
              role="radio"
              aria-checked={assessment.status === 'struggled'}
              onClick={() => handleSelectCheckIn('struggled')}
              className={`min-h-[44px] text-left rounded-[18px] border p-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] ${
                assessment.status === 'struggled'
                  ? 'border-[#C89B3C] bg-[#FAF3DE] shadow-xs'
                  : 'border-[#E6D7B3] bg-[#FCFBF8] hover:border-[#C89B3C]/65'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-[#1B1710]">
                  Struggled with practice
                </span>
                <span
                  aria-hidden="true"
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    assessment.status === 'struggled'
                      ? 'border-[#9E7016] bg-[#C89B3C]'
                      : 'border-[#D4BE8A] bg-white'
                  }`}
                >
                  {assessment.status === 'struggled' && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[#5A5140] leading-relaxed">
                Moves a focused review lesson earlier in the roadmap ahead of advanced modules.
              </p>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={assessment.status === 'steady'}
              onClick={() => handleSelectCheckIn('steady')}
              className={`min-h-[44px] text-left rounded-[18px] border p-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] ${
                assessment.status === 'steady'
                  ? 'border-[#C89B3C] bg-[#FAF3DE] shadow-xs'
                  : 'border-[#E6D7B3] bg-[#FCFBF8] hover:border-[#C89B3C]/65'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-[#1B1710]">
                  Steady progress
                </span>
                <span
                  aria-hidden="true"
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    assessment.status === 'steady'
                      ? 'border-[#9E7016] bg-[#C89B3C]'
                      : 'border-[#D4BE8A] bg-white'
                  }`}
                >
                  {assessment.status === 'steady' && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[#5A5140] leading-relaxed">
                Keeps the ordered {profile.careerGoal} progression aligned with missing role gaps.
              </p>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={assessment.status === 'confident'}
              onClick={() => handleSelectCheckIn('confident')}
              className={`min-h-[44px] text-left rounded-[18px] border p-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] ${
                assessment.status === 'confident'
                  ? 'border-[#C89B3C] bg-[#FAF3DE] shadow-xs'
                  : 'border-[#E6D7B3] bg-[#FCFBF8] hover:border-[#C89B3C]/65'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-[#1B1710]">
                  Feels confident
                </span>
                <span
                  aria-hidden="true"
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    assessment.status === 'confident'
                      ? 'border-[#9E7016] bg-[#C89B3C]'
                      : 'border-[#D4BE8A] bg-white'
                  }`}
                >
                  {assessment.status === 'confident' && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[#5A5140] leading-relaxed">
                Recommends the next framework/backend milestone so you advance without delay.
              </p>
            </button>
          </div>

          {/* Live Check-In Adaptation Explanation */}
          <div
            role="status"
            aria-live="polite"
            className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              assessment.status === 'struggled'
                ? 'border-[#C89B3C]/65 bg-[#FAF3DE] text-[#1B1710]'
                : assessment.status === 'confident'
                ? 'border-[#D9C082] bg-[#FAF6EC] text-[#1B1710]'
                : 'border-[#E6D7B3] bg-[#FCFBF8] text-[#3C3426]'
            }`}
          >
            <div className="flex items-start gap-3">
              {assessment.status === 'struggled' ? (
                <GitBranch className="w-5 h-5 text-[#9E7016] shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <Sparkles className="w-5 h-5 text-[#9E7016] shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div className="space-y-1 text-sm">
                <div className="font-semibold text-[#1B1710]">{adaptationHeadline}</div>
                <p className="text-xs sm:text-[13px] text-[#5A5140] leading-relaxed">
                  {adaptationExplanation}
                </p>
                {progressCoachNote && (
                  <p className="text-[11px] font-medium text-[#8E6514]">
                    Progress Coach: {progressCoachNote}
                  </p>
                )}
              </div>
            </div>

            {recommendedNext && (
              <button
                type="button"
                onClick={handleStartRecommended}
                className="self-start sm:self-center shrink-0 min-h-[44px] px-5 py-2.5 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] text-[#1A150B] text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
              >
                Jump to {recommendedNext.skill}
              </button>
            )}
          </div>
        </motion.section>

        {/* SECTION 4: ORDERED ARCHITECTURAL ROADMAP */}
        <section
          id="roadmap-section"
          ref={roadmapSectionRef}
          aria-labelledby="ordered-roadmap-heading"
          className="scroll-mt-24 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9E7016]">
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                <span>Ordered Sequence</span>
              </div>
              <h2
                id="ordered-roadmap-heading"
                className="mt-1 font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#1B1710]"
              >
                {profile.careerGoal} Learning Roadmap
              </h2>
            </div>
            <span className="text-xs font-medium text-[#6A5F4B] tabular-nums">
              {completedInPathCount} of {orderedLessons.length} lessons completed · {inProgressLessonIds.length} in progress
            </span>
          </div>

          <div className="relative pl-6 sm:pl-9">
            <div
              aria-hidden="true"
              className="absolute left-2.5 sm:left-4 top-3 bottom-3 w-[2px] bg-[#E8DCC0] rounded-full"
            />
            <motion.div
              aria-hidden="true"
              style={{ scaleY: railScaleY, transformOrigin: 'top center' }}
              className="absolute left-2.5 sm:left-4 top-3 bottom-3 w-[2px] bg-gradient-to-b from-[#DFB75B] to-[#8E6412] rounded-full"
            />

            <ol className="space-y-4">
              {orderedLessons.map((lesson, idx) => {
                const isDone = completedLessonIds.includes(lesson.id);
                const isStarted = !isDone && inProgressLessonIds.includes(lesson.id);
                const isRecommended = recommendedNext?.id === lesson.id;
                const isExpanded = expandedLessonId === lesson.id;
                const stepNumber = String(idx + 1).padStart(2, '0');

                return (
                  <motion.li
                    key={lesson.id}
                    id={`step-${lesson.id}`}
                    layout={!prefersReducedMotion}
                    initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.06 }}
                    transition={{
                      duration: prefersReducedMotion ? 0.01 : 0.36,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`scroll-mt-28 relative rounded-[22px] border bg-white p-5 sm:p-6 transition-colors ${
                      isRecommended
                        ? 'border-[#C89B3C] shadow-[0_18px_42px_-18px_rgba(166,120,30,0.28)]'
                        : lesson.isAdaptiveReview
                        ? 'border-[#C89B3C]/80 bg-[#FCF8EB]'
                        : 'border-[#E6D7B3] shadow-[0_10px_28px_-20px_rgba(120,86,18,0.16)]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute -left-[22px] sm:-left-[30px] top-7 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isDone
                          ? 'bg-[#8E6412] border-[#8E6412]'
                          : isRecommended
                          ? 'bg-[#C89B3C] border-[#FCFBF8] ring-2 ring-[#C89B3C]/45'
                          : isStarted
                          ? 'bg-[#FAF3DE] border-[#C89B3C]'
                          : 'bg-white border-[#D4BE8A]'
                      }`}
                    />

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6A5F4B]">
                          <span className="font-semibold text-[#1B1710] tabular-nums">
                            Step {stepNumber}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[#9E7016]">{lesson.skill}</span>
                          <span aria-hidden="true">·</span>
                          <span>{lesson.level}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{lesson.duration}</span>
                          {lesson.isAdaptiveReview && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-[#9E7016]">
                                Moved earlier from check-in
                              </span>
                            </>
                          )}
                          {isRecommended && !isDone && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-[#9E7016]">
                                {assessment.status === 'confident' ? 'Recommended next' : 'Up next'}
                              </span>
                            </>
                          )}
                          {isStarted && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-[#9E7016]">In Progress</span>
                            </>
                          )}
                          {isDone && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-emerald-700">Completed</span>
                            </>
                          )}
                        </div>

                        <h3 className="font-display text-lg sm:text-xl font-bold text-[#1B1710] leading-snug">
                          {lesson.title}
                        </h3>

                        <p className="text-sm text-[#5A5140] leading-relaxed max-w-[68ch]">
                          {lesson.summary}
                        </p>

                        <div className="text-xs text-[#6A5F4B]">{lesson.outcome}</div>
                      </div>

                      {/* Lesson Actions */}
                      <div className="flex flex-wrap md:flex-col items-center md:items-end gap-2.5 shrink-0">
                        {!isDone && !isStarted && (
                          <button
                            type="button"
                            onClick={() => {
                              onStartLesson(lesson.id);
                              setExpandedLessonId(lesson.id);
                            }}
                            className="min-h-[44px] px-5 py-2 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-xs font-semibold text-[#1B1710] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
                          >
                            <Play className="w-3.5 h-3.5 text-[#9E7016]" aria-hidden="true" />
                            <span>Start lesson</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onToggleLesson(lesson.id)}
                          aria-pressed={isDone}
                          className={`min-h-[44px] px-5 py-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] ${
                            isDone
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                              : isRecommended
                              ? 'border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] text-[#1A150B] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]'
                              : 'border border-[#DEC99A] bg-[#FAF6EC] hover:bg-[#F3EAD3] text-[#1B1710]'
                          }`}
                        >
                          {isDone ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Completed</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#8E6412]" aria-hidden="true" />
                              <span>Complete lesson</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedLessonId((curr) => (curr === lesson.id ? null : lesson.id))
                          }
                          aria-expanded={isExpanded}
                          className="min-h-[44px] px-4 py-2 rounded-full border border-[#E6D7B3] bg-white hover:bg-[#FAF5E8] text-xs font-semibold text-[#5A5140] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
                        >
                          <span>{isExpanded ? 'Hide steps' : 'View steps & exercise'}</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Lesson Steps, Practical Exercise & Optional User-Controlled Video */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                          transition={{ duration: prefersReducedMotion ? 0.01 : 0.2 }}
                          className="mt-4 pt-4 border-t border-[#EFE4CA] space-y-4"
                        >
                          <div>
                            <div className="text-xs font-semibold text-[#9E7016] mb-2">
                              Lesson Steps
                            </div>
                            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              {lesson.steps.map((stepText, sIdx) => (
                                <li
                                  key={`${lesson.id}-step-${sIdx}`}
                                  className="rounded-xl bg-[#FAF6EC] border border-[#E6D7B3] px-3.5 py-2.5 text-xs text-[#4C4332] leading-relaxed"
                                >
                                  <span className="font-semibold text-[#9E7016] mr-1">
                                    0{sIdx + 1}.
                                  </span>
                                  {stepText}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-xl border border-[#E2CFA3] bg-[#FCFBF8] p-3.5 space-y-1">
                            <div className="text-xs font-semibold text-[#9E7016]">
                              Practical Exercise
                            </div>
                            <p className="text-xs sm:text-[13px] text-[#1B1710] leading-relaxed">
                              {lesson.exercise}
                            </p>
                          </div>

                          {lesson.videoUrl && (
                            <div className="rounded-xl overflow-hidden border border-[#E6D7B3] bg-[#1B1710]">
                              <video
                                src={lesson.videoUrl}
                                controls
                                playsInline
                                preload="metadata"
                                className="w-full max-h-[320px] object-cover"
                              />
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </section>
      </main>
    </div>
  );
}
