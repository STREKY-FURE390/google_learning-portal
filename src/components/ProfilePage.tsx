import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Briefcase,
  Check,
  Compass,
  Edit3,
  Film,
  Loader2,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  CAMPUS_WALKTHROUGH_VIDEO_SRC,
  CAREER_GOALS,
  CareerGoalId,
  CareerRoleRequirement,
  DEFAULT_QUICK_ASK_PROMPT,
  LearnerCertification,
  LearnerProfile,
  LearnerProject,
  LearnerSkill,
  MENTOR_PROMPTS,
  MentorMessage,
  PortalPageId,
  RoleSkillRequirement,
  SimulatedAgentInsight,
  AssessmentState,
  LessonItem,
} from '../data/portalData';
import {
  askGeminiMentor,
  CareerMatchAnalysis,
  RankedCourse,
} from '../services/learningEngine';

interface ProfilePageProps {
  profile: LearnerProfile;
  roleRequirements: Record<CareerGoalId, CareerRoleRequirement>;
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
  coursesCount: number;
  completedLessonIds: string[];
  inProgressLessonIds: string[];
  onUpdateProfile: (updater: LearnerProfile | ((prev: LearnerProfile) => LearnerProfile)) => void;
  onUpdateRoleRequirements: (
    updater:
      | Record<CareerGoalId, CareerRoleRequirement>
      | ((prev: Record<CareerGoalId, CareerRoleRequirement>) => Record<CareerGoalId, CareerRoleRequirement>)
  ) => void;
  onResetAllDemoData: () => void;
  onSelectPage: (page: PortalPageId) => void;
  onExitDemo: () => void;
}

const SKILL_CATEGORIES: LearnerSkill['category'][] = [
  'Language',
  'Frontend',
  'Backend',
  'Database',
  'Tooling',
];

export function ProfilePage({
  profile,
  roleRequirements,
  careerMatch,
  rankedCourses,
  adaptiveRoadmap,
  assessment,
  agentInsights,
  coursesCount,
  completedLessonIds,
  inProgressLessonIds,
  onUpdateProfile,
  onUpdateRoleRequirements,
  onResetAllDemoData,
  onSelectPage,
  onExitDemo,
}: ProfilePageProps) {
  const prefersReducedMotion = useReducedMotion();

  // Career gap filter tab & role requirement inspector
  const [gapFilter, setGapFilter] = useState<'all' | 'already-have' | 'developing' | 'missing'>('all');
  const [editingGoalReq, setEditingGoalReq] = useState<CareerGoalId>(profile.careerGoal);
  const [showWalkthroughVideo, setShowWalkthroughVideo] = useState(false);

  // Add / Edit Skill state
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState(60);
  const [newSkillCategory, setNewSkillCategory] = useState<LearnerSkill['category']>('Frontend');
  const [newSkillSummary, setNewSkillSummary] = useState('');

  // Add / Edit Project state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectStack, setNewProjectStack] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState<LearnerProject['status']>('In Progress');
  const [newProjectSummary, setNewProjectSummary] = useState('');

  // Add / Edit Certification state
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [newCertName, setNewCertName] = useState('');
  const [newCertIssuer, setNewCertIssuer] = useState('');
  const [newCertYear, setNewCertYear] = useState('2026');
  const [newCertStatus, setNewCertStatus] = useState<LearnerCertification['status']>('Earned');

  // Add Role Requirement state
  const [newReqSkill, setNewReqSkill] = useState('');
  const [newReqTarget, setNewReqTarget] = useState(75);
  const [newReqPriority, setNewReqPriority] = useState<RoleSkillRequirement['priority']>('Core');
  const [newReqWhy, setNewReqWhy] = useState('');

  // Interactive Gemini AI mentor Q&A
  const [mentorInput, setMentorInput] = useState('');
  const [isMentorSending, setIsMentorSending] = useState(false);
  const [mentorMessages, setMentorMessages] = useState<MentorMessage[]>([
    {
      id: 'init-profile-mentor',
      role: 'mentor',
      text: `Gemini AI Mentor: Currently evaluating ${profile.name || 'Learner'} for ${profile.careerGoal} (${careerMatch.matchPercent}% match). Click “${DEFAULT_QUICK_ASK_PROMPT}” or ask about your skill gaps and next steps.`,
    },
  ]);

  const activeRoleReq = roleRequirements[editingGoalReq] ?? roleRequirements[profile.careerGoal];

  const visibleGapRows = useMemo(() => {
    if (gapFilter === 'already-have') return careerMatch.alreadyHave;
    if (gapFilter === 'developing') return careerMatch.developing;
    if (gapFilter === 'missing') return careerMatch.missing;
    return careerMatch.allRows;
  }, [careerMatch, gapFilter]);

  const handleGoalChange = (goal: CareerGoalId) => {
    onUpdateProfile((prev) => ({ ...prev, careerGoal: goal }));
    setEditingGoalReq(goal);
  };

  // --- Skill CRUD ---
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkillName.trim();
    if (!trimmed) return;
    const clamped = Math.max(0, Math.min(100, Number(newSkillLevel) || 0));
    const item: LearnerSkill = {
      id: `skill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      level: clamped,
      category: newSkillCategory,
      summary: newSkillSummary.trim() || `Hands-on experience applying ${trimmed} in practice.`,
    };
    onUpdateProfile((prev) => ({ ...prev, skills: [...prev.skills, item] }));
    setNewSkillName('');
    setNewSkillLevel(60);
    setNewSkillSummary('');
  };

  const handleUpdateSkill = (skillId: string, patch: Partial<LearnerSkill>) => {
    onUpdateProfile((prev) => ({
      ...prev,
      skills: prev.skills.map((s) => (s.id === skillId ? { ...s, ...patch } : s)),
    }));
  };

  const handleRemoveSkill = (skillId: string) => {
    onUpdateProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s.id !== skillId),
    }));
    if (editingSkillId === skillId) setEditingSkillId(null);
  };

  // --- Project CRUD ---
  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newProjectTitle.trim();
    if (!title) return;
    const item: LearnerProject = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      stack: newProjectStack.trim() || profile.skills.slice(0, 3).map((s) => s.name).join(' · ') || 'Web',
      status: newProjectStatus,
      summary: newProjectSummary.trim() || `Applied portfolio project demonstrating ${title}.`,
    };
    onUpdateProfile((prev) => ({ ...prev, projects: [...prev.projects, item] }));
    setNewProjectTitle('');
    setNewProjectStack('');
    setNewProjectSummary('');
  };

  const handleUpdateProject = (projectId: string, patch: Partial<LearnerProject>) => {
    onUpdateProfile((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === projectId ? { ...p, ...patch } : p)),
    }));
  };

  const handleRemoveProject = (projectId: string) => {
    onUpdateProfile((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== projectId),
    }));
    if (editingProjectId === projectId) setEditingProjectId(null);
  };

  // --- Certification CRUD ---
  const handleAddCertification = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCertName.trim();
    if (!name) return;
    const item: LearnerCertification = {
      id: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      issuer: newCertIssuer.trim() || 'Independent Track',
      year: newCertYear.trim() || '2026',
      status: newCertStatus,
    };
    onUpdateProfile((prev) => ({ ...prev, certifications: [...prev.certifications, item] }));
    setNewCertName('');
    setNewCertIssuer('');
  };

  const handleUpdateCertification = (certId: string, patch: Partial<LearnerCertification>) => {
    onUpdateProfile((prev) => ({
      ...prev,
      certifications: prev.certifications.map((c) => (c.id === certId ? { ...c, ...patch } : c)),
    }));
  };

  const handleRemoveCertification = (certId: string) => {
    onUpdateProfile((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c.id !== certId),
    }));
    if (editingCertId === certId) setEditingCertId(null);
  };

  // --- Role Requirements CRUD ---
  const handleAddRoleRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    const skill = newReqSkill.trim();
    if (!skill) return;
    const clampedTarget = Math.max(20, Math.min(100, Number(newReqTarget) || 75));
    const req: RoleSkillRequirement = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      skill,
      targetLevel: clampedTarget,
      priority: newReqPriority,
      why: newReqWhy.trim() || `Supports daily ${editingGoalReq} engineering deliverables.`,
    };
    onUpdateRoleRequirements((prev) => ({
      ...prev,
      [editingGoalReq]: {
        ...prev[editingGoalReq],
        requirements: [...prev[editingGoalReq].requirements, req],
      },
    }));
    setNewReqSkill('');
    setNewReqTarget(75);
    setNewReqWhy('');
  };

  const handleUpdateRoleRequirement = (
    goal: CareerGoalId,
    reqId: string,
    patch: Partial<RoleSkillRequirement>
  ) => {
    onUpdateRoleRequirements((prev) => ({
      ...prev,
      [goal]: {
        ...prev[goal],
        requirements: prev[goal].requirements.map((r) => (r.id === reqId ? { ...r, ...patch } : r)),
      },
    }));
  };

  const handleRemoveRoleRequirement = (goal: CareerGoalId, reqId: string) => {
    onUpdateRoleRequirements((prev) => ({
      ...prev,
      [goal]: {
        ...prev[goal],
        requirements: prev[goal].requirements.filter((r) => r.id !== reqId),
      },
    }));
  };

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
        recommendedNext: adaptiveRoadmap.recommendedNext,
        assessment,
        completedCount: completedLessonIds.length,
        inProgressCount: inProgressLessonIds.length,
        totalModules: coursesCount,
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

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-[#1B1710]">
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24 md:pt-28 md:pb-14 space-y-8 sm:space-y-10">
        {/* 1. EDITABLE LEARNER PROFILE & GOAL HEADER */}
        <section
          aria-labelledby="profile-page-heading"
          className="rounded-[26px] border border-[#E6D7B3] bg-white p-6 sm:p-8 shadow-[0_18px_48px_-22px_rgba(120,86,18,0.16)] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          <div className="lg:col-span-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9E7016]">
                <User className="w-4 h-4" aria-hidden="true" />
                <span>Editable Learner Profile · Saved Locally</span>
              </div>

              <button
                type="button"
                onClick={onResetAllDemoData}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-[#FAF6EC] hover:bg-[#F3EAD3] text-xs font-semibold text-[#7A5610] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset demo data</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="learner-name-input" className="block text-xs font-semibold text-[#4C4332]">
                  Learner Name
                </label>
                <input
                  id="learner-name-input"
                  type="text"
                  value={profile.name}
                  onChange={(e) =>
                    onUpdateProfile((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter your name"
                  className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-[#DEC99A] bg-[#FCFBF8] text-sm font-semibold text-[#1B1710] focus:outline-none focus:ring-2 focus:ring-[#B68623]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="learner-goal-select" className="block text-xs font-semibold text-[#4C4332]">
                  Target Career Goal
                </label>
                <select
                  id="learner-goal-select"
                  value={profile.careerGoal}
                  onChange={(e) => handleGoalChange(e.target.value as CareerGoalId)}
                  className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-[#DEC99A] bg-[#FCFBF8] text-sm font-semibold text-[#1B1710] focus:outline-none focus:ring-2 focus:ring-[#B68623]"
                >
                  {CAREER_GOALS.map((goal) => (
                    <option key={goal} value={goal}>
                      {goal}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="learner-bio-input" className="block text-xs font-semibold text-[#4C4332]">
                Background & Focus
              </label>
              <textarea
                id="learner-bio-input"
                rows={2}
                value={profile.bio}
                onChange={(e) => onUpdateProfile((prev) => ({ ...prev, bio: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-[#DEC99A] bg-[#FCFBF8] text-sm text-[#1B1710] focus:outline-none focus:ring-2 focus:ring-[#B68623]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onSelectPage('learning-path')}
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-2.5 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] text-[#1A150B] text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_24px_rgba(166,120,30,0.24)] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
              >
                <span>Open Adaptive Learning Path</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onSelectPage('courses')}
                className="min-h-[48px] px-5 py-2.5 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-sm font-semibold text-[#1B1710] shadow-xs transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
              >
                Explore Recommended Courses ({coursesCount})
              </button>
              <button
                type="button"
                onClick={onExitDemo}
                className="min-h-[48px] px-5 py-2.5 rounded-full border border-[#DEC99A] bg-[#FCFBF8] hover:bg-[#FAF5E8] text-sm font-semibold text-[#5A5140] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
              >
                Return to sign in
              </button>
            </div>
          </div>

          <aside className="lg:col-span-4 rounded-2xl border border-[#E6D7B3] bg-[#FAF6EC] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-[#6A5F4B]">
              <span className="font-semibold text-[#9E7016]">{profile.careerGoal} Match</span>
              <span className="tabular-nums">
                {completedLessonIds.length} done · {inProgressLessonIds.length} started
              </span>
            </div>
            <h1 id="profile-page-heading" className="font-display text-3xl sm:text-4xl font-extrabold text-[#1B1710] tabular-nums">
              {careerMatch.matchPercent}% Match
            </h1>
            <div className="h-2.5 w-full rounded-full bg-[#EAE0C8] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#DFB75B] to-[#9E7016] transition-all duration-300"
                style={{ width: `${careerMatch.matchPercent}%` }}
              />
            </div>
            <p className="text-xs sm:text-[13px] text-[#4C4332] leading-relaxed">
              {careerMatch.summaryText}
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E6D7B3] text-center">
              <div className="rounded-xl bg-white border border-[#E6D7B3] p-2">
                <div className="font-display text-lg font-extrabold text-emerald-700 tabular-nums">
                  {careerMatch.alreadyHave.length}
                </div>
                <div className="text-[11px] font-medium text-[#5A5140]">Already have</div>
              </div>
              <div className="rounded-xl bg-white border border-[#E6D7B3] p-2">
                <div className="font-display text-lg font-extrabold text-[#9E7016] tabular-nums">
                  {careerMatch.developing.length}
                </div>
                <div className="text-[11px] font-medium text-[#5A5140]">Developing</div>
              </div>
              <div className="rounded-xl bg-white border border-[#E6D7B3] p-2">
                <div className="font-display text-lg font-extrabold text-rose-700 tabular-nums">
                  {careerMatch.missing.length}
                </div>
                <div className="text-[11px] font-medium text-[#5A5140]">Missing</div>
              </div>
            </div>
          </aside>
        </section>

        {/* 2. LIVE SKILL-GAP ANALYSIS & EDITABLE ROLE REQUIREMENTS */}
        <motion.section
          {...revealProps}
          aria-labelledby="career-match-heading"
          className="rounded-[26px] border border-[#E6D7B3] bg-white p-6 sm:p-8 shadow-[0_18px_48px_-22px_rgba(120,86,18,0.16)] space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#EFE4CA]">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9E7016]">
                <Compass className="w-4 h-4" aria-hidden="true" />
                <span>Career Matching &amp; Skill Gaps</span>
              </div>
              <h2
                id="career-match-heading"
                className="mt-1 font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#1B1710]"
              >
                {profile.name || 'Learner'} vs. {profile.careerGoal} Requirements
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F7F2E5] border border-[#E6D7B3] rounded-[14px]">
              {(
                [
                  { id: 'all', label: `All (${careerMatch.allRows.length})` },
                  { id: 'already-have', label: `Already Have (${careerMatch.alreadyHave.length})` },
                  { id: 'developing', label: `Developing (${careerMatch.developing.length})` },
                  { id: 'missing', label: `Missing (${careerMatch.missing.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setGapFilter(tab.id)}
                  className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-[10px] transition-colors whitespace-nowrap cursor-pointer ${
                    gapFilter === tab.id
                      ? 'bg-white text-[#1B1710] shadow-xs border border-[#E6D7B3]'
                      : 'text-[#6A5F4B] hover:text-[#1B1710]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleGapRows.map((row) => {
              const badgeStyle =
                row.status === 'already-have'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : row.status === 'developing'
                  ? 'border-[#E2CFA3] bg-[#FAF3DE] text-[#8E6514]'
                  : 'border-rose-200 bg-rose-50 text-rose-800';
              const badgeText =
                row.status === 'already-have'
                  ? 'Already Have'
                  : row.status === 'developing'
                  ? 'Developing'
                  : 'Missing';
              const pct = Math.min(100, Math.round((row.effectiveLevel / row.requirement.targetLevel) * 100));

              return (
                <div
                  key={row.requirement.id}
                  className="rounded-2xl border border-[#E6D7B3] bg-[#FCFBF8] p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold text-[#1B1710]">
                      {row.requirement.skill}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${badgeStyle}`}>
                      {badgeText}
                    </span>
                  </div>

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
                          ? 'bg-[#C89B3C]'
                          : 'bg-rose-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <p className="text-xs text-[#5A5140] leading-relaxed">{row.requirement.why}</p>
                </div>
              );
            })}
          </div>

          {/* Editable Role Requirements Subsection */}
          <div className="pt-6 border-t border-[#EFE4CA] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-[#1B1710]">
                  Customize Demo Role Requirements ({editingGoalReq})
                </h3>
                <p className="text-xs text-[#5A5140]">
                  Edit required skill levels or add/remove target role skills to test matching rules locally.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CAREER_GOALS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setEditingGoalReq(goal)}
                    className={`min-h-[44px] px-3.5 py-1.5 rounded-full border text-xs font-semibold cursor-pointer ${
                      editingGoalReq === goal
                        ? 'border-[#C89B3C] bg-[#FAF3DE] text-[#1B1710]'
                        : 'border-[#E6D7B3] bg-white text-[#5A5140]'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeRoleReq.requirements.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border border-[#E6D7B3] bg-[#FCFBF8] p-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold text-[#1B1710]">{req.skill}</span>
                      <select
                        aria-label={`Priority for ${req.skill}`}
                        value={req.priority}
                        onChange={(e) =>
                          handleUpdateRoleRequirement(editingGoalReq, req.id, {
                            priority: e.target.value as RoleSkillRequirement['priority'],
                          })
                        }
                        className="text-xs rounded-lg border border-[#DEC99A] bg-white px-2 py-1 text-[#5A5140]"
                      >
                        <option value="Core">Core</option>
                        <option value="Important">Important</option>
                      </select>
                    </div>
                    <div className="text-[11px] text-[#5A5140] truncate">{req.why}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs text-[#5A5140] flex items-center gap-1">
                      <span>Target</span>
                      <input
                        type="number"
                        min={20}
                        max={100}
                        value={req.targetLevel}
                        onChange={(e) =>
                          handleUpdateRoleRequirement(editingGoalReq, req.id, {
                            targetLevel: Math.max(20, Math.min(100, Number(e.target.value) || 20)),
                          })
                        }
                        className="w-16 min-h-[38px] px-2 rounded-lg border border-[#DEC99A] bg-white text-xs font-semibold text-[#1B1710] tabular-nums"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveRoleRequirement(editingGoalReq, req.id)}
                      aria-label={`Remove requirement ${req.skill}`}
                      className="w-10 h-10 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleAddRoleRequirement}
              className="rounded-2xl border border-dashed border-[#DEC99A] bg-[#FAF6EC] p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
            >
              <div className="sm:col-span-3 space-y-1">
                <label className="block text-[11px] font-semibold text-[#4C4332]">Add Required Skill</label>
                <input
                  type="text"
                  value={newReqSkill}
                  onChange={(e) => setNewReqSkill(e.target.value)}
                  placeholder="e.g. TypeScript"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#DEC99A] bg-white text-sm text-[#1B1710]"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-[11px] font-semibold text-[#4C4332]">Target %</label>
                <input
                  type="number"
                  min={20}
                  max={100}
                  value={newReqTarget}
                  onChange={(e) => setNewReqTarget(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#DEC99A] bg-white text-sm text-[#1B1710]"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-[11px] font-semibold text-[#4C4332]">Priority</label>
                <select
                  value={newReqPriority}
                  onChange={(e) => setNewReqPriority(e.target.value as RoleSkillRequirement['priority'])}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#DEC99A] bg-white text-sm text-[#1B1710]"
                >
                  <option value="Core">Core</option>
                  <option value="Important">Important</option>
                </select>
              </div>
              <div className="sm:col-span-3 space-y-1">
                <label className="block text-[11px] font-semibold text-[#4C4332]">Reason</label>
                <input
                  type="text"
                  value={newReqWhy}
                  onChange={(e) => setNewReqWhy(e.target.value)}
                  placeholder="Optional reason..."
                  className="w-full min-h-[44px] px-3 rounded-xl border border-[#DEC99A] bg-white text-sm text-[#1B1710]"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full min-h-[44px] px-4 py-2 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] text-[#1A150B] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add</span>
                </button>
              </div>
            </form>
          </div>
        </motion.section>

        {/* 3. EDITABLE CURRENT SKILLS */}
        <motion.section
          {...revealProps}
          aria-labelledby="editable-skills-heading"
          className="rounded-[26px] border border-[#E6D7B3] bg-white p-6 sm:p-8 shadow-[0_18px_48px_-22px_rgba(120,86,18,0.16)] space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EFE4CA]">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9E7016]">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>Current Skills · Add, Edit, or Remove</span>
              </div>
              <h2 id="editable-skills-heading" className="mt-1 font-display text-xl sm:text-2xl font-extrabold text-[#1B1710]">
                Learner Skill Inventory ({profile.skills.length})
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.skills.map((skill) => {
              const isEditing = editingSkillId === skill.id;
              return (
                <div
                  key={skill.id}
                  className="rounded-2xl border border-[#E6D7B3] bg-[#FCFBF8] p-4 space-y-3"
                >
                  {isEditing ? (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={skill.name}
                        onChange={(e) => handleUpdateSkill(skill.id, { name: e.target.value })}
                        className="w-full min-h-[40px] px-3 rounded-lg border border-[#DEC99A] bg-white text-sm font-semibold text-[#1B1710]"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={skill.level}
                          onChange={(e) =>
                            handleUpdateSkill(skill.id, {
                              level: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                            })
                          }
                          className="min-h-[40px] px-3 rounded-lg border border-[#DEC99A] bg-white text-xs font-semibold text-[#1B1710]"
                        />
                        <select
                          value={skill.category}
                          onChange={(e) =>
                            handleUpdateSkill(skill.id, {
                              category: e.target.value as LearnerSkill['category'],
                            })
                          }
                          className="min-h-[40px] px-2 rounded-lg border border-[#DEC99A] bg-white text-xs text-[#1B1710]"
                        >
                          {SKILL_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        rows={2}
                        value={skill.summary}
                        onChange={(e) => handleUpdateSkill(skill.id, { summary: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#DEC99A] bg-white text-xs text-[#1B1710]"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingSkillId(null)}
                        className="min-h-[40px] px-4 rounded-full bg-[#C89B3C] text-[#1A150B] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Done</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-display text-base font-bold text-[#1B1710]">{skill.name}</div>
                          <div className="text-xs text-[#9E7016] font-semibold">
                            {skill.category} · {skill.level}%
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingSkillId(skill.id)}
                            aria-label={`Edit ${skill.name}`}
                            className="w-9 h-9 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-[#5A5140] flex items-center justify-center cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill.id)}
                            aria-label={`Remove ${skill.name}`}
                            className="w-9 h-9 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#EFE6CF] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#DFB75B] to-[#9E7016]"
                          style={{ width: `${skill.level}%` }}
                        />
                      </div>
                      <p className="text-xs text-[#5A5140] leading-relaxed">{skill.summary}</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleAddSkill}
            className="rounded-2xl border border-dashed border-[#DEC99A] bg-[#FAF6EC] p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-3 space-y-1">
              <label className="block text-[11px] font-semibold text-[#4C4332]">New Skill</label>
              <input
                type="text"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="e.g. CSS or React"
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DEC99A] bg-white text-sm text-[#1B1710]"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-[11px] font-semibold text-[#4C4332]">Level (0–100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(Number(e.target.value))}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DEC99A] bg-white text-sm text-[#1B1710]"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-[11px] font-semibold text-[#4C4332]">Category</label>
              <select
                value={newSkillCategory}
                onChange={(e) => setNewSkillCategory(e.target.value as LearnerSkill['category'])}
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DEC99A] bg-white text-sm text-[#1B1710]"
              >
                {SKILL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3 space-y-1">
              <label className="block text-[11px] font-semibold text-[#4C4332]">Note</label>
              <input
                type="text"
                value={newSkillSummary}
                onChange={(e) => setNewSkillSummary(e.target.value)}
                placeholder="Brief experience summary"
                className="w-full min-h-[44px] px-3 rounded-xl border border-[#DEC99A] bg-white text-sm text-[#1B1710]"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full min-h-[44px] px-4 py-2 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] text-[#1A150B] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Add skill</span>
              </button>
            </div>
          </form>
        </motion.section>

        {/* 4. EDITABLE PROJECTS & CERTIFICATIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Projects */}
          <motion.section
            {...revealProps}
            aria-labelledby="projects-heading"
            className="rounded-[26px] border border-[#E6D7B3] bg-white p-6 sm:p-7 shadow-[0_18px_48px_-22px_rgba(120,86,18,0.16)] space-y-5"
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9E7016]">
                <Briefcase className="w-4 h-4" aria-hidden="true" />
                <span>Projects ({profile.projects.length})</span>
              </div>
              <h2 id="projects-heading" className="mt-1 font-display text-xl font-extrabold text-[#1B1710]">
                Hands-On Projects
              </h2>
            </div>

            <div className="space-y-3">
              {profile.projects.map((proj) => {
                const isEditing = editingProjectId === proj.id;
                return (
                  <div
                    key={proj.id}
                    className="rounded-2xl border border-[#E6D7B3] bg-[#FCFBF8] p-4 space-y-2.5"
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={proj.title}
                          onChange={(e) => handleUpdateProject(proj.id, { title: e.target.value })}
                          className="w-full min-h-[40px] px-3 rounded-lg border border-[#DEC99A] bg-white text-sm font-semibold"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={proj.stack}
                            onChange={(e) => handleUpdateProject(proj.id, { stack: e.target.value })}
                            className="min-h-[40px] px-3 rounded-lg border border-[#DEC99A] bg-white text-xs"
                          />
                          <select
                            value={proj.status}
                            onChange={(e) =>
                              handleUpdateProject(proj.id, {
                                status: e.target.value as LearnerProject['status'],
                              })
                            }
                            className="min-h-[40px] px-2 rounded-lg border border-[#DEC99A] bg-white text-xs"
                          >
                            <option value="Planned">Planned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                        <textarea
                          rows={2}
                          value={proj.summary}
                          onChange={(e) => handleUpdateProject(proj.id, { summary: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-[#DEC99A] bg-white text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingProjectId(null)}
                          className="min-h-[38px] px-4 rounded-full bg-[#C89B3C] text-[#1A150B] text-xs font-semibold cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-display text-sm font-bold text-[#1B1710]">{proj.title}</div>
                            <div className="text-xs text-[#9E7016] font-medium">
                              {proj.stack} · {proj.status}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingProjectId(proj.id)}
                              aria-label={`Edit project ${proj.title}`}
                              className="w-9 h-9 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-[#5A5140] flex items-center justify-center cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveProject(proj.id)}
                              aria-label={`Remove project ${proj.title}`}
                              className="w-9 h-9 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-[#5A5140] leading-relaxed">{proj.summary}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={handleAddProject}
              className="rounded-2xl border border-dashed border-[#DEC99A] bg-[#FAF6EC] p-4 space-y-2.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="Project title"
                  className="min-h-[42px] px-3 rounded-xl border border-[#DEC99A] bg-white text-sm"
                />
                <input
                  type="text"
                  value={newProjectStack}
                  onChange={(e) => setNewProjectStack(e.target.value)}
                  placeholder="Stack (e.g. React · Node.js)"
                  className="min-h-[42px] px-3 rounded-xl border border-[#DEC99A] bg-white text-sm"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <select
                  value={newProjectStatus}
                  onChange={(e) => setNewProjectStatus(e.target.value as LearnerProject['status'])}
                  className="min-h-[42px] px-3 rounded-xl border border-[#DEC99A] bg-white text-xs font-semibold"
                >
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
                <input
                  type="text"
                  value={newProjectSummary}
                  onChange={(e) => setNewProjectSummary(e.target.value)}
                  placeholder="Short project summary"
                  className="flex-1 min-h-[42px] px-3 rounded-xl border border-[#DEC99A] bg-white text-sm"
                />
                <button
                  type="submit"
                  className="min-h-[42px] px-4 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] text-[#1A150B] text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add project</span>
                </button>
              </div>
            </form>
          </motion.section>

          {/* Certifications */}
          <motion.section
            {...revealProps}
            aria-labelledby="certifications-heading"
            className="rounded-[26px] border border-[#E6D7B3] bg-white p-6 sm:p-7 shadow-[0_18px_48px_-22px_rgba(120,86,18,0.16)] space-y-5"
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9E7016]">
                <Award className="w-4 h-4" aria-hidden="true" />
                <span>Certifications ({profile.certifications.length})</span>
              </div>
              <h2 id="certifications-heading" className="mt-1 font-display text-xl font-extrabold text-[#1B1710]">
                Credentials &amp; Certificates
              </h2>
            </div>

            <div className="space-y-3">
              {profile.certifications.map((cert) => {
                const isEditing = editingCertId === cert.id;
                return (
                  <div
                    key={cert.id}
                    className="rounded-2xl border border-[#E6D7B3] bg-[#FCFBF8] p-4 space-y-2.5"
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={cert.name}
                          onChange={(e) => handleUpdateCertification(cert.id, { name: e.target.value })}
                          className="w-full min-h-[40px] px-3 rounded-lg border border-[#DEC99A] bg-white text-sm font-semibold"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={cert.issuer}
                            onChange={(e) => handleUpdateCertification(cert.id, { issuer: e.target.value })}
                            className="min-h-[40px] px-3 rounded-lg border border-[#DEC99A] bg-white text-xs"
                          />
                          <input
                            type="text"
                            value={cert.year}
                            onChange={(e) => handleUpdateCertification(cert.id, { year: e.target.value })}
                            className="min-h-[40px] px-3 rounded-lg border border-[#DEC99A] bg-white text-xs"
                          />
                          <select
                            value={cert.status}
                            onChange={(e) =>
                              handleUpdateCertification(cert.id, {
                                status: e.target.value as LearnerCertification['status'],
                              })
                            }
                            className="min-h-[40px] px-2 rounded-lg border border-[#DEC99A] bg-white text-xs"
                          >
                            <option value="Earned">Earned</option>
                            <option value="In Progress">In Progress</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingCertId(null)}
                          className="min-h-[38px] px-4 rounded-full bg-[#C89B3C] text-[#1A150B] text-xs font-semibold cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-display text-sm font-bold text-[#1B1710]">{cert.name}</div>
                          <div className="text-xs text-[#5A5140]">
                            {cert.issuer} · <span className="tabular-nums">{cert.year}</span> ·{' '}
                            <span className="font-semibold text-[#9E7016]">{cert.status}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingCertId(cert.id)}
                            aria-label={`Edit certification ${cert.name}`}
                            className="w-9 h-9 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-[#5A5140] flex items-center justify-center cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveCertification(cert.id)}
                            aria-label={`Remove certification ${cert.name}`}
                            className="w-9 h-9 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={handleAddCertification}
              className="rounded-2xl border border-dashed border-[#DEC99A] bg-[#FAF6EC] p-4 space-y-2.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={newCertName}
                  onChange={(e) => setNewCertName(e.target.value)}
                  placeholder="Certification name"
                  className="min-h-[42px] px-3 rounded-xl border border-[#DEC99A] bg-white text-sm"
                />
                <input
                  type="text"
                  value={newCertIssuer}
                  onChange={(e) => setNewCertIssuer(e.target.value)}
                  placeholder="Issuer"
                  className="min-h-[42px] px-3 rounded-xl border border-[#DEC99A] bg-white text-sm"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={newCertYear}
                  onChange={(e) => setNewCertYear(e.target.value)}
                  placeholder="Year"
                  className="sm:w-24 min-h-[42px] px-3 rounded-xl border border-[#DEC99A] bg-white text-sm"
                />
                <select
                  value={newCertStatus}
                  onChange={(e) => setNewCertStatus(e.target.value as LearnerCertification['status'])}
                  className="flex-1 min-h-[42px] px-3 rounded-xl border border-[#DEC99A] bg-white text-xs font-semibold"
                >
                  <option value="Earned">Earned</option>
                  <option value="In Progress">In Progress</option>
                </select>
                <button
                  type="submit"
                  className="min-h-[42px] px-4 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] text-[#1A150B] text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add cert</span>
                </button>
              </div>
            </form>
          </motion.section>
        </div>

        {/* 5. SIMULATED 5-ROLE AI LEARNING TEAM */}
        <motion.section
          {...revealProps}
          aria-labelledby="profile-ai-team-heading"
          className="rounded-[26px] border border-[#E6D7B3] bg-white p-6 sm:p-8 shadow-[0_18px_48px_-22px_rgba(120,86,18,0.16)] space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#EFE4CA]">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9E7016]">
                <MessageSquare className="w-4 h-4" aria-hidden="true" />
                <span>5-Role Learning Team · Live Gemini AI Mentor</span>
              </div>
              <h2
                id="profile-ai-team-heading"
                className="mt-1 font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#1B1710]"
              >
                Live Agent Insights for {profile.name || 'Learner'}
              </h2>
            </div>
            <span className="text-xs font-medium text-[#6A5F4B]">
              Local profile analysis + Live Gemini AI Mentor chat
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {agentInsights.map((agent) => (
                <div
                  key={agent.role}
                  className="rounded-2xl border border-[#E6D7B3] bg-[#FCFBF8] p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-display text-sm font-bold text-[#1B1710]">
                      {agent.role}
                    </span>
                    <span className="text-[#9E7016] font-semibold">
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
                  placeholder="Ask about gaps, courses, or next step..."
                  aria-label="Ask Gemini AI Mentor"
                  className="flex-1 min-h-[44px] rounded-[14px] border border-[#E2CFA3] bg-white px-3.5 py-2 text-sm text-[#1B1710] placeholder:text-[#9A8E78] focus:outline-none focus:border-[#C89B3C] focus:ring-2 focus:ring-[#C89B3C]/40 disabled:opacity-65"
                />
                <button
                  type="submit"
                  disabled={isMentorSending || !mentorInput.trim()}
                  aria-label="Send question"
                  className="min-h-[44px] min-w-[44px] px-3.5 rounded-[14px] border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] text-[#1A150B] inline-flex items-center justify-center cursor-pointer disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
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

        {/* 6. OPTIONAL SUPPORTING MEDIA PREVIEW (USER-CONTROLLED, NO AUTOPLAY) */}
        <section className="rounded-[24px] border border-[#E6D7B3] bg-white p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9E7016]">
                <Film className="w-4 h-4" aria-hidden="true" />
                <span>Optional Campus Media</span>
              </div>
              <h2 className="font-display text-lg font-bold text-[#1B1710] mt-0.5">
                Studio Campus Walkthrough
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowWalkthroughVideo((prev) => !prev)}
              className="min-h-[44px] px-5 py-2 rounded-full border border-[#DEC99A] bg-[#FAF6EC] hover:bg-[#F3EAD3] text-xs font-semibold text-[#1B1710] cursor-pointer"
            >
              {showWalkthroughVideo ? 'Hide walkthrough video' : 'Preview walkthrough video'}
            </button>
          </div>

          {showWalkthroughVideo && (
            <div className="rounded-2xl overflow-hidden border border-[#E6D7B3] bg-[#1A150B]">
              <video
                src={CAMPUS_WALKTHROUGH_VIDEO_SRC}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[380px] object-cover"
              />
            </div>
          )}

          {rankedCourses.length > 0 && (
            <p className="text-xs text-[#6A5F4B]">
              Top recommended module right now: <strong className="text-[#1B1710]">{rankedCourses[0].course.title}</strong> — {rankedCourses[0].reason}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
