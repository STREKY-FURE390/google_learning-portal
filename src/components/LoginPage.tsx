import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Pause,
  Play,
  UserCheck,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  LOGIN_FALLBACK_VIDEO_SRC,
  LOGIN_POSTER_SRC,
  LOGIN_VIDEO_SRC,
} from '../data/portalData';

interface FormErrors {
  email?: string;
  password?: string;
}

interface StatusBanner {
  type: 'success' | 'info';
  message: string;
}

interface LoginPageProps {
  onDemoLogin: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage({ onDemoLogin }: LoginPageProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoSrc, setVideoSrc] = useState(LOGIN_VIDEO_SRC);
  const [videoFailed, setVideoFailed] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });
  const [statusBanner, setStatusBanner] = useState<StatusBanner | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
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
        emailInputRef.current?.focus({ preventScroll: true });
      }, prefersReducedMotion ? 20 : 180);
      return () => window.clearTimeout(timer);
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerButtonRef.current?.focus({ preventScroll: true });
    }
  }, [isFormOpen, prefersReducedMotion]);

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

  const validateFields = (nextEmail: string, nextPassword: string): FormErrors => {
    const nextErrors: FormErrors = {};
    const trimmedEmail = nextEmail.trim();

    if (!trimmedEmail) {
      nextErrors.email = 'Email address is required.';
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email address (for example, name@example.com).';
    }

    if (!nextPassword) {
      nextErrors.password = 'Password is required.';
    } else if (nextPassword.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    return nextErrors;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (statusBanner) setStatusBanner(null);
    if (touched.email) {
      const next = validateFields(value, password);
      setErrors((prev) => ({ ...prev, email: next.email }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (statusBanner) setStatusBanner(null);
    if (touched.password) {
      const next = validateFields(email, value);
      setErrors((prev) => ({ ...prev, password: next.password }));
    }
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const next = validateFields(email, password);
    setErrors((prev) => ({ ...prev, [field]: next[field] }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ email: true, password: true });

    const validationErrors = validateFields(email, password);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setStatusBanner(null);
      return;
    }

    setStatusBanner({
      type: 'info',
      message: `Form validated for ${email.trim()}${rememberMe ? ' (Remember me selected)' : ''}. Real authentication is not configured yet—use "Continue with demo account" below to preview the portal.`,
    });
  };

  const handleForgotPassword = () => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && EMAIL_PATTERN.test(trimmedEmail)) {
      setErrors((prev) => ({ ...prev, email: undefined }));
      setStatusBanner({
        type: 'info',
        message: `Password reset is not connected in preview mode (entered: ${trimmedEmail}).`,
      });
    } else {
      setTouched((prev) => ({ ...prev, email: true }));
      setErrors((prev) => ({
        ...prev,
        email: 'Enter your email address first to check reset options.',
      }));
      setStatusBanner(null);
    }
  };

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
        {/* Still Image Fallback */}
        <img
          src={LOGIN_POSTER_SRC}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Single High-Quality Autoplaying, Muted, Looping Background Video */}
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

        {/* Lighter Atmospheric Scrim Keeping 4K Sunset Facade Bright & Sharp */}
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
          /* Revealed Pearl White & Gold Login Panel on the Right */
          <div className="relative z-10 w-full md:w-auto px-4 pb-8 -mt-6 md:mt-0 md:p-0 flex justify-center md:justify-end">
            <motion.section
              id="portal-login-panel"
              key="login-panel"
              aria-labelledby="portal-login-heading"
              initial={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: 0, x: 40 }
              }
              animate={{ opacity: 1, x: 0 }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, x: 32 }
              }
              transition={{
                duration: prefersReducedMotion ? 0.01 : 0.34,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="w-full max-w-[440px] md:w-[410px] lg:w-[440px] rounded-[28px] border border-[#E6D4AA] bg-[#FCFBF8]/94 backdrop-blur-md shadow-[0_32px_80px_-18px_rgba(28,22,12,0.45)] px-6 py-8 sm:px-9 sm:py-10 text-[#1B1710]"
            >
              <header className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-[#9E7016] mb-1.5">
                    Developer Learning Portal
                  </p>
                  <h1
                    id="portal-login-heading"
                    className="font-display text-2xl sm:text-[27px] font-extrabold tracking-tight text-[#1B1710] [text-wrap:balance]"
                  >
                    Sign In to Your Account
                  </h1>
                  <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-[#5A5140]">
                    Access your personalized skill-gap analysis and guided developer career roadmap.
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

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Email Field */}
                <div>
                  <label
                    htmlFor="portal-email"
                    className="block text-xs font-semibold text-[#3C3426] mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    ref={emailInputRef}
                    id="portal-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={() => handleBlur('email')}
                    placeholder="Email ID"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'portal-email-error' : undefined}
                    className={`w-full min-h-[44px] rounded-xl border bg-white px-4 py-2.5 text-sm text-[#1B1710] placeholder:text-[#9A8E78] shadow-xs transition-all duration-150 focus:outline-none focus:ring-2 ${
                      errors.email
                        ? 'border-red-400 ring-2 ring-red-400/50 focus:ring-red-400'
                        : 'border-[#E2CFA3] focus:border-[#C89B3C] focus:ring-[#C89B3C]/40'
                    }`}
                  />
                  {errors.email && (
                    <p
                      id="portal-email-error"
                      role="alert"
                      className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-700"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="portal-password"
                    className="block text-xs font-semibold text-[#3C3426] mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="portal-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      onBlur={() => handleBlur('password')}
                      placeholder="Password"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? 'portal-password-error' : undefined}
                      className={`w-full min-h-[44px] rounded-xl border bg-white pl-4 pr-11 py-2.5 text-sm text-[#1B1710] placeholder:text-[#9A8E78] shadow-xs transition-all duration-150 focus:outline-none focus:ring-2 ${
                        errors.password
                          ? 'border-red-400 ring-2 ring-red-400/50 focus:ring-red-400'
                          : 'border-[#E2CFA3] focus:border-[#C89B3C] focus:ring-[#C89B3C]/40'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full text-[#6A5F4B] hover:text-[#1B1710] hover:bg-[#FAF5E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p
                      id="portal-password-error"
                      role="alert"
                      className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-700"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
                      <span>{errors.password}</span>
                    </p>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <label
                    htmlFor="portal-remember"
                    className="inline-flex items-center gap-2.5 min-h-[44px] cursor-pointer select-none text-xs sm:text-[13px] text-[#4C4332]"
                  >
                    <input
                      id="portal-remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-md border-[#DEC99A] bg-white accent-[#B68623] focus:ring-2 focus:ring-[#C89B3C] cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="min-h-[44px] px-3.5 py-2 rounded-full bg-white hover:bg-[#FAF5E8] border border-[#E6D7B3] text-xs sm:text-[13px] font-medium text-[#7A5610] hover:text-[#1B1710] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Inline Feedback */}
                {statusBanner && (
                  <div
                    role="status"
                    className="flex items-start gap-2.5 rounded-xl border border-[#E2CFA3] bg-[#FAF5E8] px-3.5 py-2.5 text-xs leading-relaxed text-[#3C3426]"
                  >
                    {statusBanner.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <Info className="w-4 h-4 text-[#9E7016] shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <span>{statusBanner.message}</span>
                  </div>
                )}

                {/* Primary Sign In Button */}
                <button
                  type="submit"
                  className="w-full min-h-[50px] px-6 py-3 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] text-[#1A150B] text-[15px] font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_28px_rgba(166,120,30,0.28)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FCFBF8] cursor-pointer whitespace-nowrap"
                >
                  Sign in
                </button>
              </form>

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
                  Preview mode only — opens the sample Full Stack Developer dashboard without credentials. Real authentication is not configured.
                </p>
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
