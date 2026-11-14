import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileUp,
  Layers,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { LessonItem, PortalPageId } from '../data/portalData';
import { CareerMatchAnalysis, RankedCourse } from '../services/learningEngine';
import {
  CourseCoverFace,
  CourseDraft,
  CourseSpineFace,
  parseImportedCoursesText,
  SAMPLE_IMPORT_BUNDLE,
} from './CourseArchiveArt';

interface CoursesPageProps {
  courses: LessonItem[];
  careerMatch: CareerMatchAnalysis;
  rankedCourses: RankedCourse[];
  completedLessonIds: string[];
  inProgressLessonIds: string[];
  onStartLesson: (lessonId: string) => void;
  onToggleLesson: (lessonId: string) => void;
  onResetProgress: () => void;
  onCreateCourse: (draft: CourseDraft) => void;
  onImportCourses: (drafts: CourseDraft[]) => void;
  onRemoveCourse: (courseId: string) => void;
  onSelectPage: (page: PortalPageId) => void;
}

const PERSPECTIVE_PX = 1400;

function smoothStepBump(r: number): number {
  if (Math.abs(r) < 1) {
    return (r + Math.sin(Math.PI * r) / Math.PI) / 2;
  }
  return Math.sign(r) * 0.5;
}

export function CoursesPage({
  courses,
  careerMatch,
  rankedCourses,
  completedLessonIds,
  inProgressLessonIds,
  onStartLesson,
  onToggleLesson,
  onResetProgress,
  onCreateCourse,
  onImportCourses,
  onRemoveCourse,
  onSelectPage,
}: CoursesPageProps) {
  const prefersReducedMotion = useReducedMotion();

  // Search & skill/status filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'recommended' | 'in-progress' | 'completed'>('all');

  const [activeIndex, setActiveIndex] = useState(0);
  const [detailCourseId, setDetailCourseId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newSkill, setNewSkill] = useState('TypeScript');
  const [newLevel, setNewLevel] = useState('Intermediate');
  const [newDuration, setNewDuration] = useState('50 min');
  const [newSummary, setNewSummary] = useState('');
  const [newOutcome, setNewOutcome] = useState('');
  const [newStepsText, setNewStepsText] = useState('');
  const [newExercise, setNewExercise] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [createError, setCreateError] = useState('');

  // Import form state
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importStatusNote, setImportStatusNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const rankMap = useMemo(() => {
    const map = new Map<string, RankedCourse>();
    rankedCourses.forEach((entry) => map.set(entry.course.id, entry));
    return map;
  }, [rankedCourses]);

  const availableSkills = useMemo(() => {
    const unique = new Set<string>();
    courses.forEach((c) => unique.add(c.skill));
    return Array.from(unique);
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = courses.filter((course) => {
      if (skillFilter !== 'ALL' && course.skill !== skillFilter) return false;
      const isDone = completedLessonIds.includes(course.id);
      const isStarted = !isDone && inProgressLessonIds.includes(course.id);
      const rankInfo = rankMap.get(course.id);

      if (statusFilter === 'recommended' && !rankInfo?.isRecommendedForGap) return false;
      if (statusFilter === 'in-progress' && !isStarted) return false;
      if (statusFilter === 'completed' && !isDone) return false;

      if (q) {
        const haystack = `${course.title} ${course.skill} ${course.summary} ${course.exercise} ${course.level}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (statusFilter === 'recommended') {
      return [...list].sort(
        (a, b) => (rankMap.get(b.id)?.score ?? 0) - (rankMap.get(a.id)?.score ?? 0)
      );
    }
    return list;
  }, [courses, searchQuery, skillFilter, statusFilter, completedLessonIds, inProgressLessonIds, rankMap]);

  // Curved shelf geometry & spring animation state
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const captionMaskRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const posterMaskRef = useRef<HTMLDivElement | null>(null);
  const originRectRef = useRef<DOMRect | null>(null);

  const [stageSize, setStageSize] = useState({ width: 1200, height: 500 });
  const stageSizeRef = useRef(stageSize);
  stageSizeRef.current = stageSize;

  const tapeElsRef = useRef<Array<HTMLDivElement | null>>([]);
  const coverFaceElsRef = useRef<Array<HTMLDivElement | null>>([]);
  const sRef = useRef(0);
  const targetRef = useRef(0);
  const liftsRef = useRef<number[]>([]);
  const hoveredVRef = useRef<number | null>(null);
  const pointerTiltRef = useRef({ targetX: 0, targetY: 0, x: 0, y: 0 });
  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startTarget: number;
    moved: boolean;
  }>({
    active: false,
    pointerId: -1,
    startX: 0,
    startTarget: 0,
    moved: false,
  });

  const lastCommittedActiveRef = useRef(0);
  const pendingJumpCourseTitleRef = useRef<string | null>(null);
  const prevLengthRef = useRef(filteredCourses.length);

  const N = filteredCourses.length;
  const copies = useMemo(() => {
    if (N === 0) return 0;
    if (N >= 7) return 3;
    const needed = Math.ceil(18 / N);
    return needed % 2 === 1 ? Math.max(3, needed) : needed + 1;
  }, [N]);

  const virtualItems = useMemo(() => {
    if (N === 0) return [];
    const list: Array<{ v: number; courseIndex: number; course: LessonItem }> = [];
    for (let copy = 0; copy < copies; copy += 1) {
      for (let i = 0; i < N; i += 1) {
        list.push({
          v: copy * N + i,
          courseIndex: i,
          course: filteredCourses[i],
        });
      }
    }
    return list;
  }, [filteredCourses, N, copies]);

  const totalVirtual = virtualItems.length;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [N]);

  const glideToCourseIndex = useCallback(
    (targetIdx: number) => {
      if (N === 0) return;
      const safeIdx = ((targetIdx % N) + N) % N;
      const currentT = targetRef.current;
      const currentMod = ((currentT % N) + N) % N;
      let delta = safeIdx - currentMod;
      if (delta > N / 2) delta -= N;
      if (delta < -N / 2) delta += N;
      targetRef.current = Math.round(currentT + delta);
      if (prefersReducedMotion) {
        sRef.current = targetRef.current;
      }
    },
    [N, prefersReducedMotion]
  );

  // Sync shelf position when filters change or new course added
  useEffect(() => {
    if (N === 0) {
      sRef.current = 0;
      targetRef.current = 0;
      setActiveIndex(0);
      prevLengthRef.current = 0;
      return;
    }

    if (pendingJumpCourseTitleRef.current) {
      const targetTitle = pendingJumpCourseTitleRef.current;
      const foundIdx = filteredCourses.findIndex((c) => c.title === targetTitle);
      pendingJumpCourseTitleRef.current = null;
      if (foundIdx >= 0) {
        glideToCourseIndex(foundIdx);
      }
    } else if (N !== prevLengthRef.current) {
      const clampedIdx = Math.min(lastCommittedActiveRef.current, N - 1);
      sRef.current = clampedIdx;
      targetRef.current = clampedIdx;
      setActiveIndex(clampedIdx);
      lastCommittedActiveRef.current = clampedIdx;
    }
    prevLengthRef.current = N;
  }, [N, filteredCourses, glideToCourseIndex]);

  useEffect(() => {
    const el = captionMaskRef.current;
    if (!el || prefersReducedMotion) return;

    el.animate(
      [{ transform: 'translateY(108%)' }, { transform: 'translateY(0%)' }],
      {
        duration: 320,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both',
      }
    );
  }, [activeIndex, N, prefersReducedMotion]);

  useEffect(() => {
    if (totalVirtual === 0 || N === 0) return;

    liftsRef.current = new Array(totalVirtual).fill(0);
    let rafId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (prefersReducedMotion) {
        sRef.current = targetRef.current;
      } else {
        const k = 1 - Math.exp(-10.5 * dt);
        sRef.current += (targetRef.current - sRef.current) * k;
      }

      const s = sRef.current;
      const { width, height } = stageSizeRef.current;
      const H = Math.max(300, height);
      const isNarrow = width < 640;

      const ws = H * 0.165;
      const d = H * 0.50;
      const gap = H * 0.036;
      const U = isNarrow ? H * 0.92 : H * 1.28;

      const du = 2;
      const maxU = U * 3.2;
      const steps = Math.ceil(maxU / du) + 2;
      const XS = new Float64Array(steps);
      const scl = (uVal: number) => 1 / (1 + Math.pow(Math.abs(uVal) / U, 1.6));
      for (let idx = 1; idx < steps; idx += 1) {
        const uMid = (idx - 0.5) * du;
        XS[idx] = XS[idx - 1] + scl(uMid) * du;
      }

      const xsc = (uVal: number) => {
        const absU = Math.abs(uVal);
        const fIdx = Math.min(steps - 1.001, absU / du);
        const i0 = Math.floor(fIdx);
        const frac = fIdx - i0;
        const val = XS[i0] + (XS[i0 + 1] - XS[i0]) * frac;
        return Math.sign(uVal) * val;
      };

      const tilt = pointerTiltRef.current;
      if (prefersReducedMotion) {
        tilt.x = 0;
        tilt.y = 0;
      } else {
        const tk = 1 - Math.exp(-12 * dt);
        tilt.x += (tilt.targetX - tilt.x) * tk;
        tilt.y += (tilt.targetY - tilt.y) * tk;
      }

      const half = totalVirtual / 2;

      for (let v = 0; v < totalVirtual; v += 1) {
        const el = tapeElsRef.current[v];
        if (!el) continue;

        let r = ((v - s) % totalVirtual + totalVirtual) % totalVirtual;
        if (r > half) r -= totalVirtual;

        const u = r * (ws + gap) + (d - ws + 1.4 * gap) * smoothStepBump(r);
        const sc = scl(u);
        const o = Math.max(0, 1 - Math.abs(r));

        const targetLift = hoveredVRef.current === v && o < 0.45 ? 1 : 0;
        if (prefersReducedMotion) {
          liftsRef.current[v] = targetLift;
        } else {
          liftsRef.current[v] += (targetLift - liftsRef.current[v]) * (1 - Math.exp(-14 * dt));
        }
        const lift = liftsRef.current[v];

        const zDepth = PERSPECTIVE_PX * (1 / sc - 1) - o * H * 0.11;
        const screenScale = PERSPECTIVE_PX / (PERSPECTIVE_PX + zDepth);

        const screenX = xsc(u);
        const screenY = H * 0.5 * (1 - sc) * 0.42 + o * H * 0.01 - lift * H * 0.055;

        const x3d = screenX / screenScale;
        const y3d = screenY / screenScale;

        const sideTurn = -Math.sign(u) * Math.min(1, Math.abs(u) / U) * 26 * (1 - o);
        const rotY = sideTurn - 90 * o + tilt.y * o;
        const rotX = tilt.x * o;

        const shade = Math.min(0.42, (1 - sc) * 0.65);

        el.style.transform = `translate3d(${x3d.toFixed(2)}px, ${y3d.toFixed(2)}px, ${(-zDepth).toFixed(2)}px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
        el.style.zIndex = String(Math.round(1000 - Math.abs(u) + o * 500));
        el.style.setProperty('--shade', shade.toFixed(3));
        el.style.pointerEvents = Math.abs(u) > U * 2.4 ? 'none' : 'auto';
      }

      if (dotRef.current) {
        const modPos = ((s % N) + N) % N;
        const pct = N <= 1 ? 50 : (modPos / (N - 1)) * 100;
        dotRef.current.style.left = `${pct.toFixed(3)}%`;
      }

      const roundedIdx = ((Math.round(s) % N) + N) % N;
      if (roundedIdx !== lastCommittedActiveRef.current) {
        lastCommittedActiveRef.current = roundedIdx;
        setActiveIndex(roundedIdx);
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(rafId);
  }, [totalVirtual, N, prefersReducedMotion]);

  const openCourseSheet = useCallback(
    (courseId: string, sourceEl?: HTMLElement | null) => {
      if (sourceEl) {
        originRectRef.current = sourceEl.getBoundingClientRect();
      } else {
        const centeredV = virtualItems.findIndex((item) => {
          const total = totalVirtual || 1;
          let r = ((item.v - sRef.current) % total + total) % total;
          if (r > total / 2) r -= total;
          return Math.abs(r) < 0.45 && item.course.id === courseId;
        });
        const coverEl = centeredV >= 0 ? coverFaceElsRef.current[centeredV] : null;
        originRectRef.current = coverEl ? coverEl.getBoundingClientRect() : null;
      }
      setDetailCourseId(courseId);
    },
    [totalVirtual, virtualItems]
  );

  useEffect(() => {
    if (!detailCourseId || !sheetRef.current) return;
    const sheetEl = sheetRef.current;
    const rect = originRectRef.current;

    if (!prefersReducedMotion && rect && rect.width > 0 && rect.height > 0) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const top = Math.max(0, rect.top);
      const right = Math.max(0, vw - rect.right);
      const bottom = Math.max(0, vh - rect.bottom);
      const left = Math.max(0, rect.left);

      sheetEl.animate(
        [
          { clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round 12px)` },
          { clipPath: 'inset(0px 0px 0px 0px round 0px)' },
        ],
        {
          duration: 420,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'both',
        }
      );
    }

    if (!prefersReducedMotion && posterMaskRef.current) {
      posterMaskRef.current.animate(
        [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }],
        {
          duration: 520,
          delay: 90,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'both',
        }
      );
    }
  }, [detailCourseId, prefersReducedMotion]);

  const closeCourseSheet = useCallback(() => {
    const sheetEl = sheetRef.current;
    const rect = originRectRef.current;

    if (!prefersReducedMotion && sheetEl && rect && rect.width > 0 && rect.height > 0) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const top = Math.max(0, rect.top);
      const right = Math.max(0, vw - rect.right);
      const bottom = Math.max(0, vh - rect.bottom);
      const left = Math.max(0, rect.left);

      const anim = sheetEl.animate(
        [
          { clipPath: 'inset(0px 0px 0px 0px round 0px)' },
          { clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round 12px)` },
        ],
        {
          duration: 280,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards',
        }
      );
      anim.onfinish = () => setDetailCourseId(null);
      return;
    }

    setDetailCourseId(null);
  }, [prefersReducedMotion]);

  const stepShelf = useCallback(
    (dir: number) => {
      if (N === 0) return;
      targetRef.current = Math.round(targetRef.current) + dir;
      if (prefersReducedMotion) {
        sRef.current = targetRef.current;
      }
    },
    [N, prefersReducedMotion]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isCreateOpen) {
        if (e.key === 'Escape') setIsCreateOpen(false);
        return;
      }
      if (isImportOpen) {
        if (e.key === 'Escape') setIsImportOpen(false);
        return;
      }
      if (detailCourseId) {
        if (e.key === 'Escape') closeCourseSheet();
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepShelf(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepShelf(1);
      } else if (e.key === 'Enter' && filteredCourses[activeIndex]) {
        e.preventDefault();
        openCourseSheet(filteredCourses[activeIndex].id);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isCreateOpen,
    isImportOpen,
    detailCourseId,
    closeCourseSheet,
    stepShelf,
    filteredCourses,
    activeIndex,
    openCourseSheet,
  ]);

  const handleStageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (N === 0 || detailCourseId || isCreateOpen || isImportOpen) return;
    const dominantDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(dominantDelta) < 2) return;
    targetRef.current += dominantDelta * 0.0055;
    if (prefersReducedMotion) {
      sRef.current = targetRef.current;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || N === 0) return;
    dragStateRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startTarget: targetRef.current,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current.active) {
      const dx = e.clientX - dragStateRef.current.startX;
      if (Math.abs(dx) > 6) {
        dragStateRef.current.moved = true;
      }
      const stepPx = Math.max(95, stageSize.height * 0.24);
      targetRef.current = dragStateRef.current.startTarget - dx / stepPx;
      if (prefersReducedMotion) {
        sRef.current = targetRef.current;
      }
      return;
    }

    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || prefersReducedMotion) return;
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    pointerTiltRef.current.targetY = Math.max(-6, Math.min(6, nx * 6));
    pointerTiltRef.current.targetX = Math.max(-5, Math.min(5, -ny * 5));
  };

  const handlePointerUpOrCancel = () => {
    if (dragStateRef.current.active) {
      dragStateRef.current.active = false;
      targetRef.current = Math.round(targetRef.current);
      if (prefersReducedMotion) {
        sRef.current = targetRef.current;
      }
      window.setTimeout(() => {
        dragStateRef.current.moved = false;
      }, 40);
    }
    pointerTiltRef.current.targetX = 0;
    pointerTiltRef.current.targetY = 0;
  };

  const handleTapeClick = (v: number, course: LessonItem, coverEl: HTMLDivElement | null) => {
    if (dragStateRef.current.moved) return;

    const total = totalVirtual || 1;
    let r = ((v - sRef.current) % total + total) % total;
    if (r > total / 2) r -= total;

    if (Math.abs(r) < 0.35) {
      openCourseSheet(course.id, coverEl);
    } else {
      targetRef.current = Math.round(sRef.current + r);
      if (prefersReducedMotion) {
        sRef.current = targetRef.current;
      }
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      setCreateError('Please enter a course title.');
      return;
    }

    const trimmedSkill = newSkill.trim() || 'Full Stack';
    const trimmedDuration = newDuration.trim() || '45 min';
    const trimmedSummary =
      newSummary.trim() ||
      `Hands-on practice module covering ${trimmedTitle} for your ${careerMatch.goal} path.`;
    const trimmedOutcome =
      newOutcome.trim() ||
      `Builds practical ${trimmedSkill} fluency for real-world ${careerMatch.goal} projects.`;
    const parsedSteps = newStepsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const steps =
      parsedSteps.length > 0
        ? parsedSteps
        : [
            `Review core ${trimmedSkill} concepts in ${trimmedTitle}.`,
            `Work through the guided example and verify edge cases.`,
            `Complete the hands-on ${trimmedSkill} exercise.`,
          ];
    const exercise =
      newExercise.trim() ||
      `Build a practical ${trimmedSkill} exercise applying ${trimmedTitle}.`;

    setSearchQuery('');
    setSkillFilter('ALL');
    setStatusFilter('all');
    pendingJumpCourseTitleRef.current = trimmedTitle;

    onCreateCourse({
      title: trimmedTitle,
      skill: trimmedSkill,
      level: newLevel,
      duration: trimmedDuration,
      summary: trimmedSummary,
      outcome: trimmedOutcome,
      steps,
      exercise,
      videoUrl: newVideoUrl.trim() || undefined,
    });

    setNewTitle('');
    setNewSummary('');
    setNewOutcome('');
    setNewStepsText('');
    setNewExercise('');
    setNewVideoUrl('');
    setCreateError('');
    setIsCreateOpen(false);
  };

  const parsedImportPreview = useMemo(() => parseImportedCoursesText(importText), [importText]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setImportText(text);
      setImportError('');
      setImportStatusNote(`Loaded "${file.name}"`);
    } catch {
      setImportError('Unable to read that file. Please paste JSON, CSV, or line-separated titles.');
    } finally {
      e.target.value = '';
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedImportPreview.length === 0) {
      setImportError('Enter at least one valid course line or JSON item before importing.');
      return;
    }

    setSearchQuery('');
    setSkillFilter('ALL');
    setStatusFilter('all');
    pendingJumpCourseTitleRef.current = parsedImportPreview[0].title;
    onImportCourses(parsedImportPreview);
    setImportText('');
    setImportError('');
    setImportStatusNote('');
    setIsImportOpen(false);
  };

  const activeCourse = filteredCourses[activeIndex] ?? filteredCourses[0] ?? null;
  const activeRankInfo = activeCourse ? rankMap.get(activeCourse.id) : undefined;
  const detailCourse = courses.find((c) => c.id === detailCourseId) ?? null;
  const detailRankInfo = detailCourse ? rankMap.get(detailCourse.id) : undefined;

  const stageH = Math.max(300, stageSize.height);
  const tapeHeight = stageH * 0.77;
  const spineWidth = stageH * 0.165;
  const coverWidth = stageH * 0.50;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#FCFBF8] text-[#1B1710] flex flex-col">
      {/* Subtle porcelain & halftone background architecture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 78% 64% at 50% 48%, rgba(255,252,243,0.95) 0%, rgba(250,244,227,0.55) 60%, rgba(244,234,209,0.45) 100%)',
          }}
        />
        <div
          className="hidden sm:flex absolute left-[3vw] top-1/2 -translate-y-1/2 flex-col items-center leading-[0.95] font-display font-extrabold text-[clamp(4.5rem,11vw,9.5rem)] tracking-tighter text-transparent bg-clip-text opacity-45"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(168,122,30,0.28) 1.3px, transparent 1.7px)',
            backgroundSize: '6px 6px',
          }}
        >
          <span>技</span>
          <span>術</span>
        </div>
        <div
          className="hidden sm:flex absolute right-[3vw] top-1/2 -translate-y-1/2 flex-col items-center leading-[0.95] font-display font-extrabold text-[clamp(4.5rem,11vw,9.5rem)] tracking-tighter text-transparent bg-clip-text opacity-45"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(168,122,30,0.28) 1.3px, transparent 1.7px)',
            backgroundSize: '6px 6px',
          }}
        >
          <span>学</span>
          <span>道</span>
        </div>
      </div>

      {/* Top Action, Search & Filter Bar cleanly positioned below fixed PortalNav */}
      <header className="relative z-20 max-w-[1320px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-[72px] sm:pt-[84px] pb-2 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#9E7016]">
            <Layers className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Curved Course Archive · {careerMatch.goal}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums text-[#5A5140]">
              {filteredCourses.length}/{courses.length} modules
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums text-[#5A5140]">
              {completedLessonIds.length} completed · {inProgressLessonIds.length} started
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(completedLessonIds.length > 0 || inProgressLessonIds.length > 0) && (
              <button
                type="button"
                onClick={onResetProgress}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-white/95 hover:bg-[#FAF5E8] text-xs font-semibold text-[#4C4332] shadow-xs whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#9E7016]" aria-hidden="true" />
                <span>Reset progress</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setImportError('');
                setIsImportOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-white/95 hover:bg-[#FAF5E8] text-xs sm:text-sm font-semibold text-[#1B1710] shadow-xs whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
            >
              <Upload className="w-4 h-4 text-[#9E7016]" aria-hidden="true" />
              <span>Import courses</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCreateError('');
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 py-2 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] text-[#1A150B] text-xs sm:text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_22px_rgba(166,120,30,0.22)] whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Create course</span>
            </button>
          </div>
        </div>

        {/* Search + Skill Filter + Status/Recommendation Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search
              className="w-4 h-4 text-[#8E6514] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses, skills, or exercises..."
              aria-label="Search courses"
              className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-full border border-[#DEC99A] bg-white/95 text-xs sm:text-sm text-[#1B1710] placeholder:text-[#8E8168] focus:outline-none focus:ring-2 focus:ring-[#B68623]"
            />
          </div>

          <select
            aria-label="Filter courses by skill"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-white/95 text-xs font-semibold text-[#1B1710] focus:outline-none focus:ring-2 focus:ring-[#B68623]"
          >
            <option value="ALL">All Skills</option>
            {availableSkills.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center gap-1 p-1 rounded-full border border-[#E6D7B3] bg-white/90">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'recommended', label: 'Recommended' },
                { id: 'in-progress', label: 'In Progress' },
                { id: 'completed', label: 'Completed' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-gradient-to-b from-[#ECD082] to-[#C89B3C] text-[#1A150B]'
                    : 'text-[#5A5140] hover:text-[#1B1710]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Curved 3D Shelf Stage */}
      {N === 0 ? (
        <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-20">
          <div className="max-w-md w-full rounded-[24px] border border-[#E6D7B3] bg-white p-8 text-center space-y-4 shadow-[0_18px_48px_-22px_rgba(120,86,18,0.18)]">
            <h1 className="font-display text-xl font-bold text-[#1B1710]">
              {courses.length === 0 ? 'Your course shelf is empty' : 'No matching courses found'}
            </h1>
            <p className="text-sm text-[#5A5140]">
              {courses.length === 0
                ? 'Create a new module or import a course list to populate the 3D curved archive shelf.'
                : 'Clear your active search or skill filter to view all modules on the curved shelf.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {courses.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSkillFilter('ALL');
                    setStatusFilter('all');
                  }}
                  className="min-h-[46px] px-5 py-2.5 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] text-[#1A150B] text-sm font-semibold cursor-pointer"
                >
                  Clear filters
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="min-h-[46px] px-5 py-2.5 rounded-full border border-[#DEC99A] bg-white text-[#1B1710] text-sm font-semibold cursor-pointer"
              >
                Create course
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="relative z-10 flex-1 min-h-0 flex flex-col justify-between pb-[76px] md:pb-6">
          {/* 3D Curved Shelf */}
          <div
            ref={stageRef}
            onWheel={handleStageWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUpOrCancel}
            onPointerCancel={handlePointerUpOrCancel}
            onPointerLeave={handlePointerUpOrCancel}
            style={
              {
                '--H': `${stageH}px`,
                perspective: `${PERSPECTIVE_PX}px`,
                perspectiveOrigin: '50% 48%',
              } as React.CSSProperties
            }
            className="relative flex-1 min-h-[240px] w-full overflow-hidden touch-pan-y cursor-grab active:cursor-grabbing select-none"
            aria-label="3D curved course shelf"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 bottom-[8%] -translate-x-1/2 rounded-full"
              style={{
                width: `${coverWidth * 1.45}px`,
                height: `${Math.max(26, stageH * 0.09)}px`,
                background:
                  'radial-gradient(ellipse at center, rgba(112,82,22,0.28) 0%, rgba(112,82,22,0.10) 48%, transparent 74%)',
              }}
            />

            {virtualItems.map(({ v, course }) => {
              const isDone = completedLessonIds.includes(course.id);
              const isCenteredCourse = activeCourse?.id === course.id;

              return (
                <div
                  key={`${v}-${course.id}`}
                  ref={(el) => {
                    tapeElsRef.current[v] = el;
                  }}
                  role="button"
                  tabIndex={isCenteredCourse && v === Math.floor(copies / 2) * N + activeIndex ? 0 : -1}
                  aria-label={`${course.title} (${course.skill}, ${course.duration}). ${
                    isCenteredCourse ? 'Press Enter to inspect course details.' : 'Select to center.'
                  }`}
                  onMouseEnter={() => {
                    hoveredVRef.current = v;
                  }}
                  onMouseLeave={() => {
                    if (hoveredVRef.current === v) hoveredVRef.current = null;
                  }}
                  onClick={() => handleTapeClick(v, course, coverFaceElsRef.current[v])}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleTapeClick(v, course, coverFaceElsRef.current[v]);
                    }
                  }}
                  className="absolute left-1/2 top-[48%] cursor-pointer focus-visible:outline-none"
                  style={{
                    width: `${spineWidth}px`,
                    height: `${tapeHeight}px`,
                    marginLeft: `${-spineWidth / 2}px`,
                    marginTop: `${-tapeHeight / 2}px`,
                    transformStyle: 'preserve-3d',
                    willChange: 'transform',
                  }}
                >
                  <div
                    className="absolute inset-0 backface-hidden"
                    style={{
                      transform: `translateZ(${(coverWidth / 2).toFixed(2)}px)`,
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    <CourseSpineFace course={course} isDone={isDone} />
                  </div>

                  <div
                    ref={(el) => {
                      coverFaceElsRef.current[v] = el;
                    }}
                    className="absolute top-0 backface-hidden"
                    style={{
                      width: `${coverWidth}px`,
                      height: `${tapeHeight}px`,
                      left: `${((spineWidth - coverWidth) / 2).toFixed(2)}px`,
                      transform: `rotateY(90deg) translateZ(${(spineWidth / 2).toFixed(2)}px)`,
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    <CourseCoverFace course={course} isDone={isDone} showExploreRing />
                  </div>

                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-[#EFE3C2] border border-[#D4B673] rounded-[4px]"
                    style={{
                      transform: `rotateY(180deg) translateZ(${(coverWidth / 2).toFixed(2)}px)`,
                      backfaceVisibility: 'hidden',
                    }}
                  />

                  <div
                    aria-hidden="true"
                    className="absolute top-0 bg-gradient-to-b from-[#F5EBD0] to-[#E6D4A7] border border-[#D4B673] rounded-[4px]"
                    style={{
                      width: `${coverWidth}px`,
                      height: `${tapeHeight}px`,
                      left: `${((spineWidth - coverWidth) / 2).toFixed(2)}px`,
                      transform: `rotateY(-90deg) translateZ(${(spineWidth / 2).toFixed(2)}px)`,
                      backfaceVisibility: 'hidden',
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Mask-Slide Caption & Recommendation Reason */}
          {activeCourse && (
            <section
              aria-live="polite"
              className="relative z-20 max-w-[860px] w-full mx-auto px-4 pt-1 pb-2 flex items-center justify-between gap-3 sm:gap-6"
            >
              <button
                type="button"
                onClick={() => stepShelf(-1)}
                aria-label="Previous course"
                className="inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-[#1B1710] shadow-xs shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              </button>

              <div className="min-w-0 flex-1 text-center overflow-hidden">
                <div ref={captionMaskRef} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => openCourseSheet(activeCourse.id)}
                    className="group inline-flex flex-col items-center max-w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] rounded-lg px-2"
                  >
                    <h1 className="font-display text-lg sm:text-2xl font-extrabold tracking-tight text-[#8E6514] group-hover:text-[#1B1710] transition-colors truncate max-w-full">
                      {activeCourse.title}
                    </h1>
                  </button>

                  <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-xs text-[#5A5140]">
                    <span className="font-semibold text-[#1B1710]">{activeCourse.skill}</span>
                    <span aria-hidden="true" className="text-[#C89B3C]">—</span>
                    <span className="tabular-nums">
                      Module {String(activeCourse.order).padStart(2, '0')} · {activeCourse.level} ·{' '}
                      {activeCourse.duration}
                    </span>
                    {activeRankInfo?.isRecommendedForGap && (
                      <span className="font-semibold text-[#9E7016] inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3" aria-hidden="true" />
                        <span>{activeRankInfo.reason}</span>
                      </span>
                    )}
                    {!completedLessonIds.includes(activeCourse.id) &&
                      inProgressLessonIds.includes(activeCourse.id) && (
                        <span className="font-semibold text-[#9E7016]">· In Progress</span>
                      )}
                    {completedLessonIds.includes(activeCourse.id) && (
                      <span className="font-semibold text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Completed</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => stepShelf(1)}
                aria-label="Next course"
                className="inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-[#1B1710] shadow-xs shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
              >
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </section>
          )}

          {/* Bottom Timeline Ruler with Gliding Gold Dot */}
          <nav
            aria-label="Course sequence timeline"
            className="relative z-20 max-w-[920px] w-full mx-auto px-6 sm:px-10 pt-2 pb-1"
          >
            <div className="relative h-10 flex items-end">
              <div aria-hidden="true" className="absolute left-0 right-0 bottom-4 h-px bg-[#DEC99A]" />
              <div
                ref={dotRef}
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[11px] -translate-x-1/2 w-3 h-3 rounded-full bg-[#B68623] ring-4 ring-[#ECD082]/45 shadow-sm"
                style={{ left: '0%' }}
              />

              <div className="relative w-full flex items-end justify-between">
                {filteredCourses.map((course, idx) => {
                  const isActive = idx === activeIndex;
                  const isDone = completedLessonIds.includes(course.id);
                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => glideToCourseIndex(idx)}
                      aria-label={`Jump to Module ${course.order}: ${course.title}`}
                      aria-current={isActive ? 'true' : undefined}
                      className="group relative flex flex-col items-center justify-end min-w-[28px] min-h-[44px] pb-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] rounded-md"
                    >
                      <span
                        aria-hidden="true"
                        className={`block w-px transition-all mb-1.5 ${
                          isActive
                            ? 'h-4 bg-[#8E6514]'
                            : isDone
                            ? 'h-3 bg-emerald-600'
                            : 'h-2.5 bg-[#CBB47E] group-hover:h-3.5 group-hover:bg-[#8E6514]'
                        }`}
                      />
                      <span
                        className={`font-mono text-[10px] sm:text-[11px] tabular-nums leading-none ${
                          isActive
                            ? 'font-bold text-[#8E6514]'
                            : 'font-medium text-[#6A5F4B] group-hover:text-[#1B1710]'
                        }`}
                      >
                        {String(course.order).padStart(2, '0')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        </main>
      )}

      {/* Full-Screen Clip-Path Expanding Course Detail Sheet */}
      {detailCourse && (
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-sheet-title"
          className="fixed inset-0 z-50 bg-[#FCFBF8] text-[#1B1710] overflow-y-auto"
        >
          <div className="max-w-[1160px] mx-auto px-4 sm:px-8 py-6 sm:py-10 min-h-full flex flex-col justify-between gap-8">
            <div className="flex items-center justify-between gap-4 border-b border-[#E6D7B3] pb-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#9E7016]">
                <span>Module {String(detailCourse.order).padStart(2, '0')}</span>
                <span aria-hidden="true">·</span>
                <span>{detailCourse.skill}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#5A5140] tabular-nums">
                  {detailCourse.level} · {detailCourse.duration}
                </span>
                {detailRankInfo?.isRecommendedForGap && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#9E7016]">{detailRankInfo.reason}</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={closeCourseSheet}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 py-2 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-xs font-semibold text-[#1B1710] shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
                <span>Close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start my-auto">
              <div className="lg:col-span-5 flex justify-center">
                <div
                  ref={posterMaskRef}
                  className="w-full max-w-[330px] aspect-[5/7] shadow-[0_28px_60px_-20px_rgba(95,67,14,0.34)] rounded-[8px]"
                  style={{ '--H': '540px' } as React.CSSProperties}
                >
                  <CourseCoverFace
                    course={detailCourse}
                    isDone={completedLessonIds.includes(detailCourse.id)}
                  />
                </div>
              </div>

              <div className="lg:col-span-7 space-y-5">
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9E7016]">
                    {detailCourse.isCustom ? 'Added to Course Archive' : `${careerMatch.goal} Module`}
                  </p>
                  <h2
                    id="detail-sheet-title"
                    className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#1B1710] leading-[1.12] [text-wrap:balance]"
                  >
                    {detailCourse.title}
                  </h2>
                </div>

                <p className="text-sm sm:text-base text-[#4A4132] leading-relaxed max-w-[60ch]">
                  {detailCourse.summary}
                </p>

                <div className="rounded-2xl border border-[#E6D7B3] bg-[#FAF6EC] p-4 sm:p-5 space-y-2">
                  <div className="text-xs font-semibold text-[#9E7016]">Lesson Steps</div>
                  <ol className="space-y-1.5 text-xs sm:text-sm text-[#1B1710]">
                    {detailCourse.steps.map((stepText, idx) => (
                      <li key={stepText} className="flex gap-2">
                        <span className="font-mono font-bold text-[#9E7016]">0{idx + 1}.</span>
                        <span>{stepText}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-2xl border border-[#E2CFA3] bg-white p-4 sm:p-5 space-y-1.5">
                  <div className="text-xs font-semibold text-[#9E7016]">Practical Exercise</div>
                  <p className="text-xs sm:text-sm text-[#1B1710] leading-relaxed">
                    {detailCourse.exercise}
                  </p>
                  <div className="pt-1 text-xs text-[#6A5F4B]">Outcome: {detailCourse.outcome}</div>
                </div>

                {detailCourse.videoUrl && (
                  <div className="rounded-2xl overflow-hidden border border-[#E6D7B3] bg-[#1B1710]">
                    <video
                      src={detailCourse.videoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full max-h-[280px] object-cover"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {!completedLessonIds.includes(detailCourse.id) && (
                    <button
                      type="button"
                      onClick={() => onStartLesson(detailCourse.id)}
                      className={`min-h-[48px] px-5 py-3 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                        inProgressLessonIds.includes(detailCourse.id)
                          ? 'border border-[#C89B3C] bg-[#FAF3DE] text-[#8E6514]'
                          : 'border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-[#1B1710]'
                      }`}
                    >
                      <Play className="w-4 h-4 text-[#9E7016]" aria-hidden="true" />
                      <span>
                        {inProgressLessonIds.includes(detailCourse.id)
                          ? 'In Progress'
                          : 'Start lesson'}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onToggleLesson(detailCourse.id)}
                    className={`min-h-[48px] px-6 py-3 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] ${
                      completedLessonIds.includes(detailCourse.id)
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        : 'border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] text-[#1A150B] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_24px_rgba(166,120,30,0.22)]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {completedLessonIds.includes(detailCourse.id)
                        ? 'Completed lesson'
                        : 'Complete lesson'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDetailCourseId(null);
                      onSelectPage('learning-path');
                    }}
                    className="min-h-[48px] px-5 py-3 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-sm font-semibold text-[#1B1710] inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>Open Learning Path</span>
                    <ArrowRight className="w-4 h-4 text-[#9E7016]" aria-hidden="true" />
                  </button>

                  {detailCourse.isCustom && (
                    <button
                      type="button"
                      onClick={() => {
                        const idToRemove = detailCourse.id;
                        setDetailCourseId(null);
                        onRemoveCourse(idToRemove);
                      }}
                      className="min-h-[48px] px-4 py-3 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-800 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Remove course</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-[#EFE4CA] pt-4 flex items-center justify-between text-xs text-[#6A5F4B]">
              <span>DevPath Studio · Local Course Archive</span>
              <span className="tabular-nums">
                {completedLessonIds.length} / {courses.length} modules completed
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#1B1710]/35 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-course-heading"
            className="w-full max-w-lg rounded-[26px] border border-[#E6D4AA] bg-white p-6 sm:p-7 shadow-[0_28px_64px_-18px_rgba(88,61,12,0.35)] space-y-4 my-auto"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#EFE4CA] pb-4">
              <div>
                <p className="text-xs font-semibold text-[#9E7016]">Add to Curved Shelf</p>
                <h2 id="create-course-heading" className="font-display text-xl font-extrabold text-[#1B1710] mt-0.5">
                  Create New Course
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                aria-label="Close create course modal"
                className="w-11 h-11 rounded-full border border-[#DEC99A] bg-[#FCFBF8] hover:bg-[#FAF5E8] flex items-center justify-center text-[#1B1710] cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label htmlFor="course-title-input" className="block text-xs font-semibold text-[#4C4332]">
                  Course Title
                </label>
                <input
                  id="course-title-input"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    setCreateError('');
                  }}
                  placeholder="e.g. TypeScript Strict Patterns & API Contracts"
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-[#DEC99A] bg-[#FCFBF8] text-sm text-[#1B1710]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="course-skill-input" className="block text-xs font-semibold text-[#4C4332]">
                    Skill
                  </label>
                  <input
                    id="course-skill-input"
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#DEC99A] bg-[#FCFBF8] text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="course-level-select" className="block text-xs font-semibold text-[#4C4332]">
                    Level
                  </label>
                  <select
                    id="course-level-select"
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#DEC99A] bg-[#FCFBF8] text-sm"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="course-duration-input" className="block text-xs font-semibold text-[#4C4332]">
                    Duration
                  </label>
                  <input
                    id="course-duration-input"
                    type="text"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#DEC99A] bg-[#FCFBF8] text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="course-summary-input" className="block text-xs font-semibold text-[#4C4332]">
                  Summary
                </label>
                <textarea
                  id="course-summary-input"
                  rows={2}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Brief overview of what this module teaches..."
                  className="w-full px-4 py-2 rounded-xl border border-[#DEC99A] bg-[#FCFBF8] text-sm"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="course-steps-input" className="block text-xs font-semibold text-[#4C4332]">
                  Lesson Steps (one step per line)
                </label>
                <textarea
                  id="course-steps-input"
                  rows={2}
                  value={newStepsText}
                  onChange={(e) => setNewStepsText(e.target.value)}
                  placeholder={`Define core interfaces\nWire typed request handlers`}
                  className="w-full px-4 py-2 rounded-xl border border-[#DEC99A] bg-[#FCFBF8] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="course-exercise-input" className="block text-xs font-semibold text-[#4C4332]">
                    Practical Exercise
                  </label>
                  <input
                    id="course-exercise-input"
                    type="text"
                    value={newExercise}
                    onChange={(e) => setNewExercise(e.target.value)}
                    placeholder="Hands-on exercise description"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DEC99A] bg-[#FCFBF8] text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="course-video-input" className="block text-xs font-semibold text-[#4C4332]">
                    Optional Local Video URL
                  </label>
                  <input
                    id="course-video-input"
                    type="text"
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    placeholder="Optional (e.g. /assets/campus-walkthrough.mp4)"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DEC99A] bg-[#FCFBF8] text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="course-outcome-input" className="block text-xs font-semibold text-[#4C4332]">
                  Learning Outcome
                </label>
                <input
                  id="course-outcome-input"
                  type="text"
                  value={newOutcome}
                  onChange={(e) => setNewOutcome(e.target.value)}
                  placeholder="Optional milestone unlocked after completion"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#DEC99A] bg-[#FCFBF8] text-sm"
                />
              </div>

              {createError && (
                <p role="alert" className="text-xs font-semibold text-rose-700">
                  {createError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="min-h-[46px] px-5 py-2.5 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-sm font-semibold text-[#1B1710] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[46px] px-6 py-2.5 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] text-[#1A150B] text-sm font-semibold cursor-pointer"
                >
                  Add to shelf
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Courses Modal */}
      {isImportOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#1B1710]/35 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsImportOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-courses-heading"
            className="w-full max-w-2xl rounded-[26px] border border-[#E6D4AA] bg-white p-6 sm:p-7 shadow-[0_28px_64px_-18px_rgba(88,61,12,0.35)] space-y-5 my-auto"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#EFE4CA] pb-4">
              <div>
                <p className="text-xs font-semibold text-[#9E7016]">Batch Archive Import</p>
                <h2 id="import-courses-heading" className="font-display text-xl font-extrabold text-[#1B1710] mt-0.5">
                  Import Courses to Curved Shelf
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                aria-label="Close import courses modal"
                className="w-11 h-11 rounded-full border border-[#DEC99A] bg-[#FCFBF8] hover:bg-[#FAF5E8] flex items-center justify-center text-[#1B1710] cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[#5A5140]">
                  Paste JSON array, pipe/CSV rows (<span className="font-mono">Title | Skill | Level | Duration</span>), or plain titles one per line.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv,.txt"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-[#FCFBF8] hover:bg-[#FAF5E8] text-xs font-semibold text-[#1B1710] cursor-pointer"
                  >
                    <FileUp className="w-3.5 h-3.5 text-[#9E7016]" aria-hidden="true" />
                    <span>Upload file</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportText(SAMPLE_IMPORT_BUNDLE);
                      setImportError('');
                      setImportStatusNote('Loaded 3 sample Full Stack modules');
                    }}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-xs font-semibold text-[#8E6514] cursor-pointer"
                  >
                    <span>Load sample bundle</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="import-courses-textarea" className="sr-only">
                  Courses to import
                </label>
                <textarea
                  id="import-courses-textarea"
                  rows={5}
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    setImportError('');
                  }}
                  placeholder={`TypeScript Generics | TypeScript | Intermediate | 55 min\nDocker Containers | DevOps | Intermediate | 50 min`}
                  className="w-full px-4 py-3 rounded-xl border border-[#DEC99A] bg-[#FCFBF8] font-mono text-xs text-[#1B1710] placeholder:text-[#8E8168]"
                />
              </div>

              {importStatusNote && (
                <p className="text-xs font-medium text-[#8E6514]">{importStatusNote}</p>
              )}

              {parsedImportPreview.length > 0 && (
                <div className="rounded-2xl border border-[#E6D7B3] bg-[#FAF6EC] p-4 space-y-2.5 max-h-44 overflow-y-auto">
                  <div className="text-xs font-semibold text-[#9E7016] tabular-nums">
                    Ready to list on curved shelf: {parsedImportPreview.length}{' '}
                    {parsedImportPreview.length === 1 ? 'course' : 'courses'}
                  </div>
                  <div className="divide-y divide-[#E6D7B3]">
                    {parsedImportPreview.map((item, idx) => (
                      <div key={`${item.title}-${idx}`} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#1B1710] truncate">{item.title}</div>
                          <div className="text-[11px] text-[#5A5140] truncate">{item.summary}</div>
                        </div>
                        <div className="text-[11px] font-medium text-[#8E6514] whitespace-nowrap shrink-0 tabular-nums">
                          {item.skill} · {item.level} · {item.duration}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importError && (
                <p role="alert" className="text-xs font-semibold text-rose-700">
                  {importError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="min-h-[46px] px-5 py-2.5 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-sm font-semibold text-[#1B1710] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[46px] px-6 py-2.5 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] text-[#1A150B] text-sm font-semibold cursor-pointer tabular-nums"
                >
                  {parsedImportPreview.length > 0
                    ? `Import ${parsedImportPreview.length} ${parsedImportPreview.length === 1 ? 'course' : 'courses'}`
                    : 'Import courses'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
