import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface ChatHistoryEntry {
  role: 'mentor' | 'learner';
  text: string;
}

interface LearnerContextPayload {
  name?: string;
  careerGoal?: string;
  matchPercent?: number;
  alreadyHaveSkills?: string[];
  developingSkills?: string[];
  missingSkills?: string[];
  assessmentStatus?: string;
  assessmentFocus?: string;
  recommendedNextTitle?: string;
  recommendedNextSkill?: string;
  recommendedNextExercise?: string;
  topCourseTitle?: string;
  topCourseSkill?: string;
  topCourseExercise?: string;
  completedCount?: number;
  inProgressCount?: number;
  totalModules?: number;
  certificationsCount?: number;
  projects?: string[];
}

interface MentorChatRequestBody {
  message?: string;
  history?: ChatHistoryEntry[];
  learnerContext?: LearnerContextPayload;
}

interface AgentsAnalyzeRequestBody {
  learnerContext?: LearnerContextPayload;
}

type AgentRoleName =
  | 'Skill Analyst'
  | 'Career Matcher'
  | 'Learning Guide'
  | 'Progress Coach'
  | 'AI Mentor';

const EXPECTED_AGENT_ROLES: AgentRoleName[] = [
  'Skill Analyst',
  'Career Matcher',
  'Learning Guide',
  'Progress Coach',
  'AI Mentor',
];

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSystemInstruction(ctx?: LearnerContextPayload): string {
  const name = ctx?.name?.trim() || 'Alex';
  const careerGoal = ctx?.careerGoal?.trim() || 'Full Stack Developer';
  const matchPercent = typeof ctx?.matchPercent === 'number' ? ctx.matchPercent : 0;
  const alreadyHave =
    ctx?.alreadyHaveSkills && ctx.alreadyHaveSkills.length > 0
      ? ctx.alreadyHaveSkills.join(', ')
      : 'None recorded yet';
  const developing =
    ctx?.developingSkills && ctx.developingSkills.length > 0
      ? ctx.developingSkills.join(', ')
      : 'None';
  const missing =
    ctx?.missingSkills && ctx.missingSkills.length > 0
      ? ctx.missingSkills.join(', ')
      : 'None (all core role requirements covered)';
  const assessmentStatus = ctx?.assessmentStatus || 'steady';
  const assessmentFocus = ctx?.assessmentFocus || 'JavaScript & DOM practice';
  const nextTitle = ctx?.recommendedNextTitle || 'None (track complete)';
  const nextSkill = ctx?.recommendedNextSkill || 'Capstone review';
  const nextExercise = ctx?.recommendedNextExercise || '';
  const completedCount = typeof ctx?.completedCount === 'number' ? ctx.completedCount : 0;
  const inProgressCount = typeof ctx?.inProgressCount === 'number' ? ctx.inProgressCount : 0;
  const totalModules = typeof ctx?.totalModules === 'number' ? ctx.totalModules : 0;
  const projects =
    ctx?.projects && ctx.projects.length > 0 ? ctx.projects.join(', ') : 'No projects logged yet';

  return [
    'You are the Gemini AI Study Mentor inside DevPath Studio, a developer learning portal.',
    'Give clear, practical, encouraging guidance in clean plain text or simple bullet lines using "•" (no markdown bold **, backticks, or headings; keep answers concise—under 140 words unless asked for details).',
    'Always ground your advice in the learner’s actual state below without inventing progress or external links:',
    `- Learner Name: ${name}`,
    `- Target Career Goal: ${careerGoal} (${matchPercent}% match)`,
    `- Skills Already Strong: ${alreadyHave}`,
    `- Developing Skills: ${developing}`,
    `- Missing Skill Gaps: ${missing}`,
    `- Roadmap Progress: ${completedCount} completed, ${inProgressCount} in progress out of ${totalModules} modules`,
    `- Assessment Check-In: "${assessmentStatus}" on topic "${assessmentFocus}"`,
    `- Recommended Next Lesson: "${nextTitle}" (Skill: ${nextSkill})${nextExercise ? ` — Exercise: ${nextExercise}` : ''}`,
    `- Learner Projects: ${projects}`,
    'When answering "What should I study next?", explain the single best next lesson/skill above and why it bridges their current strengths to their target career goal.',
  ].join('\n');
}

function formatConversationContents(
  message: string,
  history: ChatHistoryEntry[] | undefined
): string {
  const recent = (history ?? []).slice(-6).filter((item) => item && typeof item.text === 'string' && item.text.trim());
  if (recent.length === 0) return message;

  const transcript = recent
    .map((entry) => `${entry.role === 'learner' ? 'Learner' : 'Mentor'}: ${entry.text.trim()}`)
    .join('\n');

  return `Recent conversation:\n${transcript}\n\nLearner's new question: ${message}`;
}

function handleGeminiError(err: unknown, res: Response, fallbackMessage: string) {
  const errorObj = err as { status?: number; message?: string };
  const status = typeof errorObj?.status === 'number' ? errorObj.status : 500;
  const rawMessage = errorObj?.message || fallbackMessage;

  if (
    status === 400 ||
    status === 403 ||
    rawMessage.includes('API_KEY_INVALID') ||
    rawMessage.includes('PERMISSION_DENIED')
  ) {
    res.status(status).json({
      error: 'Gemini AI agent service could not authorize this request right now.',
    });
    return;
  }

  if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    res.status(429).json({
      error: 'Gemini API rate limit reached. Please wait a moment and try again.',
    });
    return;
  }

  res.status(500).json({
    error: fallbackMessage,
  });
}

const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkApiRateLimit(req: Request, res: Response): boolean {
  const now = Date.now();
  if (rateLimitMap.size > 500) {
    for (const [key, entry] of rateLimitMap.entries()) {
      if (entry.resetAt <= now) rateLimitMap.delete(key);
    }
  }

  const clientIp =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
      : req.ip) || 'unknown';

  const current = rateLimitMap.get(clientIp);
  if (!current || current.resetAt <= now) {
    rateLimitMap.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    res.status(429).json({
      error: 'Too many AI requests in a short window. Please wait a minute and try again.',
    });
    return false;
  }

  current.count += 1;
  return true;
}

function clampString(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLen) : undefined;
}

function clampStringList(value: unknown, maxItems = 16, maxLen = 64): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, maxItems)
    .map((item) => item.trim().slice(0, maxLen));
}

function sanitizeLearnerContext(ctx: unknown): LearnerContextPayload | undefined {
  if (!ctx || typeof ctx !== 'object') return undefined;
  const raw = ctx as Record<string, unknown>;
  return {
    name: clampString(raw.name, 80),
    careerGoal: clampString(raw.careerGoal, 80),
    matchPercent:
      typeof raw.matchPercent === 'number' && Number.isFinite(raw.matchPercent)
        ? Math.max(0, Math.min(100, Math.round(raw.matchPercent)))
        : undefined,
    alreadyHaveSkills: clampStringList(raw.alreadyHaveSkills),
    developingSkills: clampStringList(raw.developingSkills),
    missingSkills: clampStringList(raw.missingSkills),
    assessmentStatus: clampString(raw.assessmentStatus, 32),
    assessmentFocus: clampString(raw.assessmentFocus, 120),
    recommendedNextTitle: clampString(raw.recommendedNextTitle, 140),
    recommendedNextSkill: clampString(raw.recommendedNextSkill, 64),
    recommendedNextExercise: clampString(raw.recommendedNextExercise, 320),
    topCourseTitle: clampString(raw.topCourseTitle, 140),
    topCourseSkill: clampString(raw.topCourseSkill, 64),
    topCourseExercise: clampString(raw.topCourseExercise, 320),
    completedCount:
      typeof raw.completedCount === 'number' && Number.isFinite(raw.completedCount)
        ? Math.max(0, Math.round(raw.completedCount))
        : undefined,
    inProgressCount:
      typeof raw.inProgressCount === 'number' && Number.isFinite(raw.inProgressCount)
        ? Math.max(0, Math.round(raw.inProgressCount))
        : undefined,
    totalModules:
      typeof raw.totalModules === 'number' && Number.isFinite(raw.totalModules)
        ? Math.max(0, Math.round(raw.totalModules))
        : undefined,
    certificationsCount:
      typeof raw.certificationsCount === 'number' && Number.isFinite(raw.certificationsCount)
        ? Math.max(0, Math.round(raw.certificationsCount))
        : undefined,
    projects: clampStringList(raw.projects, 12, 100),
  };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
  app.use(express.json({ limit: '256kb' }));

  app.post('/api/mentor/chat', async (req: Request, res: Response) => {
    if (!checkApiRateLimit(req, res)) return;
    const body = (req.body ?? {}) as MentorChatRequestBody;
    const message = clampString(body.message, MAX_MESSAGE_LENGTH) ?? '';

    if (!message) {
      res.status(400).json({ error: 'Please enter a question before sending.' });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini AI mentor service is temporarily unavailable. Please try again shortly.',
      });
      return;
    }

    const safeHistory = Array.isArray(body.history)
      ? body.history
          .slice(-6)
          .filter(
            (entry): entry is ChatHistoryEntry =>
              Boolean(entry) &&
              (entry.role === 'learner' || entry.role === 'mentor') &&
              typeof entry.text === 'string' &&
              entry.text.trim().length > 0
          )
          .map((entry) => ({ role: entry.role, text: entry.text.trim().slice(0, 800) }))
      : undefined;
    const safeContext = sanitizeLearnerContext(body.learnerContext);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: formatConversationContents(message, safeHistory),
        config: {
          systemInstruction: buildSystemInstruction(safeContext),
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const reply = (response.text ?? '').trim();
      if (!reply) {
        res.status(502).json({
          error: 'Gemini returned an empty response. Please try asking again.',
        });
        return;
      }

      res.json({ reply });
    } catch (err: unknown) {
      handleGeminiError(
        err,
        res,
        'Gemini mentor could not respond right now. Please try again in a moment.'
      );
    }
  });

  app.post('/api/agents/analyze', async (req: Request, res: Response) => {
    if (!checkApiRateLimit(req, res)) return;
    const body = (req.body ?? {}) as AgentsAnalyzeRequestBody;
    const ctx = sanitizeLearnerContext(body.learnerContext);

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini AI agent service is temporarily unavailable. Please try again shortly.',
      });
      return;
    }

    const prompt = [
      'Generate concise, tailored insights for all 5 DevPath Studio learning team roles:',
      '1. Skill Analyst (Profile vs. Goal Audit)',
      '2. Career Matcher (Target Role Match)',
      '3. Learning Guide (Course & Exercise Ranker)',
      '4. Progress Coach (Pacing & Assessment)',
      '5. AI Mentor (Next-Step Guidance)',
      '',
      'Each contribution must be 1 to 2 clear plain-text sentences (no markdown ** or backticks) strictly grounded in the learner state below:',
      buildSystemInstruction(ctx),
      ctx?.topCourseTitle
        ? `- Top Ranked Course: "${ctx.topCourseTitle}" (${ctx.topCourseSkill ?? ''}) — Exercise: ${ctx.topCourseExercise ?? ''}`
        : '',
      typeof ctx?.certificationsCount === 'number'
        ? `- Certifications Count: ${ctx.certificationsCount}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are the DevPath Studio 5-Role AI Agent Coordinator. Return accurate, encouraging plain-text insights matching the JSON schema.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              agents: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    role: { type: Type.STRING },
                    focus: { type: Type.STRING },
                    contribution: { type: Type.STRING },
                  },
                  required: ['role', 'focus', 'contribution'],
                },
              },
            },
            required: ['agents'],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          error: 'Gemini returned an empty agent analysis. Please try again.',
        });
        return;
      }

      let parsed: {
        agents?: Array<{ role?: string; focus?: string; contribution?: string }>;
      };
      try {
        parsed = JSON.parse(rawText) as {
          agents?: Array<{ role?: string; focus?: string; contribution?: string }>;
        };
      } catch {
        res.status(502).json({
          error: 'Gemini returned an unreadable agent response. Please try refreshing.',
        });
        return;
      }
      const items = Array.isArray(parsed?.agents) ? parsed.agents : [];

      const byRole = new Map<string, { focus: string; contribution: string }>();
      for (const item of items) {
        if (item && typeof item.role === 'string' && typeof item.contribution === 'string') {
          byRole.set(item.role.trim().toLowerCase(), {
            focus: typeof item.focus === 'string' && item.focus.trim() ? item.focus.trim() : 'Live Analysis',
            contribution: item.contribution.trim(),
          });
        }
      }

      const normalizedAgents = EXPECTED_AGENT_ROLES.map((role) => {
        const match = byRole.get(role.toLowerCase());
        return {
          role,
          focus: match?.focus ?? 'Live Analysis',
          status: 'Live Gemini AI' as const,
          contribution:
            match?.contribution ??
            `${role} reviewed ${ctx?.name || 'your'} ${ctx?.careerGoal || 'target'} profile (${ctx?.matchPercent ?? 0}% match).`,
        };
      });

      res.json({ agents: normalizedAgents });
    } catch (err: unknown) {
      handleGeminiError(
        err,
        res,
        'Gemini agent team analysis could not complete right now. Please try again.'
      );
    }
  });

  if (IS_PRODUCTION) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DevPath Studio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
