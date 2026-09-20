"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useNetworkStatus } from "@/lib/hooks"

/**
 * Persistent top banner shown when the device is offline.
 * Briefly shows a "Back online" banner when connection restores.
 */
export function NetworkStatusBanner() {
  const { isOnline, wasOffline } = useNetworkStatus()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.14, ease: [0.2, 0.9, 0.3, 1] }}
          className="overflow-hidden z-[60] sticky top-0"
        >
          <div className="banner justify-center">
            <svg className="ic ic-sm shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 9v4m0 4h.01M3.07 20.4 10.59 3.58a1.58 1.58 0 0 1 2.82 0l7.52 16.82A1.58 1.58 0 0 1 19.52 22H4.48a1.58 1.58 0 0 1-1.41-1.6Z" />
            </svg>
            <span>You&apos;re offline. Some features may be unavailable.</span>
          </div>
        </motion.div>
      )}

      {isOnline && wasOffline && (
        <motion.div
          key="back-online"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.14, ease: [0.2, 0.9, 0.3, 1] }}
          className="overflow-hidden z-[60] sticky top-0"
        >
          <div className="banner bg-leaf justify-center">
            <svg className="ic ic-sm shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span>Back online</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
