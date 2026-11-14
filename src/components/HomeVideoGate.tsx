import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import {
  HERO_FALLBACK_VIDEO_SRC,
  HERO_POSTER_SRC,
  HERO_VIDEO_SRC,
} from '../data/portalData';

interface HomeVideoGateProps {
  onEnterHome: () => void;
}

export function HomeVideoGate({ onEnterHome }: HomeVideoGateProps) {
  const prefersReducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState(HERO_VIDEO_SRC);
  const [videoFailed, setVideoFailed] = useState(false);

  const attemptPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || videoFailed) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    if (video.paused) {
      const promise = video.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {
          // Retry on pointer/visibility event if browser autoplay policy deferred playback
        });
      }
    }
  }, [videoFailed]);

  useEffect(() => {
    attemptPlay();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        attemptPlay();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pointerdown', attemptPlay, { once: true, passive: true });
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointerdown', attemptPlay);
    };
  }, [attemptPlay, videoSrc]);

  const handleVideoError = () => {
    if (videoSrc === HERO_VIDEO_SRC) {
      setVideoSrc(HERO_FALLBACK_VIDEO_SRC);
    } else {
      setVideoFailed(true);
    }
  };

  const handleClickExplore = () => {
    attemptPlay();
    onEnterHome();
  };

  return (
    <main
      aria-label="Home video preview"
      className="relative min-h-[100dvh] w-full overflow-hidden bg-[#090F14] text-white flex flex-col items-center justify-end pb-14 sm:pb-16 px-6"
    >
      {/* Full-Viewport Autoplaying Background Video */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 overflow-hidden bg-[radial-gradient(circle_at_30%_30%,_#11323E_0%,_#09131A_55%,_#060A0E_100%)]"
      >
        <img
          src={HERO_POSTER_SRC}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />

        {!videoFailed && (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={HERO_POSTER_SRC}
            className="absolute inset-0 w-full h-full object-cover transform-gpu"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            onLoadedMetadata={attemptPlay}
            onLoadedData={attemptPlay}
            onCanPlay={attemptPlay}
            onError={handleVideoError}
          />
        )}

        {/* Subtle Bottom Vignette Only (keeps the video completely clear above) */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
      </div>

      {/* Only the Click Button Shown Over the Playing Video */}
      <motion.div
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0.01 : 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10"
      >
        <button
          type="button"
          onClick={handleClickExplore}
          className="inline-flex items-center justify-center gap-2.5 min-h-[54px] px-8 py-3.5 rounded-full border border-[#F7E5AE]/85 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] text-[#1A150B] text-[15px] font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_18px_42px_rgba(0,0,0,0.45)] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3DA94] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          <span>Click to explore</span>
          <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
        </button>
      </motion.div>
    </main>
  );
}
