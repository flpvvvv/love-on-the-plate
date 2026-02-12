'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useScrollToTop } from '@/lib/hooks';

/**
 * Floating "scroll to top" button that fades in after scrolling past a threshold.
 * Positioned above the BottomNav on mobile.
 */
export function ScrollToTop() {
  const { visible, scrollToTop } = useScrollToTop({ threshold: 600 });

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 w-11 h-11 rounded-full bg-canvas-elevated border border-stroke shadow-md flex items-center justify-center text-ink-secondary hover:text-ink hover:shadow-lg transition-all cursor-pointer focus-ring active:scale-95"
          aria-label="Scroll to top"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
            <path d="M12 19V5m0 0l-7 7m7-7l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
