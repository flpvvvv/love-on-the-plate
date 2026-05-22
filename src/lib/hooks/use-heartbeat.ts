"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface HeartbeatOptions {
  duration?: number
}

export function useHeartbeat(options: HeartbeatOptions = {}) {
  const { duration = 1000 } = options
  const [isBeating, setIsBeating] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const trigger = useCallback(() => {
    setIsBeating(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setIsBeating(false), duration)
  }, [duration])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return { isBeating, trigger }
}
