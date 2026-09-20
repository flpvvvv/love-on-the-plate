"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

// Simple way to detect if we're on the client
function subscribe() {
  return () => {}
}

function getSnapshot() {
  return true
}

function getServerSnapshot() {
  return false
}

export function ThemeToggle() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const { theme, setTheme } = useTheme()

  if (!mounted) {
    return (
      <button className="icon-btn">
        <span className="sr-only">Toggle theme</span>
      </button>
    )
  }

  return (
    <motion.button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="icon-btn cursor-pointer overflow-hidden"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.span
            key="sun"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.14, ease: [0.2, 0.9, 0.3, 1] }}
            className="flex"
          >
            <svg viewBox="0 0 24 24" className="ic" aria-hidden="true">
              <path d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.14, ease: [0.2, 0.9, 0.3, 1] }}
            className="flex"
          >
            <svg viewBox="0 0 24 24" className="ic" aria-hidden="true">
              <path d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
