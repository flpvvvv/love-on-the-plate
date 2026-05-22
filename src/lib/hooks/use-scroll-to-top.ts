"use client"

import { useCallback, useEffect, useState } from "react"

interface UseScrollToTopOptions {
  /** Scroll distance (px) before the button appears */
  threshold?: number
}

/**
 * Returns visibility state and a handler for a "scroll to top" button.
 * Listens on `window` scroll.
 */
export function useScrollToTop({ threshold = 500 }: UseScrollToTopOptions = {}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setVisible(window.scrollY > threshold)
        ticking = false
      })
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [threshold])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  return { visible, scrollToTop }
}
