'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStatus } from '@/lib/hooks';

/**
 * Persistent top banner shown when the device is offline.
 * Briefly shows a "Back online" banner when connection restores.
 */
export function NetworkStatusBanner() {
  const { isOnline, wasOffline } = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="overflow-hidden z-[60] sticky top-0"
        >
          <div className="bg-warning-soft border-b border-warning/30 px-4 py-2.5 flex items-center justify-center gap-2 text-sm text-warning-intense">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0" aria-hidden="true">
              <path
                d="M12 9v4m0 4h.01M3.07 20.4 10.59 3.58a1.58 1.58 0 0 1 2.82 0l7.52 16.82A1.58 1.58 0 0 1 19.52 22H4.48a1.58 1.58 0 0 1-1.41-1.6Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>You&apos;re offline. Some features may be unavailable.</span>
          </div>
        </motion.div>
      )}

      {isOnline && wasOffline && (
        <motion.div
          key="back-online"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="overflow-hidden z-[60] sticky top-0"
        >
          <div className="bg-freshness-soft border-b border-freshness/30 px-4 py-2.5 flex items-center justify-center gap-2 text-sm text-freshness">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0" aria-hidden="true">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Back online</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
