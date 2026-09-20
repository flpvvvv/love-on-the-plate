"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useScrollToTop } from "@/lib/hooks"

/**
 * Floating "scroll to top" button that fades in after scrolling past a threshold.
 * Positioned above the BottomNav on mobile.
 */
export function ScrollToTop() {
  const { visible, scrollToTop } = useScrollToTop({ threshold: 600 })

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.14, ease: [0.2, 0.9, 0.3, 1] }}
          onClick={scrollToTop}
          className="icon-btn sh-tomato fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 cursor-pointer"
          aria-label="Scroll to top"
        >
          <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20V5" />
            <path d="m5.5 11.5 6.5-6.5 6.5 6.5" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
