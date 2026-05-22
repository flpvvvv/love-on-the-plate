"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * Tracks browser online/offline status.
 * Returns { isOnline, wasOffline } — wasOffline is true when connection
 * is restored (useful for showing "back online" toasts).
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  const handleOnline = useCallback(() => {
    setIsOnline(true)
    setWasOffline(true)
    // Clear the "was offline" flag after a short display period
    setTimeout(() => setWasOffline(false), 3000)
  }, [])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
  }, [])

  useEffect(() => {
    // Initialize from navigator (void to acknowledge intentional setState in effect)
    void setIsOnline(navigator.onLine)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [handleOnline, handleOffline])

  return { isOnline, wasOffline }
}
