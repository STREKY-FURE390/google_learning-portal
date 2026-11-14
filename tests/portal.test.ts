import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ASSESSMENT,
  DEFAULT_LEARNER_PROFILE,
  DEFAULT_ROLE_REQUIREMENTS,
  FEATURED_LESSONS,
} from '../src/data/portalData.ts';
import {
  analyzeCareerMatch,
  buildAdaptiveRoadmap,
  rankRecommendedCourses,
  simulateAgentTeam,
} from '../src/services/learningEngine.ts';
import {
  AuthApiError,
  createLearnerProfileAccount,
  fetchLearnerProfileAccount,
  isAuthApiConfigured,
  sendVerificationCode,
  verifyEmailCode,
} from '../src/services/authApi.ts';

test('analyzeCareerMatch classifies skills and boosts score on course completion', () => {
  const baseMatch = analyzeCareerMatch(
    DEFAULT_LEARNER_PROFILE,
    DEFAULT_ROLE_REQUIREMENTS,
    [],
    FEATURED_LESSONS
  );

  assert.equal(baseMatch.goal, 'Full Stack Developer');
  assert.ok(baseMatch.matchPercent > 0 && baseMatch.matchPercent < 100);
  assert.ok(baseMatch.alreadyHave.length > 0);
  assert.ok(baseMatch.missing.length > 0);

  const nodeCourse = FEATURED_LESSONS.find((lesson) => lesson.skill === 'Node.js');
  assert.ok(nodeCourse, 'Expected a Node.js course in FEATURED_LESSONS');

  const boostedMatch = analyzeCareerMatch(
    DEFAULT_LEARNER_PROFILE,
    DEFAULT_ROLE_REQUIREMENTS,
    [nodeCourse.id],
    FEATURED_LESSONS
  );

  assert.ok(boostedMatch.matchPercent > baseMatch.matchPercent);
});

test('analyzeCareerMatch adapts immediately when career goal changes', () => {
  const backendProfile = {
    ...DEFAULT_LEARNER_PROFILE,
    careerGoal: 'Backend Developer' as const,
  };

  const backendMatch = analyzeCareerMatch(
    backendProfile,
    DEFAULT_ROLE_REQUIREMENTS,
    [],
    FEATURED_LESSONS
  );

  assert.equal(backendMatch.goal, 'Backend Developer');
  assert.ok(backendMatch.allRows.some((row) => row.requirement.skill === 'SQL'));
  assert.ok(backendMatch.allRows.some((row) => row.requirement.skill === 'Python'));
});

test('rankRecommendedCourses prioritizes missing gap skills over mastered courses', () => {
  const match = analyzeCareerMatch(
    DEFAULT_LEARNER_PROFILE,
    DEFAULT_ROLE_REQUIREMENTS,
    [],
    FEATURED_LESSONS
  );

  const ranked = rankRecommendedCourses(FEATURED_LESSONS, match, [], []);
  assert.equal(ranked.length, FEATURED_LESSONS.length);
  assert.ok(ranked[0].score >= ranked[ranked.length - 1].score);
});

test('buildAdaptiveRoadmap moves review lesson earlier when learner struggled', () => {
  const match = analyzeCareerMatch(
    DEFAULT_LEARNER_PROFILE,
    DEFAULT_ROLE_REQUIREMENTS,
    [],
    FEATURED_LESSONS
  );

  const struggledRoadmap = buildAdaptiveRoadmap(
    FEATURED_LESSONS,
    match,
    { ...DEFAULT_ASSESSMENT, status: 'struggled' },
    []
  );

  assert.equal(struggledRoadmap.orderedLessons[1]?.id, 'lesson-js-review');
  assert.equal(struggledRoadmap.recommendedNext?.id, 'lesson-js-review');

  const confidentRoadmap = buildAdaptiveRoadmap(
    FEATURED_LESSONS,
    match,
    { ...DEFAULT_ASSESSMENT, status: 'confident' },
    []
  );

  assert.ok(
    confidentRoadmap.recommendedNext &&
      confidentRoadmap.recommendedNext.skill.toLowerCase() === 'react'
  );
});

test('simulateAgentTeam returns all 5 learning agent roles', () => {
  const match = analyzeCareerMatch(
    DEFAULT_LEARNER_PROFILE,
    DEFAULT_ROLE_REQUIREMENTS,
    [],
    FEATURED_LESSONS
  );
  const ranked = rankRecommendedCourses(FEATURED_LESSONS, match, [], []);
  const roadmap = buildAdaptiveRoadmap(FEATURED_LESSONS, match, DEFAULT_ASSESSMENT, []);

  const team = simulateAgentTeam(
    DEFAULT_LEARNER_PROFILE,
    match,
    ranked,
    roadmap.recommendedNext,
    DEFAULT_ASSESSMENT,
    [],
    []
  );

  assert.equal(team.length, 5);
  assert.deepEqual(
    team.map((item) => item.role),
    ['Skill Analyst', 'Career Matcher', 'Learning Guide', 'Progress Coach', 'AI Mentor']
  );
  for (const agent of team) {
    assert.ok(agent.contribution.length > 10);
  }
});

test('authApi refuses unconfigured placeholder endpoints instead of simulating auth', async () => {
  assert.equal(isAuthApiConfigured(), false);

  await assert.rejects(
    () => sendVerificationCode({ email: 'learner@example.com', mode: 'signin' }),
    (err: unknown) => err instanceof AuthApiError && err.code === 'API_NOT_CONFIGURED'
  );

  await assert.rejects(
    () => verifyEmailCode({ email: 'learner@example.com', code: '123456', mode: 'signup' }),
    (err: unknown) => err instanceof AuthApiError && err.code === 'API_NOT_CONFIGURED'
  );

  await assert.rejects(
    () =>
      createLearnerProfileAccount({
        email: 'learner@example.com',
        profile: DEFAULT_LEARNER_PROFILE,
      }),
    (err: unknown) => err instanceof AuthApiError && err.code === 'API_NOT_CONFIGURED'
  );

  await assert.rejects(
    () => fetchLearnerProfileAccount({ email: 'learner@example.com' }),
    (err: unknown) => err instanceof AuthApiError && err.code === 'API_NOT_CONFIGURED'
  );
});
