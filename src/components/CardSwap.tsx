import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export interface CardSwapProps<T extends { id: string }> {
  items: T[];
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  autoPlayIntervalMs?: number;
  pauseOnHover?: boolean;
  label?: string;
  renderCard: (item: T, isFront: boolean) => React.ReactNode;
}

export function CardSwap<T extends { id: string }>({
  items,
  activeIndex: controlledIndex,
  onActiveIndexChange,
  autoPlayIntervalMs = 5000,
  pauseOnHover = true,
  label = 'Featured lessons carousel',
  renderCard,
}: CardSwapProps<T>) {
  const prefersReducedMotion = useReducedMotion();
  const [internalIndex, setInternalIndex] = useState(0);
  const [isHoveredOrFocused, setIsHoveredOrFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  const count = items.length;
  const activeIndex =
    controlledIndex !== undefined ? controlledIndex % Math.max(count, 1) : internalIndex;

  const setIndex = (next: number) => {
    if (count === 0) return;
    const normalized = ((next % count) + count) % count;
    if (controlledIndex === undefined) {
      setInternalIndex(normalized);
    }
    onActiveIndexChange?.(normalized);
  };

  const isAutoPlaying =
    !prefersReducedMotion &&
    !userPaused &&
    !(pauseOnHover && isHoveredOrFocused) &&
    count > 1;

  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = window.setInterval(() => {
      setIndex(activeIndex + 1);
    }, autoPlayIntervalMs);

    return () => window.clearInterval(timer);
  }, [isAutoPlaying, activeIndex, autoPlayIntervalMs, count]);

  if (count === 0) return null;

  const orderedIndices = Array.from({ length: Math.min(3, count) }, (_, offset) => {
    return (activeIndex + offset) % count;
  });

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => pauseOnHover && setIsHoveredOrFocused(true)}
      onMouseLeave={() => pauseOnHover && setIsHoveredOrFocused(false)}
      onFocusCapture={() => pauseOnHover && setIsHoveredOrFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsHoveredOrFocused(false);
        }
      }}
      className="w-full"
    >
      {/* 3D Perspective Card Stack Stage */}
      <div className="relative w-full min-h-[300px] sm:min-h-[320px] [perspective:1200px]">
        <AnimatePresence initial={false} mode="sync">
          {orderedIndices
            .slice()
            .reverse()
            .map((itemIdx) => {
              const offset = (itemIdx - activeIndex + count) % count;
              const isFront = offset === 0;
              const item = items[itemIdx];

              const targetY = prefersReducedMotion ? 0 : offset * 14;
              const targetX = prefersReducedMotion ? 0 : offset * 10;
              const targetScale = prefersReducedMotion ? 1 : 1 - offset * 0.045;
              const targetOpacity = isFront ? 1 : Math.max(0.55, 1 - offset * 0.22);

              return (
                <motion.div
                  key={item.id}
                  style={{
                    zIndex: count - offset,
                    transformOrigin: 'top center',
                  }}
                  initial={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          y: 28,
                          scale: 0.94,
                        }
                  }
                  animate={{
                    opacity: targetOpacity,
                    y: targetY,
                    x: targetX,
                    scale: targetScale,
                  }}
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          y: -26,
                          scale: 0.96,
                        }
                  }
                  transition={{
                    duration: prefersReducedMotion ? 0.01 : 0.42,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  aria-hidden={!isFront}
                  className={`${
                    isFront ? 'relative' : 'hidden sm:block absolute inset-x-0 top-0 pointer-events-none'
                  } w-full`}
                >
                  {renderCard(item, isFront)}
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      {/* Accessible iOS-Grade Controls & Progress Dots */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-0.5" role="tablist" aria-label="Choose featured lesson">
          {items.map((item, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`Show lesson ${idx + 1} of ${count}`}
                onClick={() => setIndex(idx)}
                className="min-h-[44px] min-w-[28px] px-1 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] rounded-full"
              >
                <span
                  className={`block h-2 rounded-full transition-all duration-200 ${
                    isSelected
                      ? 'w-6 bg-[#C89B3C] shadow-[0_0_8px_rgba(200,155,60,0.45)]'
                      : 'w-2 bg-[#D9C598] hover:bg-[#B68623]'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {!prefersReducedMotion && (
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              aria-label={userPaused ? 'Resume lesson rotation' : 'Pause lesson rotation'}
              aria-pressed={userPaused}
              className="w-11 h-11 rounded-full border border-[#DEC99A] bg-white/95 backdrop-blur-md hover:bg-[#FAF5E8] text-[#6A5F4B] hover:text-[#1B1710] shadow-[0_6px_16px_-8px_rgba(120,86,18,0.28)] inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] cursor-pointer"
            >
              {userPaused ? (
                <Play className="w-4 h-4 text-[#9E7016]" aria-hidden="true" />
              ) : (
                <Pause className="w-4 h-4 text-[#9E7016]" aria-hidden="true" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIndex(activeIndex - 1)}
            aria-label="Previous featured lesson"
            className="w-11 h-11 rounded-full border border-[#DEC99A] bg-white/95 backdrop-blur-md hover:bg-[#FAF5E8] text-[#1B1710] shadow-[0_6px_16px_-8px_rgba(120,86,18,0.28)] inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setIndex(activeIndex + 1)}
            aria-label="Next featured lesson"
            className="w-11 h-11 rounded-full border border-[#DEC99A] bg-white/95 backdrop-blur-md hover:bg-[#FAF5E8] text-[#1B1710] shadow-[0_6px_16px_-8px_rgba(120,86,18,0.28)] inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
