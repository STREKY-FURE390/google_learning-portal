export type PortalPageId = 'home' | 'learning-path' | 'courses' | 'profile';

export type CareerGoalId = 'Full Stack Developer' | 'Frontend Developer' | 'Backend Developer';

export type AssessmentStatus = 'steady' | 'struggled' | 'confident';

export interface LearnerSkill {
  id: string;
  name: string;
  level: number; // 0-100
  category: 'Language' | 'Frontend' | 'Backend' | 'Database' | 'Tooling';
  summary: string;
}

export interface LearnerProject {
  id: string;
  title: string;
  stack: string;
  status: 'Planned' | 'In Progress' | 'Completed';
  summary: string;
}

export interface LearnerCertification {
  id: string;
  name: string;
  issuer: string;
  year: string;
  status: 'Earned' | 'In Progress';
}

export interface LearnerProfile {
  name: string;
  careerGoal: CareerGoalId;
  bio: string;
  skills: LearnerSkill[];
  projects: LearnerProject[];
  certifications: LearnerCertification[];
}

export interface RoleSkillRequirement {
  id: string;
  skill: string;
  targetLevel: number;
  priority: 'Core' | 'Important';
  why: string;
}

export interface CareerRoleRequirement {
  goal: CareerGoalId;
  description: string;
  requirements: RoleSkillRequirement[];
}

export interface AssessmentState {
  status: AssessmentStatus;
  focusTopic: string;
  updatedAt: string;
}

export interface SkillProfileItem {
  id: string;
  name: string;
  group: 'Current Skill' | 'Next Skill';
  baseLevel: number;
  targetLevel: number;
  summary: string;
  lessonId?: string;
}

export interface LessonItem {
  id: string;
  order: number;
  skill: string;
  title: string;
  level: string;
  duration: string;
  summary: string;
  outcome: string;
  steps: string[];
  exercise: string;
  videoUrl?: string;
  isCustom?: boolean;
  isAdaptiveReview?: boolean;
}

export interface MentorMessage {
  id: string;
  role: 'mentor' | 'learner';
  text: string;
  isError?: boolean;
}

export interface SimulatedAgentInsight {
  role: 'Skill Analyst' | 'Career Matcher' | 'Learning Guide' | 'Progress Coach' | 'AI Mentor';
  focus: string;
  status: 'Simulated Demo' | 'Live Gemini AI';
  contribution: string;
}

// Supplied local video assets and fallbacks (no external URLs)
export const LOGIN_VIDEO_SRC = '/assets/login-campus.mp4';
export const LOGIN_FALLBACK_VIDEO_SRC =
  '/assets/aistudio/Creating_office_building_3D_video_39c67636_1080p_dad32e55.mp4';
export const LOGIN_POSTER_SRC = '/assets/aistudio/login_office_4k_poster.jpg';

export const HERO_VIDEO_SRC = '/assets/home-reference.mp4';
export const HERO_FALLBACK_VIDEO_SRC = '/assets/aistudio/HOME_PAGE_46546646.mp4';
export const HERO_POSTER_SRC = '/assets/home-reference-poster.jpg';

export const LEARNING_PATH_VIDEO_SRC = '/assets/learning-reference.mp4';
export const LEARNING_PATH_FALLBACK_VIDEO_SRC = '/assets/aistudio/LEARNING_PAGE_8c3c74a0.mp4';

export const CAMPUS_WALKTHROUGH_VIDEO_SRC = '/assets/campus-walkthrough.mp4';

export const CAREER_GOALS: CareerGoalId[] = [
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
];

export const DEFAULT_LEARNER_PROFILE: LearnerProfile = {
  name: 'Alex',
  careerGoal: 'Full Stack Developer',
  bio: 'Transitioning from data scripting and SQL reporting into end-to-end web application development.',
  skills: [
    {
      id: 'skill-python',
      name: 'Python',
      level: 78,
      category: 'Language',
      summary: 'Strong scripting, functions, and structured problem solving.',
    },
    {
      id: 'skill-sql',
      name: 'SQL',
      level: 72,
      category: 'Database',
      summary: 'Solid relational joins, aggregations, and schema queries.',
    },
    {
      id: 'skill-html',
      name: 'HTML',
      level: 58,
      category: 'Frontend',
      summary: 'Comfortable with semantic document structure; building CSS & JS fluency.',
    },
  ],
  projects: [
    {
      id: 'proj-sql-reporter',
      title: 'Inventory Query & CSV Reporter',
      stack: 'Python · SQLite',
      status: 'Completed',
      summary: 'Automated daily inventory reconciliation scripts backed by parameterized SQL queries.',
    },
    {
      id: 'proj-study-tracker',
      title: 'Developer Study Tracker',
      stack: 'HTML · CSS · React · Node.js',
      status: 'In Progress',
      summary: 'Full-stack capstone connecting an interactive React interface to a REST API and SQL database.',
    },
  ],
  certifications: [
    {
      id: 'cert-sql-foundations',
      name: 'Relational Database & SQL Foundations',
      issuer: 'Open Developer Track',
      year: '2025',
      status: 'Earned',
    },
    {
      id: 'cert-fullstack-capstone',
      name: 'Full Stack Web Engineering Certificate',
      issuer: 'DevPath Studio',
      year: '2026',
      status: 'In Progress',
    },
  ],
};

export const DEFAULT_ROLE_REQUIREMENTS: Record<CareerGoalId, CareerRoleRequirement> = {
  'Full Stack Developer': {
    goal: 'Full Stack Developer',
    description:
      'Designs responsive UI components, manages client state, builds REST APIs, and connects relational databases with clean Git workflows.',
    requirements: [
      {
        id: 'fs-python',
        skill: 'Python',
        targetLevel: 75,
        priority: 'Important',
        why: 'Reusable backend logic, scripting, and API problem solving.',
      },
      {
        id: 'fs-sql',
        skill: 'SQL',
        targetLevel: 75,
        priority: 'Core',
        why: 'Persistent data modeling, joins, and safe parameterized queries.',
      },
      {
        id: 'fs-html',
        skill: 'HTML',
        targetLevel: 75,
        priority: 'Core',
        why: 'Accessible semantic markup for forms, landmarks, and JSX.',
      },
      {
        id: 'fs-css',
        skill: 'CSS',
        targetLevel: 75,
        priority: 'Core',
        why: 'Responsive Grid/Flexbox layouts and consistent design tokens.',
      },
      {
        id: 'fs-js',
        skill: 'JavaScript',
        targetLevel: 80,
        priority: 'Core',
        why: 'Browser interactivity, async data fetching, and shared JS fluency.',
      },
      {
        id: 'fs-react',
        skill: 'React',
        targetLevel: 80,
        priority: 'Core',
        why: 'Component composition, hooks, and predictable client UI state.',
      },
      {
        id: 'fs-node',
        skill: 'Node.js',
        targetLevel: 75,
        priority: 'Core',
        why: 'Server runtime, Express routing, and middleware architecture.',
      },
      {
        id: 'fs-git',
        skill: 'Git',
        targetLevel: 75,
        priority: 'Important',
        why: 'Branching, clean commits, and collaborative pull requests.',
      },
      {
        id: 'fs-rest',
        skill: 'REST APIs',
        targetLevel: 80,
        priority: 'Core',
        why: 'Contract design, validation, and end-to-end client/server integration.',
      },
    ],
  },
  'Frontend Developer': {
    goal: 'Frontend Developer',
    description:
      'Crafts accessible, responsive web interfaces with modern CSS, deep JavaScript fluency, component state in React, and clean API integration.',
    requirements: [
      {
        id: 'fe-html',
        skill: 'HTML',
        targetLevel: 85,
        priority: 'Core',
        why: 'Accessible landmarks, forms, and keyboard navigation semantics.',
      },
      {
        id: 'fe-css',
        skill: 'CSS',
        targetLevel: 85,
        priority: 'Core',
        why: 'Responsive layout systems, fluid spacing, and UI states.',
      },
      {
        id: 'fe-js',
        skill: 'JavaScript',
        targetLevel: 85,
        priority: 'Core',
        why: 'DOM events, async fetch, closures, and state updates.',
      },
      {
        id: 'fe-react',
        skill: 'React',
        targetLevel: 85,
        priority: 'Core',
        why: 'Reusable components, custom hooks, and responsive UI views.',
      },
      {
        id: 'fe-rest',
        skill: 'REST APIs',
        targetLevel: 75,
        priority: 'Important',
        why: 'Consuming JSON endpoints with loading and error handling.',
      },
      {
        id: 'fe-git',
        skill: 'Git',
        targetLevel: 75,
        priority: 'Important',
        why: 'Feature branches and collaborative UI pull requests.',
      },
    ],
  },
  'Backend Developer': {
    goal: 'Backend Developer',
    description:
      'Architects reliable server endpoints, relational data models, query optimization, and versioned API contracts.',
    requirements: [
      {
        id: 'be-python',
        skill: 'Python',
        targetLevel: 85,
        priority: 'Core',
        why: 'Service logic, data transformation, and backend automation.',
      },
      {
        id: 'be-sql',
        skill: 'SQL',
        targetLevel: 85,
        priority: 'Core',
        why: 'Schema design, joins, indexing, and transaction integrity.',
      },
      {
        id: 'be-node',
        skill: 'Node.js',
        targetLevel: 80,
        priority: 'Core',
        why: 'Event-driven HTTP services, Express middleware, and tooling.',
      },
      {
        id: 'be-rest',
        skill: 'REST APIs',
        targetLevel: 85,
        priority: 'Core',
        why: 'Resource modeling, status codes, validation, and contracts.',
      },
      {
        id: 'be-js',
        skill: 'JavaScript',
        targetLevel: 75,
        priority: 'Important',
        why: 'Async/await service handlers and JSON payload processing.',
      },
      {
        id: 'be-git',
        skill: 'Git',
        targetLevel: 80,
        priority: 'Core',
        why: 'Safe branching, code reviews, and release workflows.',
      },
    ],
  },
};

export const DEFAULT_ASSESSMENT: AssessmentState = {
  status: 'steady',
  focusTopic: 'JavaScript & DOM practice',
  updatedAt: 'Initial demo baseline',
};

// Backwards-compatible static baseline list used where needed
export const SAMPLE_SKILLS: SkillProfileItem[] = [
  {
    id: 'python',
    name: 'Python',
    group: 'Current Skill',
    baseLevel: 78,
    targetLevel: 85,
    summary: 'Strong scripting, functions, and data-handling foundation.',
  },
  {
    id: 'sql',
    name: 'SQL',
    group: 'Current Skill',
    baseLevel: 72,
    targetLevel: 80,
    summary: 'Solid joins, aggregations, and relational schema queries.',
  },
  {
    id: 'html',
    name: 'HTML',
    group: 'Current Skill',
    baseLevel: 58,
    targetLevel: 80,
    summary: 'Comfortable with document structure; ready for accessible forms.',
  },
  {
    id: 'css',
    name: 'CSS',
    group: 'Next Skill',
    baseLevel: 20,
    targetLevel: 80,
    summary: 'Priority gap: Flexbox, Grid, responsive spacing, and states.',
    lessonId: 'lesson-css',
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    group: 'Next Skill',
    baseLevel: 15,
    targetLevel: 85,
    summary: 'Priority gap: DOM events, async fetch, modules, and array transforms.',
    lessonId: 'lesson-js',
  },
  {
    id: 'react',
    name: 'React',
    group: 'Next Skill',
    baseLevel: 5,
    targetLevel: 80,
    summary: 'Core frontend library for interactive component architecture.',
    lessonId: 'lesson-react',
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    group: 'Next Skill',
    baseLevel: 10,
    targetLevel: 75,
    summary: 'JavaScript runtime for full-stack tooling and server services.',
    lessonId: 'lesson-node',
  },
  {
    id: 'git',
    name: 'Git',
    group: 'Next Skill',
    baseLevel: 25,
    targetLevel: 75,
    summary: 'Branching, pull requests, and clean commit history workflows.',
    lessonId: 'lesson-git',
  },
  {
    id: 'rest-apis',
    name: 'REST APIs',
    group: 'Next Skill',
    baseLevel: 20,
    targetLevel: 80,
    summary: 'Connects frontend React views to backend services and SQL data.',
    lessonId: 'lesson-rest',
  },
];

export const FEATURED_LESSONS: LessonItem[] = [
  {
    id: 'lesson-css',
    order: 1,
    skill: 'CSS',
    title: 'Responsive CSS Grid & Flexbox Systems',
    level: 'Beginner',
    duration: '45 min',
    summary:
      'Build adaptive layouts on top of existing HTML knowledge using fluid grids, Flexbox alignment, and mobile-first breakpoints.',
    outcome: 'Closes your primary styling gap before JavaScript UI work.',
    steps: [
      'Structure a two-column dashboard layout with CSS Grid template areas.',
      'Align navigation links and action cards cleanly using Flexbox gap and wrap.',
      'Apply mobile breakpoints and high-contrast keyboard focus outlines.',
    ],
    exercise:
      'Convert a static HTML study log into a responsive two-column layout that collapses cleanly on 375px phones.',
  },
  {
    id: 'lesson-js',
    order: 2,
    skill: 'JavaScript',
    title: 'Modern JavaScript & Async Data Fetching',
    level: 'Beginner',
    duration: '60 min',
    summary:
      'Translate Python logic concepts into JavaScript closures, ES modules, DOM updates, and async/await network requests.',
    outcome: 'Unlocks interactive browser behavior and React readiness.',
    steps: [
      'Filter and map course arrays using immutable JavaScript methods.',
      'Wire click and form submit handlers cleanly without mutating DOM blindly.',
      'Fetch JSON payloads with async/await and handle loading or error states.',
    ],
    exercise:
      'Build a live skill-filter utility in vanilla JavaScript that groups items into matched, developing, and missing buckets.',
  },
  {
    id: 'lesson-react',
    order: 3,
    skill: 'React',
    title: 'React Components, Props & State Hooks',
    level: 'Intermediate',
    duration: '75 min',
    summary:
      'Structure reusable UI components, manage form state cleanly, and render live skill and task lists.',
    outcome: 'Builds the core frontend framework required for Full Stack & Frontend roles.',
    steps: [
      'Decompose a dashboard view into focused typed components with props.',
      'Manage shared completion state with useState and derived memoized totals.',
      'Render accessible interactive filter tabs and empty states cleanly.',
    ],
    exercise:
      'Create an interactive Course Checklist component that recalculates role readiness immediately as items are toggled.',
  },
  {
    id: 'lesson-node',
    order: 4,
    skill: 'Node.js',
    title: 'Node.js Runtime & Express Foundations',
    level: 'Intermediate',
    duration: '55 min',
    summary:
      'Set up an HTTP server in Node.js, structure middleware, and serve JSON responses alongside Python and SQL skills.',
    outcome: 'Gives you full-stack JavaScript versatility across client and server.',
    steps: [
      'Initialize an Express server and organize modular route handlers.',
      'Validate incoming JSON request bodies and return proper HTTP status codes.',
      'Configure local environment variables and error-handling middleware.',
    ],
    exercise:
      'Write an Express route handler that validates a new lesson payload and returns structured JSON confirmation.',
  },
  {
    id: 'lesson-git',
    order: 5,
    skill: 'Git',
    title: 'Git Branching & Collaborative Pull Requests',
    level: 'Beginner',
    duration: '40 min',
    summary:
      'Practice feature branches, conflict resolution, and clean code reviews used on engineering teams.',
    outcome: 'Establishes essential daily version-control habits.',
    steps: [
      'Create a scoped feature branch and stage atomic commits with clear messages.',
      'Inspect line diffs and resolve a controlled merge conflict calmly.',
      'Write a concise pull request summary linking requirements to verification.',
    ],
    exercise:
      'Simulate a two-branch edit conflict on a README roadmap table, resolve it cleanly, and verify commit history.',
  },
  {
    id: 'lesson-rest',
    order: 6,
    skill: 'REST APIs',
    title: 'Designing & Connecting Full-Stack REST APIs',
    level: 'Intermediate',
    duration: '65 min',
    summary:
      'Design clean resource endpoints, validate payloads, and connect a React client to SQL-backed server routes.',
    outcome: 'Unifies frontend and backend skills into a complete Full Stack app.',
    steps: [
      'Design predictable GET, POST, and PATCH resource routes with status codes.',
      'Connect parameterized SQL queries to JSON response serializers.',
      'Wire a React client form to update UI state smoothly on response.',
    ],
    exercise:
      'Map out the API contract (request/response shapes) for Alex’s Developer Study Tracker and connect it to local demo handlers.',
  },
];

export const JS_REVIEW_LESSON: LessonItem = {
  id: 'lesson-js-review',
  order: 2,
  skill: 'JavaScript',
  title: 'JavaScript Review: Closures, DOM Events & Async Fetch',
  level: 'Review',
  duration: '35 min',
  isAdaptiveReview: true,
  summary:
    'Focused reinforcement lab on scope, event listeners, and async/await promises moved earlier so core JavaScript clicks before React or Node.js.',
  outcome: 'Solidifies browser JavaScript fundamentals after struggling in practice.',
  steps: [
    'Trace variable scope and callback closures step by step.',
    'Debug a broken DOM click listener without blind state mutations.',
    'Step through a clean async fetch() chain with try/catch error recovery.',
  ],
  exercise:
    'Fix three buggy JavaScript snippets covering array filtering, button click handlers, and async error handling.',
};

export const AI_LEARNING_TEAM = [
  {
    role: 'Skill Analyst',
    focus: 'Baseline Audit',
    status: 'Simulated Demo',
    contribution:
      'Compares your current profile skills against your selected career goal to classify strengths, developing skills, and missing gaps.',
  },
  {
    role: 'Career Matcher',
    focus: 'Role Fit',
    status: 'Simulated Demo',
    contribution:
      'Calculates your target-role match score and tracks how projects and certifications support your readiness.',
  },
  {
    role: 'Learning Guide',
    focus: 'Curriculum Sequence',
    status: 'Simulated Demo',
    contribution:
      'Ranks available courses and practical exercises based on your highest-priority missing skills.',
  },
  {
    role: 'Progress Coach',
    focus: 'Pacing & Milestones',
    status: 'Simulated Demo',
    contribution:
      'Responds to started and completed lessons plus assessment check-ins to adjust your roadmap pacing.',
  },
  {
    role: 'AI Mentor',
    focus: 'Next-Step Guidance',
    status: 'Live Gemini AI',
    contribution:
      'Answers study questions using Gemini AI grounded in your current skills, career goal gaps, and roadmap state.',
  },
];

export const DEFAULT_QUICK_ASK_PROMPT = 'What should I study next?';

export const MENTOR_PROMPTS = [
  DEFAULT_QUICK_ASK_PROMPT,
  'How do my current skills map to my missing gaps?',
  'Which project or exercise ties these skills together?',
];
