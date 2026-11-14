/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Lenis from 'lenis';
import { useReducedMotion } from 'motion/react';
import { CoursesPage } from './components/CoursesPage';
import { HomeDashboard } from './components/HomeDashboard';
import { HomeVideoGate } from './components/HomeVideoGate';
import { LearningPathPage } from './components/LearningPathPage';
import { LoginPage } from './components/LoginPage';
import { PageTransitionPanels, ShutterPhase } from './components/PageTransitionPanels';
import { PortalNav } from './components/PortalNav';
import { ProfilePage } from './components/ProfilePage';
import {
  AssessmentState,
  AssessmentStatus,
  CareerGoalId,
  CareerRoleRequirement,
  DEFAULT_ASSESSMENT,
  DEFAULT_LEARNER_PROFILE,
  DEFAULT_ROLE_REQUIREMENTS,
  FEATURED_LESSONS,
  LearnerProfile,
  LessonItem,
  PortalPageId,
  SimulatedAgentInsight,
} from './data/portalData';
import {
  analyzeAgentTeamWithGemini,
  analyzeCareerMatch,
  buildAdaptiveRoadmap,
  rankRecommendedCourses,
  simulateAgentTeam,
} from './services/learningEngine';

// ============================================================================
// LOCAL DEMO PERSISTENCE KEYS
// Replace localStorage load/save hooks below with your API calls when ready.
// ============================================================================
const STORAGE_KEYS = {
  profile: 'devpath_profile_v1',
  roleRequirements: 'devpath_role_reqs_v1',
  courses: 'devpath_courses_v1',
  completedLessons: 'devpath_completed_v1',
  inProgressLessons: 'devpath_started_v1',
  assessment: 'devpath_assessment_v1',
} as const;

function readStorage<T>(key: string, fallback: T, validate?: (value: unknown) => value is T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota/access errors
  }
}

function normalizeCourseRecord(item: LessonItem, index: number): LessonItem {
  return {
    ...item,
    order: item.order || index + 1,
    steps:
      Array.isArray(item.steps) && item.steps.length > 0
        ? item.steps
        : [
            `Review core ${item.skill} concepts and patterns.`,
            `Walk through a guided example building toward ${item.title}.`,
            `Complete the hands-on exercise and verify your output.`,
          ],
    exercise:
      item.exercise && item.exercise.trim()
        ? item.exercise
        : `Build a small practical ${item.skill} exercise applying ${item.title}.`,
    videoUrl: typeof item.videoUrl === 'string' && item.videoUrl.trim() ? item.videoUrl.trim() : undefined,
  };
}

function loadInitialCourses(): LessonItem[] {
  const loaded = readStorage<LessonItem[]>(
    STORAGE_KEYS.courses,
    FEATURED_LESSONS,
    (v): v is LessonItem[] => Array.isArray(v) && v.length > 0
  );
  return loaded.map(normalizeCourseRecord);
}

function loadInitialProfile(): LearnerProfile {
  return readStorage<LearnerProfile>(
    STORAGE_KEYS.profile,
    DEFAULT_LEARNER_PROFILE,
    (v): v is LearnerProfile =>
      Boolean(v) &&
      typeof v === 'object' &&
      typeof (v as LearnerProfile).name === 'string' &&
      Array.isArray((v as LearnerProfile).skills) &&
      Array.isArray((v as LearnerProfile).projects) &&
      Array.isArray((v as LearnerProfile).certifications)
  );
}

function loadInitialRoleRequirements(): Record<CareerGoalId, CareerRoleRequirement> {
  return readStorage<Record<CareerGoalId, CareerRoleRequirement>>(
    STORAGE_KEYS.roleRequirements,
    DEFAULT_ROLE_REQUIREMENTS,
    (v): v is Record<CareerGoalId, CareerRoleRequirement> =>
      Boolean(v) &&
      typeof v === 'object' &&
      Boolean((v as Record<string, unknown>)['Full Stack Developer']) &&
      Boolean((v as Record<string, unknown>)['Frontend Developer']) &&
      Boolean((v as Record<string, unknown>)['Backend Developer'])
  );
}

function loadInitialStringList(key: string): string[] {
  return readStorage<string[]>(key, [], (v): v is string[] => Array.isArray(v));
}

function loadInitialAssessment(): AssessmentState {
  return readStorage<AssessmentState>(
    STORAGE_KEYS.assessment,
    DEFAULT_ASSESSMENT,
    (v): v is AssessmentState =>
      Boolean(v) &&
      typeof v === 'object' &&
      ((v as AssessmentState).status === 'steady' ||
        (v as AssessmentState).status === 'struggled' ||
        (v as AssessmentState).status === 'confident')
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-[#FCFBF8] text-[#1B1710] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-[#E6D7B3] bg-white p-6 space-y-4 shadow-[0_18px_48px_-22px_rgba(120,86,18,0.2)]">
            <h1 className="text-lg font-bold">Unable to display view</h1>
            <p className="text-sm text-[#5A5140]">{this.state.errorMessage}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[48px] px-6 py-2.5 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] text-[#1A150B] text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] cursor-pointer"
            >
              Reload page
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

const VALID_PAGES: PortalPageId[] = ['home', 'learning-path', 'courses', 'profile'];

function getPageFromLocation(): PortalPageId {
  const hash = window.location.hash.replace(/^#/, '') as PortalPageId;
  return VALID_PAGES.includes(hash) ? hash : 'home';
}

export default function App() {
  const prefersReducedMotion = useReducedMotion();
  const lenisRef = useRef<Lenis | null>(null);
  const transitionTimersRef = useRef<number[]>([]);

  const [isDemoAuthenticated, setIsDemoAuthenticated] = useState(false);
  const [hasEnteredHome, setHasEnteredHome] = useState(false);
  const [startOpenedToHero, setStartOpenedToHero] = useState(false);
  const [activePage, setActivePage] = useState<PortalPageId>(() => getPageFromLocation());
  const [shutterPhase, setShutterPhase] = useState<ShutterPhase>('idle');
  const [transitionTarget, setTransitionTarget] = useState<PortalPageId>('home');

  // Persisted Learner State (synced via localStorage; ready to swap with API endpoints)
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfile>(() => loadInitialProfile());
  const [roleRequirements, setRoleRequirements] = useState<
    Record<CareerGoalId, CareerRoleRequirement>
  >(() => loadInitialRoleRequirements());
  const [courses, setCourses] = useState<LessonItem[]>(() => loadInitialCourses());
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() =>
    loadInitialStringList(STORAGE_KEYS.completedLessons)
  );
  const [inProgressLessonIds, setInProgressLessonIds] = useState<string[]>(() =>
    loadInitialStringList(STORAGE_KEYS.inProgressLessons)
  );
  const [assessment, setAssessment] = useState<AssessmentState>(() => loadInitialAssessment());

  const activePageRef = useRef(activePage);
  activePageRef.current = activePage;

  useEffect(() => {
    writeStorage(STORAGE_KEYS.profile, learnerProfile);
  }, [learnerProfile]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.roleRequirements, roleRequirements);
  }, [roleRequirements]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.courses, courses);
  }, [courses]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.completedLessons, completedLessonIds);
  }, [completedLessonIds]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.inProgressLessons, inProgressLessonIds);
  }, [inProgressLessonIds]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.assessment, assessment);
  }, [assessment]);

  // Derived adaptive recommendations, career match, and simulated 5-role AI learning team
  const careerMatch = useMemo(
    () => analyzeCareerMatch(learnerProfile, roleRequirements, completedLessonIds, courses),
    [learnerProfile, roleRequirements, completedLessonIds, courses]
  );

  const rankedCourses = useMemo(
    () => rankRecommendedCourses(courses, careerMatch, completedLessonIds, inProgressLessonIds),
    [courses, careerMatch, completedLessonIds, inProgressLessonIds]
  );

  const adaptiveRoadmap = useMemo(
    () => buildAdaptiveRoadmap(courses, careerMatch, assessment, completedLessonIds),
    [courses, careerMatch, assessment, completedLessonIds]
  );

  const baselineAgentInsights = useMemo(
    () =>
      simulateAgentTeam(
        learnerProfile,
        careerMatch,
        rankedCourses,
        adaptiveRoadmap.recommendedNext,
        assessment,
        completedLessonIds,
        inProgressLessonIds
      ),
    [
      learnerProfile,
      careerMatch,
      rankedCourses,
      adaptiveRoadmap.recommendedNext,
      assessment,
      completedLessonIds,
      inProgressLessonIds,
    ]
  );

  const [liveAgentInsights, setLiveAgentInsights] = useState<SimulatedAgentInsight[] | null>(null);
  const [isAnalyzingAgents, setIsAnalyzingAgents] = useState(false);
  const [agentAnalysisError, setAgentAnalysisError] = useState<string | null>(null);
  const agentAbortRef = useRef<AbortController | null>(null);

  const runLiveAgentAnalysis = useCallback(async () => {
    agentAbortRef.current?.abort();
    const controller = new AbortController();
    agentAbortRef.current = controller;

    const topCourse = rankedCourses.find((r) => !completedLessonIds.includes(r.course.id))?.course;

    setIsAnalyzingAgents(true);
    setAgentAnalysisError(null);

    try {
      const agents = await analyzeAgentTeamWithGemini(
        {
          profile: learnerProfile,
          match: careerMatch,
          recommendedNext: adaptiveRoadmap.recommendedNext,
          assessment,
          completedCount: completedLessonIds.length,
          inProgressCount: inProgressLessonIds.length,
          totalModules: courses.length,
          topCourseTitle: topCourse?.title,
          topCourseSkill: topCourse?.skill,
          topCourseExercise: topCourse?.exercise,
          certificationsCount: learnerProfile.certifications.length,
        },
        controller.signal
      );
      if (!controller.signal.aborted) {
        setLiveAgentInsights(agents);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to run live Gemini agent analysis right now.';
      if (!controller.signal.aborted) {
        setAgentAnalysisError(message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsAnalyzingAgents(false);
      }
    }
  }, [
    learnerProfile,
    careerMatch,
    rankedCourses,
    adaptiveRoadmap.recommendedNext,
    assessment,
    completedLessonIds,
    inProgressLessonIds,
    courses.length,
  ]);

  useEffect(() => {
    if (!isDemoAuthenticated || (!hasEnteredHome && activePage === 'home')) {
      return;
    }

    setLiveAgentInsights(null);
    const timer = window.setTimeout(() => {
      void runLiveAgentAnalysis();
    }, 450);

    return () => {
      window.clearTimeout(timer);
      agentAbortRef.current?.abort();
    };
  }, [isDemoAuthenticated, hasEnteredHome, activePage, runLiveAgentAnalysis]);

  const agentInsights = liveAgentInsights ?? baselineAgentInsights;

  const clearTransitionTimers = useCallback(() => {
    transitionTimersRef.current.forEach((id) => window.clearTimeout(id));
    transitionTimersRef.current = [];
  }, []);

  // Initialize a single Lenis smooth scroll instance across scrollable portal pages
  useEffect(() => {
    if (!isDemoAuthenticated || !hasEnteredHome || prefersReducedMotion || activePage === 'courses') {
      lenisRef.current = null;
      return;
    }

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.18,
    });

    lenisRef.current = lenis;
    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };
    rafId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [isDemoAuthenticated, hasEnteredHome, prefersReducedMotion, activePage]);

  useEffect(() => {
    return () => clearTransitionTimers();
  }, [clearTransitionTimers]);

  const scrollToTopImmediate = useCallback(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const scrollToPositionImmediate = useCallback((y: number) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(y, { immediate: true });
    } else {
      window.scrollTo({ top: y, behavior: 'auto' });
    }
  }, []);

  const scrollToPosition = useCallback(
    (y: number) => {
      if (lenisRef.current && !prefersReducedMotion) {
        lenisRef.current.scrollTo(y);
      } else {
        window.scrollTo({ top: y, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    },
    [prefersReducedMotion]
  );

  const scrollToTarget = useCallback(
    (targetId: string, yOffset = -84) => {
      const target = document.getElementById(targetId);
      if (!target) return;
      if (lenisRef.current && !prefersReducedMotion) {
        lenisRef.current.scrollTo(target, { offset: yOffset });
      } else {
        target.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start',
        });
      }
    },
    [prefersReducedMotion]
  );

  const performPageTransition = useCallback(
    (nextPage: PortalPageId, updateHistory: boolean) => {
      if (nextPage === activePageRef.current) {
        scrollToPosition(0);
        return;
      }

      if (updateHistory) {
        window.history.pushState({ portalPage: nextPage }, '', `#${nextPage}`);
      }

      clearTransitionTimers();

      if (prefersReducedMotion) {
        setShutterPhase('idle');
        setActivePage(nextPage);
        window.requestAnimationFrame(() => scrollToTopImmediate());
        return;
      }

      setTransitionTarget(nextPage);
      setShutterPhase('closing');

      const t1 = window.setTimeout(() => {
        setShutterPhase('closed');
        setActivePage(nextPage);
        scrollToTopImmediate();
      }, 280);

      const t2 = window.setTimeout(() => {
        setShutterPhase('opening');
      }, 370);

      const t3 = window.setTimeout(() => {
        setShutterPhase('idle');
      }, 760);

      transitionTimersRef.current = [t1, t2, t3];
    },
    [clearTransitionTimers, prefersReducedMotion, scrollToPosition, scrollToTopImmediate]
  );

  const handleSelectPage = useCallback(
    (nextPage: PortalPageId) => {
      performPageTransition(nextPage, true);
    },
    [performPageTransition]
  );

  // Support browser Back and Forward navigation
  useEffect(() => {
    if (!isDemoAuthenticated) return;

    const handlePopState = (event: PopStateEvent) => {
      const statePage = event.state?.portalPage as PortalPageId | undefined;
      const nextPage =
        statePage && VALID_PAGES.includes(statePage) ? statePage : getPageFromLocation();
      performPageTransition(nextPage, false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDemoAuthenticated, performPageTransition]);

  const handleStartLesson = useCallback((lessonId: string) => {
    setInProgressLessonIds((prev) => (prev.includes(lessonId) ? prev : [...prev, lessonId]));
  }, []);

  const handleToggleLesson = useCallback((lessonId: string) => {
    setCompletedLessonIds((prev) => {
      const willComplete = !prev.includes(lessonId);
      if (willComplete) {
        setInProgressLessonIds((started) => started.filter((id) => id !== lessonId));
        return [...prev, lessonId];
      }
      return prev.filter((id) => id !== lessonId);
    });
  }, []);

  const handleResetProgress = useCallback(() => {
    setCompletedLessonIds([]);
    setInProgressLessonIds([]);
    setAssessment(DEFAULT_ASSESSMENT);
  }, []);

  const handleUpdateAssessment = useCallback(
    (status: AssessmentStatus, focusTopic?: string) => {
      setAssessment({
        status,
        focusTopic: focusTopic?.trim() || assessment.focusTopic || 'JavaScript & DOM practice',
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    },
    [assessment.focusTopic]
  );

  const handleUpdateProfile = useCallback(
    (updater: LearnerProfile | ((prev: LearnerProfile) => LearnerProfile)) => {
      setLearnerProfile(updater);
    },
    []
  );

  const handleUpdateRoleRequirements = useCallback(
    (
      updater:
        | Record<CareerGoalId, CareerRoleRequirement>
        | ((prev: Record<CareerGoalId, CareerRoleRequirement>) => Record<CareerGoalId, CareerRoleRequirement>)
    ) => {
      setRoleRequirements(updater);
    },
    []
  );

  const handleResetAllDemoData = useCallback(() => {
    setLearnerProfile(DEFAULT_LEARNER_PROFILE);
    setRoleRequirements(DEFAULT_ROLE_REQUIREMENTS);
    setCourses(FEATURED_LESSONS);
    setCompletedLessonIds([]);
    setInProgressLessonIds([]);
    setAssessment(DEFAULT_ASSESSMENT);
  }, []);

  const handleCreateCourse = useCallback(
    (draft: Omit<LessonItem, 'id' | 'order' | 'isCustom'>) => {
      setCourses((prev) => {
        const created: LessonItem = normalizeCourseRecord(
          {
            ...draft,
            id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            order: prev.length + 1,
            isCustom: true,
          },
          prev.length
        );
        return [...prev, created];
      });
    },
    []
  );

  const handleImportCourses = useCallback(
    (drafts: Array<Omit<LessonItem, 'id' | 'order' | 'isCustom'>>) => {
      if (drafts.length === 0) return;
      setCourses((prev) => {
        const stamp = Date.now();
        const appended: LessonItem[] = drafts.map((draft, idx) =>
          normalizeCourseRecord(
            {
              ...draft,
              id: `import-${stamp}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
              order: prev.length + idx + 1,
              isCustom: true,
            },
            prev.length + idx
          )
        );
        return [...prev, ...appended];
      });
    },
    []
  );

  const handleRemoveCourse = useCallback((courseId: string) => {
    setCourses((prev) => {
      const next = prev.filter((item) => item.id !== courseId);
      return next.map((item, idx) => ({ ...item, order: idx + 1 }));
    });
    setCompletedLessonIds((prev) => prev.filter((id) => id !== courseId));
    setInProgressLessonIds((prev) => prev.filter((id) => id !== courseId));
  }, []);

  const handleConsumedStartOpened = useCallback(() => {
    setStartOpenedToHero(false);
  }, []);

  const handleEnterHomeFromGate = useCallback(() => {
    clearTransitionTimers();

    if (prefersReducedMotion) {
      setStartOpenedToHero(true);
      setHasEnteredHome(true);
      return;
    }

    setTransitionTarget('home');
    setShutterPhase('closing');

    const t1 = window.setTimeout(() => {
      setShutterPhase('closed');
      setStartOpenedToHero(true);
      setHasEnteredHome(true);
    }, 260);

    const t2 = window.setTimeout(() => {
      setShutterPhase('opening');
    }, 360);

    const t3 = window.setTimeout(() => {
      setShutterPhase('idle');
    }, 750);

    transitionTimersRef.current = [t1, t2, t3];
  }, [clearTransitionTimers, prefersReducedMotion]);

  const handleDemoLogin = () => {
    const initial = getPageFromLocation();
    window.history.replaceState({ portalPage: initial }, '', `#${initial}`);
    setActivePage(initial);
    setShutterPhase('idle');
    setStartOpenedToHero(false);
    setHasEnteredHome(initial !== 'home');
    setIsDemoAuthenticated(true);
    window.requestAnimationFrame(() => scrollToTopImmediate());
  };

  const handleAuthenticatedLogin = (authenticatedProfile: LearnerProfile) => {
    setLearnerProfile(authenticatedProfile);
    const initial = getPageFromLocation();
    window.history.replaceState({ portalPage: initial }, '', `#${initial}`);
    setActivePage(initial);
    setShutterPhase('idle');
    setStartOpenedToHero(false);
    setHasEnteredHome(initial !== 'home');
    setIsDemoAuthenticated(true);
    window.requestAnimationFrame(() => scrollToTopImmediate());
  };

  const handleExitDemo = () => {
    clearTransitionTimers();
    setShutterPhase('idle');
    setIsDemoAuthenticated(false);
    setHasEnteredHome(false);
    setStartOpenedToHero(false);
    setActivePage('home');
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  return (
    <AppErrorBoundary>
      {!isDemoAuthenticated ? (
        <LoginPage
          onDemoLogin={handleDemoLogin}
          onAuthenticatedLogin={handleAuthenticatedLogin}
        />
      ) : !hasEnteredHome && activePage === 'home' ? (
        <>
          <HomeVideoGate onEnterHome={handleEnterHomeFromGate} />
          {!prefersReducedMotion && (
            <PageTransitionPanels phase={shutterPhase} targetPage={transitionTarget} />
          )}
        </>
      ) : (
        <>
          <PortalNav
            activePage={activePage}
            onSelectPage={handleSelectPage}
            onExitDemo={handleExitDemo}
          />

          {activePage === 'home' && (
            <HomeDashboard
              profile={learnerProfile}
              careerMatch={careerMatch}
              rankedCourses={rankedCourses}
              adaptiveRoadmap={adaptiveRoadmap}
              assessment={assessment}
              agentInsights={agentInsights}
              isAnalyzingAgents={isAnalyzingAgents}
              agentAnalysisError={agentAnalysisError}
              onRefreshAgents={() => void runLiveAgentAnalysis()}
              completedLessonIds={completedLessonIds}
              inProgressLessonIds={inProgressLessonIds}
              onStartLesson={handleStartLesson}
              onToggleLesson={handleToggleLesson}
              onResetProgress={handleResetProgress}
              onSelectPage={handleSelectPage}
              onScrollToTarget={scrollToTarget}
              onScrollToPosition={scrollToPosition}
              onScrollToPositionImmediate={scrollToPositionImmediate}
              startOpenedToHero={startOpenedToHero}
              onConsumedStartOpened={handleConsumedStartOpened}
              onExitDemo={handleExitDemo}
            />
          )}

          {activePage === 'learning-path' && (
            <LearningPathPage
              profile={learnerProfile}
              careerMatch={careerMatch}
              adaptiveRoadmap={adaptiveRoadmap}
              assessment={assessment}
              agentInsights={agentInsights}
              completedLessonIds={completedLessonIds}
              inProgressLessonIds={inProgressLessonIds}
              onUpdateAssessment={handleUpdateAssessment}
              onStartLesson={handleStartLesson}
              onToggleLesson={handleToggleLesson}
              onResetProgress={handleResetProgress}
              onSelectPage={handleSelectPage}
              onScrollToTarget={scrollToTarget}
            />
          )}

          {activePage === 'courses' && (
            <CoursesPage
              courses={courses}
              careerMatch={careerMatch}
              rankedCourses={rankedCourses}
              completedLessonIds={completedLessonIds}
              inProgressLessonIds={inProgressLessonIds}
              onStartLesson={handleStartLesson}
              onToggleLesson={handleToggleLesson}
              onResetProgress={handleResetProgress}
              onCreateCourse={handleCreateCourse}
              onImportCourses={handleImportCourses}
              onRemoveCourse={handleRemoveCourse}
              onSelectPage={handleSelectPage}
            />
          )}

          {activePage === 'profile' && (
            <ProfilePage
              profile={learnerProfile}
              roleRequirements={roleRequirements}
              careerMatch={careerMatch}
              rankedCourses={rankedCourses}
              adaptiveRoadmap={adaptiveRoadmap}
              assessment={assessment}
              agentInsights={agentInsights}
              isAnalyzingAgents={isAnalyzingAgents}
              agentAnalysisError={agentAnalysisError}
              onRefreshAgents={() => void runLiveAgentAnalysis()}
              coursesCount={courses.length}
              completedLessonIds={completedLessonIds}
              inProgressLessonIds={inProgressLessonIds}
              onUpdateProfile={handleUpdateProfile}
              onUpdateRoleRequirements={handleUpdateRoleRequirements}
              onResetAllDemoData={handleResetAllDemoData}
              onSelectPage={handleSelectPage}
              onExitDemo={handleExitDemo}
            />
          )}

          {!prefersReducedMotion && (
            <PageTransitionPanels phase={shutterPhase} targetPage={transitionTarget} />
          )}
        </>
      )}
    </AppErrorBoundary>
  );
}
