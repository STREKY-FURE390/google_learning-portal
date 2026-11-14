import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  Mail,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  CAREER_GOALS,
  CareerGoalId,
  LOGIN_FALLBACK_VIDEO_SRC,
  LOGIN_POSTER_SRC,
  LOGIN_VIDEO_SRC,
  LearnerCertification,
  LearnerProfile,
  LearnerProject,
  LearnerSkill,
} from '../data/portalData';
import {
  AuthFlowMode,
  createLearnerProfileAccount,
  fetchLearnerProfileAccount,
  isAuthApiConfigured,
  sendVerificationCode,
  verifyEmailCode,
} from '../services/authApi';

type LoginStep = 'email-mode' | 'verify-code' | 'onboarding';

interface StatusBanner {
  type: 'success' | 'info' | 'error';
  message: string;
}

interface LoginPageProps {
  onDemoLogin: () => void;
  onAuthenticatedLogin: (profile: LearnerProfile) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SKILL_CATEGORIES: LearnerSkill['category'][] = [
  'Language',
  'Frontend',
  'Backend',
  'Database',
  'Tooling',
];

export function LoginPage({ onDemoLogin, onAuthenticatedLogin }: LoginPageProps) {
  const prefersReducedMotion = useReducedMotion();
  const apiReady = isAuthApiConfigured();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [step, setStep] = useState<LoginStep>('email-mode');
  const [mode, setMode] = useState<AuthFlowMode>('signin');

  // Step 1: Email
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [emailTouched, setEmailTouched] = useState(false);

  // Step 2: 6-digit verification code (kept strictly in transient memory, never localStorage)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [verificationToken, setVerificationToken] = useState<string | undefined>(undefined);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Step 3: New account profile creation
  const [learnerName, setLearnerName] = useState('');
  const [careerGoal, setCareerGoal] = useState<CareerGoalId>('Full Stack Developer');
  const [learnerBio, setLearnerBio] = useState('');
  const [skills, setSkills] = useState<LearnerSkill[]>([]);
  const [projects, setProjects] = useState<LearnerProject[]>([]);
  const [certifications, setCertifications] = useState<LearnerCertification[]>([]);

  // Inline drafts for onboarding lists
  const [skillNameDraft, setSkillNameDraft] = useState('');
  const [skillLevelDraft, setSkillLevelDraft] = useState(60);
  const [skillCategoryDraft, setSkillCategoryDraft] = useState<LearnerSkill['category']>('Frontend');

  const [projectTitleDraft, setProjectTitleDraft] = useState('');
  const [projectStackDraft, setProjectStackDraft] = useState('');
  const [projectStatusDraft, setProjectStatusDraft] = useState<LearnerProject['status']>('In Progress');

  const [certNameDraft, setCertNameDraft] = useState('');
  const [certIssuerDraft, setCertIssuerDraft] = useState('');
  const [certYearDraft, setCertYearDraft] = useState('2026');

  // Async & status states
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [statusBanner, setStatusBanner] = useState<StatusBanner | null>(null);

  // Video state
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoSrc, setVideoSrc] = useState(LOGIN_VIDEO_SRC);
  const [videoFailed, setVideoFailed] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  const attemptVideoPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isVideoPlaying) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    if (!video.paused) return;

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Retry once user interacts if browser autoplay policy deferred playback
      });
    }
  }, [isVideoPlaying]);

  const handleVideoError = () => {
    if (videoSrc === LOGIN_VIDEO_SRC) {
      setVideoSrc(LOGIN_FALLBACK_VIDEO_SRC);
    } else {
      setVideoFailed(true);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoFailed) return;

    if (!isVideoPlaying) {
      if (!video.paused) video.pause();
      return;
    }

    attemptVideoPlay();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && video.paused) {
        attemptVideoPlay();
      }
    };

    const handleInteractionResume = () => {
      if (video.paused) {
        attemptVideoPlay();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pointerdown', handleInteractionResume, { once: true, passive: true });
    window.addEventListener('keydown', handleInteractionResume, { once: true, passive: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointerdown', handleInteractionResume);
      window.removeEventListener('keydown', handleInteractionResume);
    };
  }, [attemptVideoPlay, isVideoPlaying, videoFailed, videoSrc]);

  useEffect(() => {
    if (isFormOpen) {
      wasOpenRef.current = true;
      const timer = window.setTimeout(() => {
        if (step === 'email-mode') {
          emailInputRef.current?.focus({ preventScroll: true });
        } else if (step === 'verify-code') {
          otpInputRefs.current[0]?.focus({ preventScroll: true });
        } else if (step === 'onboarding') {
          nameInputRef.current?.focus({ preventScroll: true });
        }
      }, prefersReducedMotion ? 20 : 180);
      return () => window.clearTimeout(timer);
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerButtonRef.current?.focus({ preventScroll: true });
    }
  }, [isFormOpen, step, prefersReducedMotion]);

  useEffect(() => {
    if (!isFormOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFormOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormOpen]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const validateEmailValue = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return 'Email address is required.';
    if (!EMAIL_PATTERN.test(trimmed)) {
      return 'Enter a valid email address (for example, name@example.com).';
    }
    return undefined;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (statusBanner) setStatusBanner(null);
    if (emailTouched) {
      setEmailError(validateEmailValue(value));
    }
  };

  const handleSendCodeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailTouched(true);
    const nextErr = validateEmailValue(email);
    setEmailError(nextErr);
    if (nextErr) {
      setStatusBanner(null);
      return;
    }

    setIsSendingCode(true);
    setStatusBanner(null);

    try {
      const result = await sendVerificationCode({ email: email.trim(), mode });
      setOtpDigits(['', '', '', '', '', '']);
      setVerificationToken(undefined);
      setResendCooldown(30);
      setStep('verify-code');
      setStatusBanner({
        type: 'success',
        message:
          result.message?.trim() ||
          `A 6-digit verification code was sent to ${email.trim()}.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to send a verification code right now.';
      setStatusBanner({ type: 'error', message });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleOtpDigitChange = (index: number, rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '');
    if (statusBanner) setStatusBanner(null);

    if (digitsOnly.length > 1) {
      const next = [...otpDigits];
      for (let i = 0; i < 6 - index && i < digitsOnly.length; i += 1) {
        next[index + i] = digitsOnly[i];
      }
      setOtpDigits(next);
      const focusIdx = Math.min(5, index + digitsOnly.length);
      otpInputRefs.current[focusIdx]?.focus();
      return;
    }

    const next = [...otpDigits];
    next[index] = digitsOnly;
    setOtpDigits(next);

    if (digitsOnly && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i += 1) {
      next[i] = pasted[i];
    }
    setOtpDigits(next);
    if (statusBanner) setStatusBanner(null);
    const focusIdx = Math.min(5, pasted.length);
    otpInputRefs.current[focusIdx]?.focus();
  };

  const fullOtpCode = otpDigits.join('');

  const handleVerifyCodeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (fullOtpCode.length !== 6) {
      setStatusBanner({
        type: 'error',
        message: 'Enter all 6 digits of your verification code.',
      });
      return;
    }

    setIsVerifyingCode(true);
    setStatusBanner(null);

    try {
      const verification = await verifyEmailCode({
        email: email.trim(),
        code: fullOtpCode,
        mode,
      });

      if (!verification.verified) {
        setStatusBanner({
          type: 'error',
          message: 'Verification failed. Check your 6-digit code or request a new one.',
        });
        return;
      }

      setVerificationToken(verification.verificationToken);

      if (mode === 'signup' || verification.isNewAccount) {
        const localNameGuess = email.trim().split('@')[0]?.replace(/[._-]+/g, ' ') || '';
        if (!learnerName && localNameGuess) {
          setLearnerName(
            localNameGuess.replace(/\b\w/g, (char) => char.toUpperCase())
          );
        }
        setStep('onboarding');
        setStatusBanner({
          type: 'success',
          message: 'Email verified. Complete your learner profile to open your portal.',
        });
      } else {
        const loadedProfile =
          verification.profile ??
          (await fetchLearnerProfileAccount({
            email: email.trim(),
            verificationToken: verification.verificationToken,
          }));
        setOtpDigits(['', '', '', '', '', '']);
        setVerificationToken(undefined);
        onAuthenticatedLogin(loadedProfile);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Could not verify the code. Please check your 6-digit code and try again.';
      setStatusBanner({ type: 'error', message });
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResendingCode || isVerifyingCode) return;
    setIsResendingCode(true);
    setStatusBanner(null);

    try {
      const result = await sendVerificationCode({ email: email.trim(), mode });
      setOtpDigits(['', '', '', '', '', '']);
      setResendCooldown(30);
      setStatusBanner({
        type: 'success',
        message:
          result.message?.trim() ||
          `A fresh 6-digit code was sent to ${email.trim()}.`,
      });
      otpInputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to resend the verification code right now.';
      setStatusBanner({ type: 'error', message });
    } finally {
      setIsResendingCode(false);
    }
  };

  const handleChangeEmail = () => {
    setOtpDigits(['', '', '', '', '', '']);
    setVerificationToken(undefined);
    setResendCooldown(0);
    setStatusBanner(null);
    setStep('email-mode');
  };

  // --- Onboarding draft item helpers ---
  const handleAddDraftSkill = () => {
    const trimmed = skillNameDraft.trim();
    if (!trimmed) return;
    const clamped = Math.max(0, Math.min(100, Number(skillLevelDraft) || 50));
    setSkills((prev) => [
      ...prev,
      {
        id: `skill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: trimmed,
        level: clamped,
        category: skillCategoryDraft,
        summary: `Applied ${trimmed} experience recorded during account setup.`,
      },
    ]);
    setSkillNameDraft('');
    setSkillLevelDraft(60);
  };

  const handleAddDraftProject = () => {
    const title = projectTitleDraft.trim();
    if (!title) return;
    setProjects((prev) => [
      ...prev,
      {
        id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        stack: projectStackDraft.trim() || skills.slice(0, 3).map((s) => s.name).join(' · ') || 'Web',
        status: projectStatusDraft,
        summary: `Portfolio project: ${title}.`,
      },
    ]);
    setProjectTitleDraft('');
    setProjectStackDraft('');
  };

  const handleAddDraftCertification = () => {
    const name = certNameDraft.trim();
    if (!name) return;
    setCertifications((prev) => [
      ...prev,
      {
        id: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        issuer: certIssuerDraft.trim() || 'Independent Track',
        year: certYearDraft.trim() || '2026',
        status: 'Earned',
      },
    ]);
    setCertNameDraft('');
    setCertIssuerDraft('');
  };

  const handleCreateProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = learnerName.trim();
    if (!trimmedName) {
      setStatusBanner({
        type: 'error',
        message: 'Enter your name to create your learner profile.',
      });
      nameInputRef.current?.focus();
      return;
    }

    setIsSavingProfile(true);
    setStatusBanner(null);

    const newProfile: LearnerProfile = {
      name: trimmedName,
      careerGoal,
      bio:
        learnerBio.trim() ||
        `Aspiring ${careerGoal} building hands-on portfolio skills and closing role gaps.`,
      skills,
      projects,
      certifications,
    };

    try {
      const savedProfile = await createLearnerProfileAccount({
        email: email.trim(),
        verificationToken,
        profile: newProfile,
      });
      setOtpDigits(['', '', '', '', '', '']);
      setVerificationToken(undefined);
      onAuthenticatedLogin(savedProfile);
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to create your learner profile right now. Please try again.';
      setStatusBanner({ type: 'error', message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const panelWidthClass =
    step === 'onboarding'
      ? 'w-full max-w-[520px] md:w-[500px] lg:w-[520px]'
      : 'w-full max-w-[440px] md:w-[410px] lg:w-[440px]';

  return (
    <main className="relative min-h-screen w-full bg-[#FAF6EC] text-[#1B1710] flex flex-col md:flex-row md:items-center md:justify-end md:px-8 lg:px-14 xl:px-20 md:py-10 overflow-x-hidden">
      {/* Single Persistent Background Media Layer (never unmounted on state change) */}
      <div
        aria-hidden="true"
        className={`${
          isFormOpen
            ? 'relative w-full h-[220px] sm:h-[260px] shrink-0 md:fixed md:inset-0 md:h-auto'
            : 'fixed inset-0'
        } z-0 overflow-hidden bg-[#18130B]`}
      >
        <img
          src={LOGIN_POSTER_SRC}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />

        {!videoFailed && (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={LOGIN_POSTER_SRC}
            className="absolute inset-0 w-full h-full object-cover transform-gpu"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            onLoadedData={attemptVideoPlay}
            onCanPlay={attemptVideoPlay}
            onError={handleVideoError}
          />
        )}

        <div
          className={`absolute inset-0 ${
            isFormOpen
              ? 'bg-gradient-to-b from-[#1A150B]/5 via-[#1A150B]/10 to-[#FAF6EC]/95 md:bg-gradient-to-r md:from-[#1A150B]/5 md:via-[#1A150B]/10 md:to-[#1A150B]/30'
              : 'bg-gradient-to-r from-[#1A150B]/5 via-[#1A150B]/10 to-[#1A150B]/30'
          }`}
        />
      </div>

      {/* Subtle Pause/Play Video Control */}
      {!videoFailed && (
        <div className="fixed top-4 left-4 sm:top-6 sm:left-6 z-20">
          <button
            type="button"
            onClick={() => setIsVideoPlaying((prev) => !prev)}
            aria-label={isVideoPlaying ? 'Pause background video' : 'Play background video'}
            aria-pressed={!isVideoPlaying}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-[#FCFBF8]/90 backdrop-blur-md hover:bg-white text-xs font-semibold text-[#1B1710] shadow-sm transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
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
        </div>
      )}

      <AnimatePresence initial={false} mode="wait">
        {!isFormOpen ? (
          /* Initial Entry Screen: Background Video + Pearl White & Gold Trigger Card */
          <motion.div
            key="entry-trigger"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
            transition={{
              duration: prefersReducedMotion ? 0.01 : 0.25,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative z-10 w-full min-h-screen md:min-h-0 md:w-auto flex flex-col justify-end md:justify-center items-center md:items-end px-6 pb-12 pt-16 md:p-0"
          >
            <div className="w-full max-w-[380px] rounded-[28px] border border-[#E6D4AA] bg-[#FCFBF8]/92 backdrop-blur-md shadow-[0_28px_70px_-16px_rgba(28,22,12,0.42)] p-6 sm:p-8 text-center md:text-left">
              <p className="text-xs font-semibold tracking-wider text-[#9E7016]">
                Developer Learning Portal
              </p>
              <h1 className="mt-2 font-display text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#1B1710] [text-wrap:balance]">
                Your Next Skill Starts Here
              </h1>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#5A5140]">
                Identify skill gaps and follow a clear, guided path toward your target developer career.
              </p>

              <button
                ref={triggerButtonRef}
                type="button"
                onClick={() => setIsFormOpen(true)}
                aria-expanded={isFormOpen}
                aria-controls="portal-login-panel"
                className="mt-6 w-full min-h-[50px] px-6 py-3 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] text-[#1A150B] text-[15px] font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(166,120,30,0.3)] inline-flex items-center justify-center gap-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FCFBF8] cursor-pointer whitespace-nowrap"
              >
                <span>Sign in</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        ) : (
          /* Revealed Pearl White & Gold Account Flow on the Right */
          <div className="relative z-10 w-full md:w-auto px-4 pb-8 -mt-6 md:mt-0 md:p-0 flex justify-center md:justify-end">
            <motion.section
              id="portal-login-panel"
              key="login-panel"
              aria-labelledby="portal-login-heading"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 32 }}
              transition={{
                duration: prefersReducedMotion ? 0.01 : 0.34,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`${panelWidthClass} max-h-[88vh] overflow-y-auto rounded-[28px] border border-[#E6D4AA] bg-[#FCFBF8]/94 backdrop-blur-md shadow-[0_32px_80px_-18px_rgba(28,22,12,0.45)] px-6 py-7 sm:px-9 sm:py-9 text-[#1B1710]`}
            >
              <header className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-[#9E7016] mb-1">
                    Developer Learning Portal
                  </p>
                  <h1
                    id="portal-login-heading"
                    className="font-display text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#1B1710] [text-wrap:balance]"
                  >
                    {step === 'verify-code'
                      ? 'Verify Your Email'
                      : step === 'onboarding'
                      ? 'Create Your Learner Profile'
                      : mode === 'signup'
                      ? 'Create Your Account'
                      : 'Sign In to Your Account'}
                  </h1>
                  <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-[#5A5140]">
                    {step === 'verify-code'
                      ? `Enter the 6-digit verification code for ${email.trim()}.`
                      : step === 'onboarding'
                      ? 'Add your name, career goal, skills, projects, and certifications to personalize your roadmap.'
                      : 'Verify your email with a 6-digit code to create a new account or load your existing profile.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  aria-label="Hide sign in form"
                  className="w-11 h-11 -mt-1 -mr-1 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-[#5A5140] hover:text-[#1B1710] shadow-xs flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </header>

              {/* STEP 1: EMAIL + CREATE ACCOUNT OR SIGN IN */}
              {step === 'email-mode' && (
                <form onSubmit={handleSendCodeSubmit} noValidate className="space-y-4">
                  {/* Account Mode Segmented Selector */}
                  <div
                    role="tablist"
                    aria-label="Authentication mode"
                    className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl border border-[#E6D7B3] bg-[#F6EED9]"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'signin'}
                      onClick={() => {
                        setMode('signin');
                        setStatusBanner(null);
                      }}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] ${
                        mode === 'signin'
                          ? 'bg-white text-[#1B1710] shadow-xs border border-[#E2CFA3]'
                          : 'text-[#5A5140] hover:text-[#1B1710]'
                      }`}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'signup'}
                      onClick={() => {
                        setMode('signup');
                        setStatusBanner(null);
                      }}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] ${
                        mode === 'signup'
                          ? 'bg-white text-[#1B1710] shadow-xs border border-[#E2CFA3]'
                          : 'text-[#5A5140] hover:text-[#1B1710]'
                      }`}
                    >
                      Create account
                    </button>
                  </div>

                  {/* Email Field */}
                  <div>
                    <label
                      htmlFor="portal-email"
                      className="block text-xs font-semibold text-[#3C3426] mb-1.5"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <Mail
                        className="w-4 h-4 text-[#9E7016] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        ref={emailInputRef}
                        id="portal-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        disabled={isSendingCode}
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        onBlur={() => {
                          setEmailTouched(true);
                          setEmailError(validateEmailValue(email));
                        }}
                        placeholder="you@example.com"
                        aria-invalid={Boolean(emailError)}
                        aria-describedby={emailError ? 'portal-email-error' : undefined}
                        className={`w-full min-h-[46px] rounded-xl border bg-white pl-10 pr-4 py-2.5 text-sm text-[#1B1710] placeholder:text-[#9A8E78] shadow-xs transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-65 ${
                          emailError
                            ? 'border-red-400 ring-2 ring-red-400/50 focus:ring-red-400'
                            : 'border-[#E2CFA3] focus:border-[#C89B3C] focus:ring-[#C89B3C]/40'
                        }`}
                      />
                    </div>
                    {emailError && (
                      <p
                        id="portal-email-error"
                        role="alert"
                        className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-700"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
                        <span>{emailError}</span>
                      </p>
                    )}
                  </div>

                  {/* Honest API Placeholder Notice when external auth API is not configured yet */}
                  {!apiReady && !statusBanner && (
                    <div
                      role="note"
                      className="flex items-start gap-2.5 rounded-xl border border-[#E2CFA3] bg-[#FAF5E8] px-3.5 py-2.5 text-xs leading-relaxed text-[#4C4332]"
                    >
                      <Info className="w-4 h-4 text-[#9E7016] shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        Account API endpoints are awaiting configuration (<code className="font-mono text-[11px]">VITE_AUTH_API_BASE_URL</code>). Real email codes will send once your documented API is connected.
                      </span>
                    </div>
                  )}

                  {statusBanner && (
                    <div
                      role={statusBanner.type === 'error' ? 'alert' : 'status'}
                      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
                        statusBanner.type === 'error'
                          ? 'border-rose-200 bg-rose-50 text-rose-800'
                          : 'border-[#E2CFA3] bg-[#FAF5E8] text-[#3C3426]'
                      }`}
                    >
                      {statusBanner.type === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                      ) : (
                        <Info className="w-4 h-4 text-[#9E7016] shrink-0 mt-0.5" aria-hidden="true" />
                      )}
                      <span>{statusBanner.message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSendingCode}
                    className="w-full min-h-[50px] px-6 py-3 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] disabled:opacity-65 text-[#1A150B] text-[15px] font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(166,120,30,0.28)] inline-flex items-center justify-center gap-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FCFBF8] cursor-pointer whitespace-nowrap"
                  >
                    {isSendingCode ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Sending verification code...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {mode === 'signup'
                            ? 'Send code & create account'
                            : 'Send sign-in code'}
                        </span>
                        <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: SIX-DIGIT VERIFICATION CODE */}
              {step === 'verify-code' && (
                <form onSubmit={handleVerifyCodeSubmit} noValidate className="space-y-4">
                  <div className="flex items-center justify-between gap-2 text-xs text-[#5A5140] pb-1 border-b border-[#EFE4CA]">
                    <span>
                      Mode:{' '}
                      <strong className="text-[#1B1710]">
                        {mode === 'signup' ? 'Create account' : 'Sign in'}
                      </strong>
                    </span>
                    <span className="truncate max-w-[200px] font-medium text-[#1B1710]">
                      {email.trim()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="otp-digit-0"
                      className="block text-xs font-semibold text-[#3C3426]"
                    >
                      6-digit verification code
                    </label>

                    <div className="grid grid-cols-6 gap-2">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-digit-${idx}`}
                          ref={(el) => {
                            otpInputRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                          maxLength={6}
                          disabled={isVerifyingCode}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          onPaste={handleOtpPaste}
                          aria-label={`Verification digit ${idx + 1} of 6`}
                          className="h-12 w-full rounded-xl border border-[#E2CFA3] bg-white text-center font-display text-lg font-bold text-[#1B1710] shadow-xs tabular-nums focus:outline-none focus:border-[#C89B3C] focus:ring-2 focus:ring-[#C89B3C]/40 disabled:opacity-65"
                        />
                      ))}
                    </div>
                  </div>

                  {statusBanner && (
                    <div
                      role={statusBanner.type === 'error' ? 'alert' : 'status'}
                      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
                        statusBanner.type === 'error'
                          ? 'border-rose-200 bg-rose-50 text-rose-800'
                          : statusBanner.type === 'success'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-[#E2CFA3] bg-[#FAF5E8] text-[#3C3426]'
                      }`}
                    >
                      {statusBanner.type === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                      ) : statusBanner.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                      ) : (
                        <Info className="w-4 h-4 text-[#9E7016] shrink-0 mt-0.5" aria-hidden="true" />
                      )}
                      <span>{statusBanner.message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifyingCode || fullOtpCode.length !== 6}
                    className="w-full min-h-[50px] px-6 py-3 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] disabled:opacity-55 text-[#1A150B] text-[15px] font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(166,120,30,0.28)] inline-flex items-center justify-center gap-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FCFBF8] cursor-pointer whitespace-nowrap"
                  >
                    {isVerifyingCode ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Verifying code...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>Verify code</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={isResendingCode || isVerifyingCode || resendCooldown > 0}
                      onClick={() => void handleResendCode()}
                      className="min-h-[44px] px-3 py-2 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] disabled:opacity-55 text-xs font-semibold text-[#1B1710] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
                    >
                      {isResendingCode ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9E7016]" aria-hidden="true" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5 text-[#9E7016]" aria-hidden="true" />
                      )}
                      <span>
                        {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isVerifyingCode}
                      onClick={handleChangeEmail}
                      className="min-h-[44px] px-3 py-2 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] disabled:opacity-55 text-xs font-semibold text-[#1B1710] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
                    >
                      <span>Change email</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: NEW ACCOUNT PROFILE ONBOARDING */}
              {step === 'onboarding' && (
                <form onSubmit={handleCreateProfileSubmit} noValidate className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="onboard-name"
                        className="block text-xs font-semibold text-[#3C3426] mb-1"
                      >
                        Full Name
                      </label>
                      <input
                        ref={nameInputRef}
                        id="onboard-name"
                        type="text"
                        required
                        disabled={isSavingProfile}
                        value={learnerName}
                        onChange={(e) => setLearnerName(e.target.value)}
                        placeholder="Alex Rivera"
                        className="w-full min-h-[44px] rounded-xl border border-[#E2CFA3] bg-white px-3.5 py-2 text-sm text-[#1B1710] focus:outline-none focus:border-[#C89B3C] focus:ring-2 focus:ring-[#C89B3C]/40"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="onboard-goal"
                        className="block text-xs font-semibold text-[#3C3426] mb-1"
                      >
                        Career Goal
                      </label>
                      <select
                        id="onboard-goal"
                        disabled={isSavingProfile}
                        value={careerGoal}
                        onChange={(e) => setCareerGoal(e.target.value as CareerGoalId)}
                        className="w-full min-h-[44px] rounded-xl border border-[#E2CFA3] bg-white px-3 py-2 text-sm font-medium text-[#1B1710] focus:outline-none focus:border-[#C89B3C] focus:ring-2 focus:ring-[#C89B3C]/40"
                      >
                        {CAREER_GOALS.map((goal) => (
                          <option key={goal} value={goal}>
                            {goal}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="onboard-bio"
                      className="block text-xs font-semibold text-[#3C3426] mb-1"
                    >
                      Background Summary (optional)
                    </label>
                    <input
                      id="onboard-bio"
                      type="text"
                      disabled={isSavingProfile}
                      value={learnerBio}
                      onChange={(e) => setLearnerBio(e.target.value)}
                      placeholder="Current experience or study focus..."
                      className="w-full min-h-[44px] rounded-xl border border-[#E2CFA3] bg-white px-3.5 py-2 text-sm text-[#1B1710] focus:outline-none focus:border-[#C89B3C] focus:ring-2 focus:ring-[#C89B3C]/40"
                    />
                  </div>

                  {/* Current Skills Builder */}
                  <div className="pt-2 border-t border-[#EFE4CA] space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#3C3426]">
                      <span>Current Skills ({skills.length})</span>
                    </div>

                    {skills.length > 0 && (
                      <div className="space-y-1.5">
                        {skills.map((skill) => (
                          <div
                            key={skill.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-[#E6D7B3] bg-white px-3 py-2 text-xs"
                          >
                            <span className="font-semibold text-[#1B1710] truncate">
                              {skill.name} · {skill.level}% · {skill.category}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setSkills((prev) => prev.filter((item) => item.id !== skill.id))
                              }
                              aria-label={`Remove ${skill.name}`}
                              className="w-8 h-8 rounded-full text-rose-700 hover:bg-rose-50 inline-flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-12 gap-2">
                      <input
                        type="text"
                        value={skillNameDraft}
                        onChange={(e) => setSkillNameDraft(e.target.value)}
                        placeholder="Skill (e.g. React)"
                        aria-label="New skill name"
                        className="col-span-5 min-h-[42px] rounded-xl border border-[#E2CFA3] bg-white px-3 text-xs text-[#1B1710]"
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={skillLevelDraft}
                        onChange={(e) => setSkillLevelDraft(Number(e.target.value))}
                        aria-label="Skill level percentage"
                        className="col-span-2 min-h-[42px] rounded-xl border border-[#E2CFA3] bg-white px-2 text-xs text-center tabular-nums"
                      />
                      <select
                        value={skillCategoryDraft}
                        onChange={(e) =>
                          setSkillCategoryDraft(e.target.value as LearnerSkill['category'])
                        }
                        aria-label="Skill category"
                        className="col-span-3 min-h-[42px] rounded-xl border border-[#E2CFA3] bg-white px-2 text-xs"
                      >
                        {SKILL_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddDraftSkill}
                        aria-label="Add skill"
                        className="col-span-2 min-h-[42px] rounded-xl border border-[#DEC99A] bg-[#FAF5E8] hover:bg-[#F3E9D2] text-[#1B1710] text-xs font-semibold inline-flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Projects Builder */}
                  <div className="pt-2 border-t border-[#EFE4CA] space-y-2">
                    <div className="text-xs font-semibold text-[#3C3426]">
                      Projects ({projects.length})
                    </div>

                    {projects.length > 0 && (
                      <div className="space-y-1.5">
                        {projects.map((proj) => (
                          <div
                            key={proj.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-[#E6D7B3] bg-white px-3 py-2 text-xs"
                          >
                            <span className="font-semibold text-[#1B1710] truncate">
                              {proj.title} · {proj.stack} · {proj.status}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setProjects((prev) => prev.filter((item) => item.id !== proj.id))
                              }
                              aria-label={`Remove ${proj.title}`}
                              className="w-8 h-8 rounded-full text-rose-700 hover:bg-rose-50 inline-flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-12 gap-2">
                      <input
                        type="text"
                        value={projectTitleDraft}
                        onChange={(e) => setProjectTitleDraft(e.target.value)}
                        placeholder="Project title"
                        aria-label="New project title"
                        className="col-span-5 min-h-[42px] rounded-xl border border-[#E2CFA3] bg-white px-3 text-xs text-[#1B1710]"
                      />
                      <input
                        type="text"
                        value={projectStackDraft}
                        onChange={(e) => setProjectStackDraft(e.target.value)}
                        placeholder="Tech stack"
                        aria-label="Project stack"
                        className="col-span-3 min-h-[42px] rounded-xl border border-[#E2CFA3] bg-white px-2.5 text-xs text-[#1B1710]"
                      />
                      <select
                        value={projectStatusDraft}
                        onChange={(e) =>
                          setProjectStatusDraft(e.target.value as LearnerProject['status'])
                        }
                        aria-label="Project status"
                        className="col-span-2 min-h-[42px] rounded-xl border border-[#E2CFA3] bg-white px-1.5 text-xs"
                      >
                        <option value="Planned">Planned</option>
                        <option value="In Progress">Active</option>
                        <option value="Completed">Done</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddDraftProject}
                        aria-label="Add project"
                        className="col-span-2 min-h-[42px] rounded-xl border border-[#DEC99A] bg-[#FAF5E8] hover:bg-[#F3E9D2] text-[#1B1710] text-xs font-semibold inline-flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Certifications Builder */}
                  <div className="pt-2 border-t border-[#EFE4CA] space-y-2">
                    <div className="text-xs font-semibold text-[#3C3426]">
                      Certifications ({certifications.length})
                    </div>

                    {certifications.length > 0 && (
                      <div className="space-y-1.5">
                        {certifications.map((cert) => (
                          <div
                            key={cert.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-[#E6D7B3] bg-white px-3 py-2 text-xs"
                          >
                            <span className="font-semibold text-[#1B1710] truncate">
                              {cert.name} · {cert.issuer} · {cert.year}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCertifications((prev) =>
                                  prev.filter((item) => item.id !== cert.id)
                                )
                              }
                              aria-label={`Remove ${cert.name}`}
                              className="w-8 h-8 rounded-full text-rose-700 hover:bg-rose-50 inline-flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-12 gap-2">
                      <input
                        type="text"
                        value={certNameDraft}
                        onChange={(e) => setCertNameDraft(e.target.value)}
                        placeholder="Certification name"
                        aria-label="Certification name"
                        className="col-span-5 min-h-[42px] rounded-xl border border-[#E2CFA3] bg-white px-3 text-xs text-[#1B1710]"
                      />
                      <input
                        type="text"
                        value={certIssuerDraft}
                        onChange={(e) => setCertIssuerDraft(e.target.value)}
                        placeholder="Issuer"
                        aria-label="Certification issuer"
                        className="col-span-3 min-h-[42px] rounded-xl border border-[#E2CFA3] bg-white px-2.5 text-xs text-[#1B1710]"
                      />
                      <input
                        type="text"
                        value={certYearDraft}
                        onChange={(e) => setCertYearDraft(e.target.value)}
                        placeholder="Year"
                        aria-label="Certification year"
                        className="col-span-2 min-h-[42px] rounded-xl border border-[#E2CFA3] bg-white px-2 text-xs text-center tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={handleAddDraftCertification}
                        aria-label="Add certification"
                        className="col-span-2 min-h-[42px] rounded-xl border border-[#DEC99A] bg-[#FAF5E8] hover:bg-[#F3E9D2] text-[#1B1710] text-xs font-semibold inline-flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {statusBanner && (
                    <div
                      role={statusBanner.type === 'error' ? 'alert' : 'status'}
                      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
                        statusBanner.type === 'error'
                          ? 'border-rose-200 bg-rose-50 text-rose-800'
                          : statusBanner.type === 'success'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-[#E2CFA3] bg-[#FAF5E8] text-[#3C3426]'
                      }`}
                    >
                      {statusBanner.type === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                      )}
                      <span>{statusBanner.message}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="flex-1 min-h-[50px] px-5 py-3 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] disabled:opacity-65 text-[#1A150B] text-sm font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(166,120,30,0.28)] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          <span>Creating profile...</span>
                        </>
                      ) : (
                        <>
                          <span>Create profile &amp; open portal</span>
                          <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isSavingProfile}
                      onClick={handleChangeEmail}
                      className="min-h-[50px] px-4 py-3 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] text-xs font-semibold text-[#1B1710] cursor-pointer whitespace-nowrap"
                    >
                      Change email
                    </button>
                  </div>
                </form>
              )}

              {/* Divider */}
              <div className="relative flex items-center my-5" aria-hidden="true">
                <div className="flex-grow border-t border-[#E6D7B3]" />
                <span className="px-3 text-xs font-medium text-[#7B6E57]">or</span>
                <div className="flex-grow border-t border-[#E6D7B3]" />
              </div>

              {/* Separate Demo Account Button & Preview Label */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={onDemoLogin}
                  className="w-full min-h-[50px] px-6 py-3 rounded-full border border-[#DEC99A] bg-white hover:bg-[#FAF5E8] active:bg-[#F3E9D2] text-[#1B1710] text-[15px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_18px_-8px_rgba(120,86,18,0.2)] transition-colors duration-150 inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FCFBF8] cursor-pointer whitespace-nowrap"
                >
                  <UserCheck className="w-4 h-4 text-[#9E7016] shrink-0" aria-hidden="true" />
                  <span>Continue with demo account</span>
                </button>

                <p className="text-center text-[11px] sm:text-xs leading-relaxed text-[#6A5F4B]">
                  Preview mode — opens the sample Full Stack Developer dashboard without credentials.
                </p>
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
