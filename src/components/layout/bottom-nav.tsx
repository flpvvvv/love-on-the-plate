"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { AnalyticsIcon, GalleryIcon, UploadIcon } from "@/components/ui"
import { useHaptics, useIOSSafeBottom } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import type { MobileTab } from "@/types"

interface BottomNavProps {
  currentTab: MobileTab
  onTabChange: (tab: MobileTab) => void
}

const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "feed",
    label: "Feed",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M3 15l5-5 4 4 4-6 5 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "browse",
    label: "Browse",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "analytics",
    label: "Stats",
    icon: <AnalyticsIcon className="w-6 h-6" />,
  },
  {
    id: "upload",
    label: "Upload",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 12.75v3.75m0 0-1.5-1.5m1.5 1.5 1.5-1.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
]

export function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isHome = pathname === "/"
  const isAnalytics = pathname.startsWith("/analytics")
  const isAdmin = pathname.startsWith("/admin")
  const { vibrate } = useHaptics()

  // Track iOS Safari dynamic toolbar to prevent it from overlapping the nav
  useIOSSafeBottom()

  // Feed mode used to auto-hide the bar based on window scroll, but ImmersiveFeed
  // scrolls an internal container — window.scrollY does not follow finger swipes.
  // iOS can still emit window scroll / viewport shifts, which set "scroll down" and
  // translated the nav off-screen (y:100) with no way to recover. Hide must be
  // driven by the feed container if we reintroduce it.

  // If we're on the admin page, use a simple nav
  if (!isHome) {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom overscroll-contain"
        aria-label="Site navigation"
      >
        <div className="absolute inset-0 glass border-t border-stroke" />
        <div className="relative flex items-center justify-around h-16 px-2">
          <Link
            href="/"
            className={cn(
              "relative flex flex-col items-center justify-center w-20 h-14 rounded-xl transition-colors focus-ring cursor-pointer",
              !isAnalytics && !isAdmin ? "text-love" : "text-ink-tertiary hover:text-ink-secondary"
            )}
          >
            {!isAnalytics && !isAdmin && (
              <motion.div
                layoutId="secondaryNavTab"
                className="absolute inset-1 bg-love-soft rounded-xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">
              <GalleryIcon className="w-6 h-6" />
            </span>
            <span className="text-micro mt-0.5">Gallery</span>
          </Link>
          <Link
            href="/analytics"
            className={cn(
              "relative flex flex-col items-center justify-center w-20 h-14 rounded-xl transition-colors focus-ring cursor-pointer",
              isAnalytics ? "text-love" : "text-ink-tertiary hover:text-ink-secondary"
            )}
          >
            {isAnalytics && (
              <motion.div
                layoutId="secondaryNavTab"
                className="absolute inset-1 bg-love-soft rounded-xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">
              <AnalyticsIcon className="w-6 h-6" />
            </span>
            <span className="text-micro mt-0.5">Analytics</span>
          </Link>
          <Link
            href="/admin"
            className={cn(
              "relative flex flex-col items-center justify-center w-20 h-14 rounded-xl transition-colors focus-ring cursor-pointer",
              isAdmin ? "text-love" : "text-ink-tertiary hover:text-ink-secondary"
            )}
          >
            {isAdmin && (
              <motion.div
                layoutId="secondaryNavTab"
                className="absolute inset-1 bg-love-soft rounded-xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">
              <UploadIcon className="w-6 h-6" />
            </span>
            <span className="relative z-10 text-micro mt-0.5">Upload</span>
          </Link>
        </div>
      </nav>
    )
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom overscroll-contain"
      aria-label="Main navigation"
    >
      {/* Glass background */}
      <div className="absolute inset-0 glass border-t border-stroke" />

      <div className="relative flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === "upload") {
                  // Save scroll position so it can be restored when the user returns
                  try {
                    sessionStorage.setItem("lotp-v1:scroll-y", String(window.scrollY))
                    sessionStorage.setItem("lotp-v1:scroll-tab", currentTab)
                  } catch {
                    /* sessionStorage may be full or disabled */
                  }
                  router.push("/admin")
                  return
                }
                vibrate("light")
                onTabChange(tab.id)
              }}
              className={cn(
                "relative flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors cursor-pointer focus-ring",
                isActive ? "text-love" : "text-ink-tertiary active:text-ink-secondary"
              )}
              aria-label={tab.label}
            >
              {isActive && (
                <motion.div
                  layoutId="homeNavTab"
                  className="absolute inset-1 bg-love-soft rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span className="relative z-10 text-micro mt-0.5">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
