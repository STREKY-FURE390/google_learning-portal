import {
  AssessmentState,
  CareerGoalId,
  CareerRoleRequirement,
  JS_REVIEW_LESSON,
  LearnerProfile,
  LearnerSkill,
  LessonItem,
  RoleSkillRequirement,
  SimulatedAgentInsight,
} from '../data/portalData';

// ============================================================================
// API CONNECTION BOUNDARY
// ----------------------------------------------------------------------------
// All functions in this module are pure, deterministic local demo engines.
// When connecting your real backend API later, replace these helper calls
// inside App.tsx with fetch() requests to your endpoints using the exact same
// TypeScript input/output shapes.
// ============================================================================

export interface SkillComparisonRow {
  requirement: RoleSkillRequirement;
  learnerSkill: LearnerSkill | null;
  effectiveLevel: number;
  status: 'already-have' | 'developing' | 'missing';
}

export interface CareerMatchAnalysis {
  goal: CareerGoalId;
  matchPercent: number;
  alreadyHave: SkillComparisonRow[];
  developing: SkillComparisonRow[];
  missing: SkillComparisonRow[];
  allRows: SkillComparisonRow[];
  summaryText: string;
}

export interface RankedCourse {
  course: LessonItem;
  score: number;
  reason: string;
  isRecommendedForGap: boolean;
}

function normalizeSkillName(name: string): string {
  const lower = name.trim().toLowerCase();
  if (lower === 'basic html' || lower === 'html5') return 'html';
  if (lower === 'js' || lower === 'es6') return 'javascript';
  if (lower === 'node' || lower === 'nodejs') return 'node.js';
  if (lower === 'rest' || lower === 'rest api' || lower === 'apis') return 'rest apis';
  if (lower === 'reactjs') return 'react';
  return lower;
}

/**
 * API CONNECTION POINT: Replace with GET /api/career-match or POST /api/analyze-skills
 */
export function analyzeCareerMatch(
  profile: LearnerProfile,
  roleRequirements: Record<CareerGoalId, CareerRoleRequirement>,
  completedLessonIds: string[],
  courses: LessonItem[]
): CareerMatchAnalysis {
  const role = roleRequirements[profile.careerGoal] ?? roleRequirements['Full Stack Developer'];
  const completedSkillsSet = new Set(
    courses
      .filter((c) => completedLessonIds.includes(c.id))
      .map((c) => normalizeSkillName(c.skill))
  );

  const alreadyHave: SkillComparisonRow[] = [];
  const developing: SkillComparisonRow[] = [];
  const missing: SkillComparisonRow[] = [];
  const allRows: SkillComparisonRow[] = [];

  let earnedPoints = 0;
  let totalTargetPoints = 0;

  for (const req of role.requirements) {
    const normReq = normalizeSkillName(req.skill);
    const matchedSkill =
      profile.skills.find((s) => {
        const normSkill = normalizeSkillName(s.name);
        return normSkill === normReq || normSkill.includes(normReq) || normReq.includes(normSkill);
      }) ?? null;

    const baseLevel = matchedSkill ? matchedSkill.level : 0;
    const lessonCompletedForSkill = completedSkillsSet.has(normReq);
    // Completing a course boosts effective readiness toward the target requirement locally
    const effectiveLevel = lessonCompletedForSkill
      ? Math.max(baseLevel, req.targetLevel)
      : baseLevel;

    let status: SkillComparisonRow['status'] = 'missing';
    if (effectiveLevel >= Math.max(60, req.targetLevel - 10)) {
      status = 'already-have';
    } else if (effectiveLevel >= 25 || matchedSkill !== null) {
      status = 'developing';
    } else {
      status = 'missing';
    }

    const row: SkillComparisonRow = {
      requirement: req,
      learnerSkill: matchedSkill,
      effectiveLevel,
      status,
    };

    allRows.push(row);
    if (status === 'already-have') alreadyHave.push(row);
    else if (status === 'developing') developing.push(row);
    else missing.push(row);

    earnedPoints += Math.min(effectiveLevel, req.targetLevel);
    totalTargetPoints += req.targetLevel;
  }

  const matchPercent =
    totalTargetPoints > 0 ? Math.min(100, Math.round((earnedPoints / totalTargetPoints) * 100)) : 0;

  const missingNames = missing.map((m) => m.requirement.skill);
  const developingNames = developing.map((d) => d.requirement.skill);
  const haveNames = alreadyHave.map((h) => h.requirement.skill);

  let summaryText = `${profile.name} matches ${matchPercent}% of ${role.goal} requirements.`;
  if (missingNames.length === 0 && developingNames.length === 0) {
    summaryText = `${profile.name} meets all ${role.requirements.length} ${role.goal} skill requirements (${matchPercent}% match). Focus on capstone projects and portfolio polish.`;
  } else {
    const strengthPhrase =
      haveNames.length > 0 ? `Strong in ${haveNames.join(', ')}.` : 'Building core foundations.';
    const gapList = [...developingNames, ...missingNames];
    const gapPhrase =
      gapList.length > 0
        ? ` Top gaps to close next: ${gapList.slice(0, 4).join(', ')}.`
        : '';
    summaryText = `${profile.name} is at ${matchPercent}% readiness for ${role.goal}. ${strengthPhrase}${gapPhrase}`;
  }

  return {
    goal: role.goal,
    matchPercent,
    alreadyHave,
    developing,
    missing,
    allRows,
    summaryText,
  };
}

/**
 * API CONNECTION POINT: Replace with POST /api/recommendations/courses
 */
export function rankRecommendedCourses(
  courses: LessonItem[],
  match: CareerMatchAnalysis,
  completedLessonIds: string[],
  inProgressLessonIds: string[]
): RankedCourse[] {
  const missingMap = new Map(
    match.missing.map((m, idx) => [normalizeSkillName(m.requirement.skill), idx])
  );
  const developingMap = new Map(
    match.developing.map((d, idx) => [normalizeSkillName(d.requirement.skill), idx])
  );
  const haveSet = new Set(match.alreadyHave.map((h) => normalizeSkillName(h.requirement.skill)));

  return courses
    .map((course) => {
      const norm = normalizeSkillName(course.skill);
      const isCompleted = completedLessonIds.includes(course.id);
      const isStarted = inProgressLessonIds.includes(course.id);

      let score = 10;
      let reason = `Supports ${match.goal} versatility.`;
      let isRecommendedForGap = false;

      if (missingMap.has(norm)) {
        const rank = missingMap.get(norm) ?? 0;
        score += 100 - rank * 6;
        reason = `Closes missing ${course.skill} gap for ${match.goal}.`;
        isRecommendedForGap = !isCompleted;
      } else if (developingMap.has(norm)) {
        const rank = developingMap.get(norm) ?? 0;
        score += 75 - rank * 5;
        reason = `Strengthens developing ${course.skill} foundation.`;
        isRecommendedForGap = !isCompleted;
      } else if (haveSet.has(norm)) {
        score += 35;
        reason = `Reinforces existing ${course.skill} capability.`;
      }

      if (isStarted && !isCompleted) {
        score += 20;
        reason = `In progress — pick up where you left off.`;
      }

      if (isCompleted) {
        score -= 80;
        reason = `Completed for ${course.skill}.`;
      }

      return { course, score, reason, isRecommendedForGap };
    })
    .sort((a, b) => b.score - a.score || a.course.order - b.course.order);
}

/**
 * API CONNECTION POINT: Replace with POST /api/roadmap/adapt
 */
export function buildAdaptiveRoadmap(
  courses: LessonItem[],
  match: CareerMatchAnalysis,
  assessment: AssessmentState,
  completedLessonIds: string[]
): {
  orderedLessons: LessonItem[];
  recommendedNext: LessonItem | null;
  adaptationHeadline: string;
  adaptationExplanation: string;
} {
  // Prioritize lessons aligned with missing/developing skills while preserving natural progression
  const rolePriority = new Map<string, number>();
  match.allRows.forEach((row, idx) => {
    rolePriority.set(normalizeSkillName(row.requirement.skill), idx);
  });

  const sortedBase = [...courses].sort((a, b) => {
    const aNorm = normalizeSkillName(a.skill);
    const bNorm = normalizeSkillName(b.skill);
    const aInRole = rolePriority.has(aNorm);
    const bInRole = rolePriority.has(bNorm);
    if (aInRole !== bInRole) return aInRole ? -1 : 1;
    return a.order - b.order;
  });

  if (assessment.status === 'struggled') {
    const reviewLesson: LessonItem = {
      ...JS_REVIEW_LESSON,
      order: 2,
      title:
        match.goal === 'Backend Developer'
          ? 'JavaScript & Async Node Review: Scope, Promises & Error Handling'
          : JS_REVIEW_LESSON.title,
    };

    const firstStep = sortedBase[0];
    const remaining = sortedBase.slice(1);
    const orderedLessons = firstStep ? [firstStep, reviewLesson, ...remaining] : [reviewLesson];

    const recommendedNext =
      (!completedLessonIds.includes(reviewLesson.id) ? reviewLesson : null) ??
      orderedLessons.find((l) => !completedLessonIds.includes(l.id)) ??
      null;

    return {
      orderedLessons,
      recommendedNext,
      adaptationHeadline: `Roadmap adapted: Review lesson moved earlier to Step ${
        firstStep ? '02' : '01'
      }`,
      adaptationExplanation: `Because your saved check-in noted difficulty with ${assessment.focusTopic}, a focused review module was placed before advanced framework lessons so core async and DOM patterns stick first.`,
    };
  }

  if (assessment.status === 'confident') {
    const nextSkillTarget =
      match.goal === 'Backend Developer'
        ? sortedBase.find(
            (l) =>
              normalizeSkillName(l.skill) === 'node.js' ||
              normalizeSkillName(l.skill) === 'rest apis'
          )
        : sortedBase.find((l) => normalizeSkillName(l.skill) === 'react');

    const recommendedNext =
      (nextSkillTarget && !completedLessonIds.includes(nextSkillTarget.id)
        ? nextSkillTarget
        : null) ??
      sortedBase.find((l) => !completedLessonIds.includes(l.id)) ??
      null;

    return {
      orderedLessons: sortedBase,
      recommendedNext,
      adaptationHeadline: recommendedNext
        ? `Accelerated recommendation: ${recommendedNext.skill} is highlighted next`
        : 'All roadmap lessons completed!',
      adaptationExplanation: recommendedNext
        ? `Because your saved check-in shows confidence, the roadmap highlights ${recommendedNext.skill} (“${recommendedNext.title}”) as your next high-leverage step for ${match.goal}.`
        : `You have completed every module currently queued for ${match.goal}.`,
    };
  }

  const recommendedNext = sortedBase.find((l) => !completedLessonIds.includes(l.id)) ?? null;
  return {
    orderedLessons: sortedBase,
    recommendedNext,
    adaptationHeadline: `Ordered ${match.goal} track active`,
    adaptationExplanation: `Lessons are ordered around your ${match.goal} requirements (${match.alreadyHave.length} strengths, ${match.developing.length + match.missing.length} skill gaps). Update your assessment check-in anytime to adapt the sequence.`,
  };
}

/**
 * API CONNECTION POINT: Replace with POST /api/agents/simulate
 */
export function simulateAgentTeam(
  profile: LearnerProfile,
  match: CareerMatchAnalysis,
  rankedCourses: RankedCourse[],
  recommendedNext: LessonItem | null,
  assessment: AssessmentState,
  completedLessonIds: string[],
  inProgressLessonIds: string[]
): SimulatedAgentInsight[] {
  const topMissing = match.missing.slice(0, 3).map((m) => m.requirement.skill);
  const topDeveloping = match.developing.slice(0, 2).map((d) => d.requirement.skill);
  const topStrengths = match.alreadyHave.slice(0, 3).map((h) => h.requirement.skill);
  const topCourse = rankedCourses.find((r) => !completedLessonIds.includes(r.course.id))?.course;

  return [
    {
      role: 'Skill Analyst',
      focus: 'Profile vs. Goal Audit',
      status: 'Simulated Demo',
      contribution: `${profile.name} already holds ${
        topStrengths.length > 0 ? topStrengths.join(', ') : 'initial basics'
      }${topDeveloping.length > 0 ? `, is developing ${topDeveloping.join(', ')}` : ''}, and is missing ${
        topMissing.length > 0 ? topMissing.join(', ') : 'no core gaps'
      } for ${profile.careerGoal}.`,
    },
    {
      role: 'Career Matcher',
      focus: 'Target Role Match',
      status: 'Simulated Demo',
      contribution: `Computed ${match.matchPercent}% match for ${profile.careerGoal} across ${match.allRows.length} target skills, reinforced by ${profile.projects.length} project(s) and ${profile.certifications.length} certification(s).`,
    },
    {
      role: 'Learning Guide',
      focus: 'Course & Exercise Ranker',
      status: 'Simulated Demo',
      contribution: topCourse
        ? `Ranked “${topCourse.title}” (${topCourse.skill}, ${topCourse.duration}) #1 — practical exercise: ${topCourse.exercise}`
        : `All core modules are finished; try adding a custom module or capstone project on the Courses shelf.`,
    },
    {
      role: 'Progress Coach',
      focus: 'Pacing & Assessment',
      status: 'Simulated Demo',
      contribution: `${completedLessonIds.length} lesson(s) completed and ${inProgressLessonIds.length} in progress. Assessment mode is “${assessment.status}”, ${
        assessment.status === 'struggled'
          ? 'moving a review lab earlier to reinforce fundamentals.'
          : assessment.status === 'confident'
          ? 'fast-tracking directly to the next core framework skill.'
          : 'keeping a steady step-by-step pace.'
      }`,
    },
    {
      role: 'AI Mentor',
      focus: 'Next-Step Guidance (Gemini AI)',
      status: 'Live Gemini AI',
      contribution: recommendedNext
        ? `Next step for ${profile.name}: complete “${recommendedNext.title}” (${recommendedNext.duration}) to close your ${recommendedNext.skill} gap for ${profile.careerGoal}.`
        : `${profile.name} has completed the current ${profile.careerGoal} track—build or log your next portfolio project in Profile.`,
    },
  ];
}

export interface MentorChatContext {
  profile: LearnerProfile;
  match: CareerMatchAnalysis;
  recommendedNext: LessonItem | null;
  assessment: AssessmentState;
  completedCount: number;
  inProgressCount: number;
  totalModules: number;
}

/**
 * Calls server-side Express route POST /api/mentor/chat powered by @google/genai.
 */
export async function askGeminiMentor(
  message: string,
  history: Array<{ role: 'mentor' | 'learner'; text: string }>,
  context: MentorChatContext
): Promise<string> {
  const response = await fetch('/api/mentor/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history,
      learnerContext: {
        name: context.profile.name,
        careerGoal: context.profile.careerGoal,
        matchPercent: context.match.matchPercent,
        alreadyHaveSkills: context.match.alreadyHave.map((r) => r.requirement.skill),
        developingSkills: context.match.developing.map((r) => r.requirement.skill),
        missingSkills: context.match.missing.map((r) => r.requirement.skill),
        assessmentStatus: context.assessment.status,
        assessmentFocus: context.assessment.focusTopic,
        recommendedNextTitle: context.recommendedNext?.title,
        recommendedNextSkill: context.recommendedNext?.skill,
        recommendedNextExercise: context.recommendedNext?.exercise,
        completedCount: context.completedCount,
        inProgressCount: context.inProgressCount,
        totalModules: context.totalModules,
        projects: context.profile.projects.map((p) => `${p.title} (${p.status})`),
      },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as { reply?: string; error?: string };

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  if (!data.reply || !data.reply.trim()) {
    throw new Error('Gemini returned an empty response. Please try again.');
  }

  return data.reply.trim();
}

export interface AgentAnalysisContext extends MentorChatContext {
  topCourseTitle?: string;
  topCourseSkill?: string;
  topCourseExercise?: string;
  certificationsCount?: number;
}

/**
 * Calls server-side Express route POST /api/agents/analyze powered by @google/genai.
 */
export async function analyzeAgentTeamWithGemini(
  context: AgentAnalysisContext,
  signal?: AbortSignal
): Promise<SimulatedAgentInsight[]> {
  const response = await fetch('/api/agents/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      learnerContext: {
        name: context.profile.name,
        careerGoal: context.profile.careerGoal,
        matchPercent: context.match.matchPercent,
        alreadyHaveSkills: context.match.alreadyHave.map((r) => r.requirement.skill),
        developingSkills: context.match.developing.map((r) => r.requirement.skill),
        missingSkills: context.match.missing.map((r) => r.requirement.skill),
        assessmentStatus: context.assessment.status,
        assessmentFocus: context.assessment.focusTopic,
        recommendedNextTitle: context.recommendedNext?.title,
        recommendedNextSkill: context.recommendedNext?.skill,
        recommendedNextExercise: context.recommendedNext?.exercise,
        topCourseTitle: context.topCourseTitle,
        topCourseSkill: context.topCourseSkill,
        topCourseExercise: context.topCourseExercise,
        completedCount: context.completedCount,
        inProgressCount: context.inProgressCount,
        totalModules: context.totalModules,
        certificationsCount: context.profile.certifications.length,
        projects: context.profile.projects.map((p) => `${p.title} (${p.status})`),
      },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    agents?: SimulatedAgentInsight[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  if (!Array.isArray(data.agents) || data.agents.length === 0) {
    throw new Error('Gemini returned an empty agent analysis. Please try again.');
  }

  return data.agents;
}

/**
 * Deterministic local fallback helper (used only when no server response is requested).
 */
export function buildPrototypeReply(
  prompt: string,
  context?: {
    profile: LearnerProfile;
    match: CareerMatchAnalysis;
    recommendedNext: LessonItem | null;
    assessment: AssessmentState;
  }
): string {
  const q = prompt.toLowerCase();
  const name = context?.profile.name ?? 'Alex';
  const goal = context?.profile.careerGoal ?? 'Full Stack Developer';
  const nextTitle = context?.recommendedNext?.title ?? 'Responsive CSS Grid & Flexbox Systems';
  const nextSkill = context?.recommendedNext?.skill ?? 'CSS';
  const nextExercise = context?.recommendedNext?.exercise;
  const missingSkills = context?.match.missing.map((m) => m.requirement.skill) ?? [];
  const haveSkills = context?.match.alreadyHave.map((h) => h.requirement.skill) ?? [];

  if (q.includes('next') || q.includes('work on') || q.includes('start') || q.includes('study')) {
    return `For your ${goal} goal (${context?.match.matchPercent ?? 45}% match), start with “${nextTitle}” (${nextSkill}).${
      nextExercise ? ` Practical exercise: ${nextExercise}` : ''
    }`;
  }

  if (q.includes('gap') || q.includes('map') || q.includes('skill') || q.includes('missing')) {
    return `${name}, you already have ${
      haveSkills.length > 0 ? haveSkills.join(', ') : 'initial fundamentals'
    }. Remaining gaps for ${goal}: ${
      missingSkills.length > 0 ? missingSkills.join(', ') : 'none—focus on capstone polish'
    }. Assessment mode is currently “${context?.assessment.status ?? 'steady'}”.`;
  }

  if (q.includes('project') || q.includes('capstone') || q.includes('exercise')) {
    const activeProj = context?.profile.projects[0]?.title ?? 'Developer Study Tracker';
    return `Tie your missing skills into “${activeProj}” by completing one practical exercise at a time—starting with ${nextSkill} and connecting it cleanly to your existing ${
      haveSkills[0] ?? 'core'
    } experience.`;
  }

  return `You are ${
    context?.match.matchPercent ?? 45
  }% matched for ${goal}. Recommended next module: “${nextTitle}”.`;
}
