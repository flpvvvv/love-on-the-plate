"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_PREFIX = "lotp:gesture-seen:"

interface UseGestureHintOptions {
  /** Delay before showing the hint (ms) */
  delay?: number
  /** How long the hint stays visible (ms) */
  duration?: number
}

/**
 * Shows a one-time gesture hint that auto-dismisses and remembers
 * via localStorage so it never appears again.
 */
export function useGestureHint(
  key: string,
  { delay = 1000, duration = 3500 }: UseGestureHintOptions = {}
) {
  const [showHint, setShowHint] = useState(false)
  const storageKey = `${STORAGE_PREFIX}${key}`

  useEffect(() => {
    if (typeof window === "undefined") return
    if (localStorage.getItem(storageKey)) return

    const showTimer = setTimeout(() => setShowHint(true), delay)
    const hideTimer = setTimeout(() => {
      setShowHint(false)
      localStorage.setItem(storageKey, "1")
    }, delay + duration)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [storageKey, delay, duration])

  const dismiss = useCallback(() => {
    setShowHint(false)
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, "1")
    }
  }, [storageKey])

  return { showHint, dismiss }
}
