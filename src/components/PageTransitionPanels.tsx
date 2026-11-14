import React from 'react';
import { motion } from 'motion/react';
import { PortalPageId } from '../data/portalData';

export type ShutterPhase = 'idle' | 'closing' | 'closed' | 'opening';

interface PageTransitionPanelsProps {
  phase: ShutterPhase;
  targetPage: PortalPageId;
}

const PAGE_LABELS: Record<PortalPageId, string> = {
  home: 'Home',
  'learning-path': 'Learning Path',
  courses: 'Courses',
  profile: 'Profile',
};

export function PageTransitionPanels({ phase, targetPage }: PageTransitionPanelsProps) {
  if (phase === 'idle') return null;

  const isClosed = phase === 'closing' || phase === 'closed';

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-50 pointer-events-auto overflow-hidden flex"
    >
      {/* Left Transition Panel */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: isClosed ? '0%' : '-100%' }}
        transition={{
          duration: phase === 'closing' ? 0.28 : 0.38,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="w-1/2 h-full bg-[#FCFBF8] border-r border-[#C99A36]/45 shadow-[12px_0_40px_rgba(120,86,18,0.16)] flex items-center justify-end pr-3 sm:pr-5"
      >
        <span className="font-display text-sm sm:text-base font-bold tracking-tight text-[#1B1710] select-none">
          DevPath Studio
        </span>
      </motion.div>

      {/* Right Transition Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: isClosed ? '0%' : '100%' }}
        transition={{
          duration: phase === 'closing' ? 0.28 : 0.38,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="w-1/2 h-full bg-[#F8F3E6] border-l border-[#C99A36]/30 shadow-[-12px_0_40px_rgba(120,86,18,0.16)] flex items-center justify-start pl-3 sm:pl-5"
      >
        <span className="font-display text-sm sm:text-base font-semibold tracking-tight text-[#9E7016] select-none">
          {PAGE_LABELS[targetPage]}
        </span>
      </motion.div>
    </div>
  );
}
