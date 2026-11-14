import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { LessonItem } from '../data/portalData';

export interface CourseDraft {
  title: string;
  skill: string;
  level: string;
  duration: string;
  summary: string;
  outcome: string;
  steps: string[];
  exercise: string;
  videoUrl?: string;
}

export const SAMPLE_IMPORT_BUNDLE = `TypeScript Generics & Strict Interfaces | TypeScript | Intermediate | 55 min | Add compile-time type safety across React components and Express API handlers. | Eliminates runtime payload mismatches between client and server.
PostgreSQL Indexing & Query Plans | SQL | Intermediate | 50 min | Optimize relational joins, composite indexes, and EXPLAIN ANALYZE diagnostics. | Cuts query latency on production Full Stack endpoints.
Automated Testing with Vitest & Playwright | Testing | Beginner | 45 min | Write unit tests for utilities and end-to-end assertions for critical user flows. | Ships confident releases without manual regression checks.`;

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function getMotifIndex(course: Pick<LessonItem, 'id' | 'skill' | 'title'>): number {
  const s = `${course.skill} ${course.title}`.toLowerCase();
  if (s.includes('css') || s.includes('grid') || s.includes('style')) return 0;
  if (s.includes('javascript') || s.includes('async') || s.includes('typescript')) return 1;
  if (s.includes('react') || s.includes('component') || s.includes('ui')) return 2;
  if (s.includes('node') || s.includes('express') || s.includes('docker') || s.includes('server')) return 3;
  if (s.includes('git') || s.includes('branch') || s.includes('test')) return 4;
  if (s.includes('rest') || s.includes('api') || s.includes('sql') || s.includes('postgres')) return 5;
  return hashString(`${course.id}-${course.title}`) % 6;
}

export function CourseArtworkMotif({
  course,
  variant = 'cover',
}: {
  course: Pick<LessonItem, 'id' | 'skill' | 'title'>;
  variant?: 'cover' | 'spine';
}) {
  const motif = getMotifIndex(course);
  const strokeWidth = variant === 'spine' ? 1.8 : 1.4;

  if (motif === 0) {
    // CSS Grid & Architectural Frame
    return (
      <svg viewBox="0 0 180 180" className="w-full h-full" aria-hidden="true">
        <rect x="14" y="14" width="152" height="152" fill="#FBF6E8" stroke="#9E7016" strokeWidth={strokeWidth} />
        <rect x="28" y="28" width="58" height="58" fill="#C89B3C" fillOpacity="0.22" stroke="#1B1710" strokeWidth={strokeWidth} />
        <rect x="94" y="28" width="58" height="124" fill="#1B1710" fillOpacity="0.06" stroke="#9E7016" strokeWidth={strokeWidth} />
        <rect x="28" y="94" width="58" height="58" fill="#1B1710" />
        <circle cx="57" cy="123" r="14" fill="#EBD084" />
        <line x1="94" y1="74" x2="152" y2="74" stroke="#9E7016" strokeWidth={strokeWidth} />
        <line x1="94" y1="112" x2="152" y2="112" stroke="#9E7016" strokeWidth={strokeWidth} />
      </svg>
    );
  }

  if (motif === 1) {
    // JavaScript / Async Orbital Waves
    return (
      <svg viewBox="0 0 180 180" className="w-full h-full" aria-hidden="true">
        <rect x="14" y="14" width="152" height="152" fill="#FBF6E8" stroke="#9E7016" strokeWidth={strokeWidth} />
        <circle cx="90" cy="90" r="54" fill="none" stroke="#1B1710" strokeWidth={strokeWidth} />
        <circle cx="90" cy="90" r="36" fill="#C89B3C" fillOpacity="0.2" stroke="#9E7016" strokeWidth={strokeWidth} strokeDasharray="5 4" />
        <path d="M26 110 C54 62, 126 118, 154 70" fill="none" stroke="#1B1710" strokeWidth={strokeWidth * 1.6} />
        <circle cx="136" cy="54" r="9" fill="#C89B3C" stroke="#1B1710" strokeWidth={strokeWidth} />
        <circle cx="46" cy="124" r="7" fill="#1B1710" />
      </svg>
    );
  }

  if (motif === 2) {
    // React / Nested Component Rings
    return (
      <svg viewBox="0 0 180 180" className="w-full h-full" aria-hidden="true">
        <rect x="14" y="14" width="152" height="152" fill="#FBF6E8" stroke="#9E7016" strokeWidth={strokeWidth} />
        <ellipse cx="90" cy="90" rx="58" ry="22" transform="rotate(28 90 90)" fill="none" stroke="#1B1710" strokeWidth={strokeWidth} />
        <ellipse cx="90" cy="90" rx="58" ry="22" transform="rotate(-28 90 90)" fill="none" stroke="#9E7016" strokeWidth={strokeWidth} />
        <ellipse cx="90" cy="90" rx="58" ry="22" transform="rotate(90 90 90)" fill="none" stroke="#C89B3C" strokeWidth={strokeWidth} />
        <circle cx="90" cy="90" r="13" fill="#1B1710" />
        <circle cx="90" cy="90" r="5.5" fill="#ECD082" />
      </svg>
    );
  }

  if (motif === 3) {
    // Node.js / Hex Server Mesh
    return (
      <svg viewBox="0 0 180 180" className="w-full h-full" aria-hidden="true">
        <rect x="14" y="14" width="152" height="152" fill="#FBF6E8" stroke="#9E7016" strokeWidth={strokeWidth} />
        <polygon points="90,30 142,60 142,120 90,150 38,120 38,60" fill="#C89B3C" fillOpacity="0.16" stroke="#1B1710" strokeWidth={strokeWidth} />
        <polygon points="90,50 124,70 124,110 90,130 56,110 56,70" fill="none" stroke="#9E7016" strokeWidth={strokeWidth} />
        <line x1="90" y1="30" x2="90" y2="150" stroke="#1B1710" strokeOpacity="0.35" strokeWidth={strokeWidth} />
        <circle cx="90" cy="90" r="10" fill="#1B1710" />
        <circle cx="90" cy="50" r="5" fill="#C89B3C" />
        <circle cx="90" cy="130" r="5" fill="#C89B3C" />
      </svg>
    );
  }

  if (motif === 4) {
    // Git / Branching Graph
    return (
      <svg viewBox="0 0 180 180" className="w-full h-full" aria-hidden="true">
        <rect x="14" y="14" width="152" height="152" fill="#FBF6E8" stroke="#9E7016" strokeWidth={strokeWidth} />
        <line x1="62" y1="34" x2="62" y2="146" stroke="#1B1710" strokeWidth={strokeWidth * 1.5} />
        <path d="M62 114 C62 84, 120 88, 120 56" fill="none" stroke="#9E7016" strokeWidth={strokeWidth * 1.5} />
        <circle cx="62" cy="44" r="9" fill="#1B1710" />
        <circle cx="62" cy="134" r="9" fill="#C89B3C" stroke="#1B1710" strokeWidth={strokeWidth} />
        <circle cx="120" cy="56" r="11" fill="#EBD084" stroke="#1B1710" strokeWidth={strokeWidth} />
        <circle cx="62" cy="112" r="6" fill="#FAF6EC" stroke="#1B1710" strokeWidth={strokeWidth} />
      </svg>
    );
  }

  // REST APIs & SQL / Twin Bridge Layers
  return (
    <svg viewBox="0 0 180 180" className="w-full h-full" aria-hidden="true">
      <rect x="14" y="14" width="152" height="152" fill="#FBF6E8" stroke="#9E7016" strokeWidth={strokeWidth} />
      <rect x="30" y="38" width="46" height="104" fill="#1B1710" />
      <rect x="104" y="38" width="46" height="104" fill="#C89B3C" fillOpacity="0.28" stroke="#9E7016" strokeWidth={strokeWidth} />
      <line x1="76" y1="68" x2="104" y2="68" stroke="#9E7016" strokeWidth={strokeWidth * 1.6} />
      <line x1="76" y1="90" x2="104" y2="90" stroke="#1B1710" strokeWidth={strokeWidth * 1.6} />
      <line x1="76" y1="112" x2="104" y2="112" stroke="#9E7016" strokeWidth={strokeWidth * 1.6} />
      <circle cx="53" cy="68" r="7" fill="#ECD082" />
      <circle cx="127" cy="112" r="7" fill="#1B1710" />
    </svg>
  );
}

export function CourseSpineFace({
  course,
  isDone,
}: {
  course: LessonItem;
  isDone: boolean;
}) {
  const numLabel = String(course.order).padStart(2, '0');

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between py-[8%] px-[12%] bg-gradient-to-r from-[#FAF4E3] via-[#FFFDF7] to-[#EDE0BE] border border-[#D8BE83] rounded-[4px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)] overflow-hidden select-none">
      {/* Top tiny archival emblem */}
      <div className="w-[74%] aspect-square shrink-0 rounded-[3px] border border-[#DFC993] bg-white/80 p-[6%]">
        <CourseArtworkMotif course={course} variant="spine" />
      </div>

      {/* Vertical condensed title */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center py-2 overflow-hidden">
        <span
          className="font-display font-extrabold tracking-tight text-[#1B1710] uppercase text-center leading-none truncate max-h-full"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            fontSize: 'clamp(9px, calc(var(--H, 520px) * 0.025), 14px)',
          }}
        >
          {course.title}
        </span>
      </div>

      {/* Bottom brand & boxed VHS-style module stamp */}
      <div className="w-full flex flex-col items-center gap-[4px] shrink-0">
        <span
          className="font-semibold tracking-[0.14em] text-[#8E6514] uppercase"
          style={{ fontSize: 'clamp(7px, calc(var(--H, 520px) * 0.015), 9px)' }}
        >
          DEVPATH
        </span>
        <div
          className={`w-[86%] py-[2px] border text-center font-mono font-bold tabular-nums rounded-[2px] ${
            isDone
              ? 'border-emerald-700/40 bg-emerald-50 text-emerald-800'
              : 'border-[#1B1710]/65 bg-white/85 text-[#1B1710]'
          }`}
          style={{ fontSize: 'clamp(8px, calc(var(--H, 520px) * 0.018), 11px)' }}
        >
          {isDone ? `✓${numLabel}` : `M${numLabel}`}
        </div>
      </div>

      {/* Depth shading overlay driven directly by rAF --shade */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#2C200B]"
        style={{ opacity: 'var(--shade, 0)' }}
      />
    </div>
  );
}

export function CourseCoverFace({
  course,
  isDone,
  showExploreRing = false,
}: {
  course: LessonItem;
  isDone: boolean;
  showExploreRing?: boolean;
}) {
  const numLabel = String(course.order).padStart(2, '0');

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-[7%] bg-gradient-to-br from-[#FFFDF8] via-[#FAF3DF] to-[#EFE1BC] border border-[#D4B673] rounded-[6px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_20px_40px_-18px_rgba(88,61,12,0.34)] overflow-hidden select-none text-[#1B1710]">
      {/* Subtle archival double frame */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[3.5%] border border-[#DEC78E]/75 rounded-[3px]"
      />

      {/* Top credit line */}
      <div className="relative z-10 flex items-center justify-between gap-2 pt-1 px-1">
        <span
          className="font-semibold tracking-[0.16em] text-[#8E6514] uppercase truncate"
          style={{ fontSize: 'clamp(8px, calc(var(--H, 520px) * 0.017), 10px)' }}
        >
          A DEVPATH MODULE
        </span>
        <span
          className="font-mono font-bold tabular-nums text-[#5A5140]"
          style={{ fontSize: 'clamp(8px, calc(var(--H, 520px) * 0.018), 11px)' }}
        >
          NO.{numLabel}
        </span>
      </div>

      {/* Bold display title */}
      <div className="relative z-10 px-1 pt-1">
        <h3
          className="font-display font-extrabold tracking-tight text-[#1B1710] leading-[1.08] line-clamp-2 [text-wrap:balance]"
          style={{ fontSize: 'clamp(13px, calc(var(--H, 520px) * 0.036), 21px)' }}
        >
          {course.title}
        </h3>
      </div>

      {/* Center gold-and-ink illustration */}
      <div className="relative z-10 flex-1 min-h-0 my-[5%] px-1 flex items-center justify-center">
        <div className="w-full h-full max-h-[100%] aspect-square mx-auto rounded-[4px] overflow-hidden border border-[#DEC78E] bg-white shadow-inner">
          <CourseArtworkMotif course={course} variant="cover" />
        </div>
      </div>

      {/* Bottom VHS-style badge & metadata */}
      <div className="relative z-10 flex items-center justify-between gap-2 pb-0.5 px-1">
        <div className="min-w-0 flex items-center gap-1.5 text-[#5A5140]">
          {showExploreRing && (
            <span
              aria-hidden="true"
              className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-[#B68623] bg-white/80 text-[10px] font-bold text-[#8E6514] shrink-0"
            >
              ↗
            </span>
          )}
          <span
            className="font-medium truncate"
            style={{ fontSize: 'clamp(9px, calc(var(--H, 520px) * 0.019), 11px)' }}
          >
            {course.skill} · {course.duration}
          </span>
        </div>

        <span
          className={`px-1.5 py-0.5 border rounded-[2px] font-mono font-bold uppercase tracking-wider shrink-0 inline-flex items-center gap-1 ${
            isDone
              ? 'border-emerald-700/40 bg-emerald-50 text-emerald-800'
              : 'border-[#1B1710]/70 bg-white/90 text-[#1B1710]'
          }`}
          style={{ fontSize: 'clamp(8px, calc(var(--H, 520px) * 0.017), 10px)' }}
        >
          {isDone ? (
            <>
              <CheckCircle2 className="w-2.5 h-2.5" aria-hidden="true" />
              <span>DONE</span>
            </>
          ) : (
            <span>{course.isCustom ? 'ADDED' : 'CORE'}</span>
          )}
        </span>
      </div>
    </div>
  );
}

function inferSkillFromTitle(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('typescript')) return 'TypeScript';
  if (lower.includes('react')) return 'React';
  if (lower.includes('node')) return 'Node.js';
  if (lower.includes('css') || lower.includes('tailwind')) return 'CSS';
  if (lower.includes('javascript') || lower.includes('js')) return 'JavaScript';
  if (lower.includes('sql') || lower.includes('postgres')) return 'SQL';
  if (lower.includes('python')) return 'Python';
  if (lower.includes('git')) return 'Git';
  if (lower.includes('api') || lower.includes('rest') || lower.includes('graphql')) return 'REST APIs';
  if (lower.includes('test') || lower.includes('vitest') || lower.includes('playwright')) return 'Testing';
  if (lower.includes('docker') || lower.includes('deploy')) return 'DevOps';
  return 'Full Stack';
}

export function parseImportedCoursesText(rawText: string): CourseDraft[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // 1. Try JSON array or object with courses array
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.courses)
          ? parsed.courses
          : [parsed];
      const normalized: CourseDraft[] = [];
      for (const item of list) {
        if (!item || typeof item !== 'object') continue;
        const title = String(item.title ?? item.name ?? '').trim();
        if (!title) continue;
        const skill = String(item.skill ?? item.category ?? inferSkillFromTitle(title)).trim() || 'Full Stack';
        const level = String(item.level ?? 'Intermediate').trim() || 'Intermediate';
        const duration = String(item.duration ?? '45 min').trim() || '45 min';
        const summary =
          String(item.summary ?? item.description ?? '').trim() ||
          `Hands-on guided practice module covering ${title} within your career track.`;
        const outcome =
          String(item.outcome ?? '').trim() ||
          `Applies ${skill} concepts directly to real-world project architecture.`;
        const steps = Array.isArray(item.steps) && item.steps.length > 0
          ? item.steps.map((s: unknown) => String(s).trim()).filter(Boolean)
          : [
              `Review core ${skill} fundamentals for ${title}.`,
              `Follow the guided implementation walkthrough.`,
              `Complete the practical ${skill} verification exercise.`,
            ];
        const exercise =
          String(item.exercise ?? '').trim() ||
          `Build a focused ${skill} mini-exercise applying ${title}.`;
        const videoUrl =
          typeof item.videoUrl === 'string' && item.videoUrl.trim() ? item.videoUrl.trim() : undefined;
        normalized.push({ title, skill, level, duration, summary, outcome, steps, exercise, videoUrl });
      }
      if (normalized.length > 0) return normalized;
    } catch {
      // Fall through to line-based parser
    }
  }

  // 2. Parse line-by-line (supports Pipe "|", Semicolon ";", Comma CSV, or plain Title per line)
  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  const results: CourseDraft[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();
    if (!line) continue;

    const delimiter = line.includes('|') ? '|' : line.includes(';') ? ';' : line.includes(',') ? ',' : null;
    const parts = delimiter ? line.split(delimiter).map((p) => p.trim()) : [line];

    // Skip obvious CSV header rows
    if (
      i === 0 &&
      parts.length >= 2 &&
      parts[0].toLowerCase() === 'title' &&
      parts[1].toLowerCase().includes('skill')
    ) {
      continue;
    }

    const title = parts[0];
    if (!title) continue;
    const skill = parts[1] || inferSkillFromTitle(title);
    const level = parts[2] || 'Intermediate';
    const duration = parts[3] || '45 min';
    const summary =
      parts[4] ||
      `Focused practical module on ${title}, built to pair cleanly with your developer roadmap.`;
    const outcome =
      parts[5] || `Builds applied ${skill} fluency for end-to-end project work.`;
    const exercise =
      parts[6] || `Apply ${title} in a short guided ${skill} practice exercise.`;
    const steps = [
      `Explore key ${skill} concepts in ${title}.`,
      `Walk through a structured code pattern and test edge cases.`,
      exercise,
    ];

    results.push({ title, skill, level, duration, summary, outcome, steps, exercise });
  }

  return results;
}
