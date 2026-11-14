import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

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
  completedCount?: number;
  inProgressCount?: number;
  totalModules?: number;
  projects?: string[];
}

interface MentorChatRequestBody {
  message?: string;
  history?: ChatHistoryEntry[];
  learnerContext?: LearnerContextPayload;
}

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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/mentor/chat', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as MentorChatRequestBody;
    const message = typeof body.message === 'string' ? body.message.trim() : '';

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

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: formatConversationContents(message, body.history),
        config: {
          systemInstruction: buildSystemInstruction(body.learnerContext),
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
      const errorObj = err as { status?: number; message?: string };
      const status = typeof errorObj?.status === 'number' ? errorObj.status : 500;
      const rawMessage = errorObj?.message || 'Unexpected error calling Gemini API.';

      if (status === 400 || status === 403 || rawMessage.includes('API_KEY_INVALID') || rawMessage.includes('PERMISSION_DENIED')) {
        res.status(status).json({
          error: 'Gemini AI mentor service could not authorize this request right now.',
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
        error: 'Gemini mentor could not respond right now. Please try again in a moment.',
      });
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
