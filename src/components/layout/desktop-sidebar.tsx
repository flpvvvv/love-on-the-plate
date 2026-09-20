"use client"

import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  AnalyticsIcon,
  GalleryIcon,
  GridIcon,
  PlatesIcon,
  ThemeToggle,
  TimelineIcon,
  UploadIcon,
} from "@/components/ui"
import { cn } from "@/lib/utils"
import type { GalleryView, MobileTab } from "@/types"
import { useGalleryContext } from "./app-shell"

const galleryViews: { id: GalleryView; label: string; icon: React.ReactNode }[] = [
  { id: "floating", label: "Plates", icon: <PlatesIcon className="ic" /> },
  { id: "masonry", label: "Grid", icon: <GridIcon className="ic" /> },
  { id: "timeline", label: "Timeline", icon: <TimelineIcon className="ic" /> },
]

export function DesktopSidebar() {
  const pathname = usePathname()
  const isHome = pathname === "/"
  const isAdmin = pathname.startsWith("/admin")
  const { mobileTab, setMobileTab, galleryView, setGalleryView } = useGalleryContext()
  const [collapsed, setCollapsed] = useState(false)

  // On the home page, Gallery/Analytics are inline tabs; otherwise fall back to pathname
  const isGalleryActive = isHome && mobileTab !== "analytics"
  const isAnalyticsActive = isHome && mobileTab === "analytics"

  const handleSectionChange = (tab: MobileTab) => {
    if (!isHome) {
      // If we're on another page (e.g. /admin), navigate home first
      window.location.href = "/"
      return
    }
    setMobileTab(tab)
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 border-r-[2.5px] border-ink bg-canvas transition-all z-40 shrink-0",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b-[2.5px] border-ink shrink-0">
        <Link href="/" className="flex items-center gap-2.5 min-w-0 min-h-11 focus-ring">
          <span className="brand-mark">
            <Image src="/logo.svg" alt="Love on the Plate" width={22} height={22} />
          </span>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex flex-col overflow-hidden"
              >
                <span className="brand-name whitespace-nowrap">Love on the Plate</span>
                <span className="brand-sub whitespace-nowrap">Happy wife, happy life</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2.5 p-3 overflow-y-auto" aria-label="Sections">
        {/* Main nav items */}
        <SidebarButton
          active={isGalleryActive}
          collapsed={collapsed}
          icon={<GalleryIcon className="ic" />}
          label="Gallery"
          onClick={() => handleSectionChange("browse")}
        />
        <SidebarButton
          active={isAnalyticsActive}
          collapsed={collapsed}
          icon={<AnalyticsIcon className="ic" />}
          label="Analytics"
          onClick={() => handleSectionChange("analytics")}
        />
        <SidebarLink
          href="/admin"
          active={isAdmin}
          collapsed={collapsed}
          icon={<UploadIcon className="ic" />}
          label="Upload"
        />

        {/* View switcher section -- only when gallery is active */}
        {isGalleryActive && (
          <>
            <div className="pt-4 pb-2">
              {!collapsed && <p className="label muted px-1">View</p>}
              {collapsed && <div className="border-t-[2.5px] border-ink mx-2" />}
            </div>
            {galleryViews.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => setGalleryView(view.id)}
                aria-current={galleryView === view.id ? "true" : "false"}
                className={cn("navbtn w-full justify-start", collapsed && "justify-center px-0")}
              >
                <span className="shrink-0">{view.icon}</span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {view.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t-[2.5px] border-ink space-y-2 shrink-0">
        <div
          className={cn("flex items-center gap-2", collapsed ? "flex-col" : "justify-between px-2")}
        >
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="icon-btn icon-btn-bare"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <motion.span
              className="flex"
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.14, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <svg className="ic" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M15 19l-7-7 7-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                />
              </svg>
            </motion.span>
          </button>
        </div>
        {!collapsed && (
          <p className="text-center muted text-[0.68rem] py-1 whitespace-nowrap">Made with love</p>
        )}
      </div>
    </aside>
  )
}

function SidebarButton({
  active,
  collapsed,
  icon,
  label,
  onClick,
}: {
  active: boolean
  collapsed: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : "false"}
      className={cn("navbtn w-full justify-start", collapsed && "justify-center px-0")}
    >
      <span className="shrink-0">{icon}</span>
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="whitespace-nowrap overflow-hidden"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

function SidebarLink({
  href,
  active,
  collapsed,
  icon,
  label,
}: {
  href: string
  active: boolean
  collapsed: boolean
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : "false"}
      className={cn("navbtn w-full justify-start", collapsed && "justify-center px-0")}
    >
      <span className="shrink-0">{icon}</span>
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="whitespace-nowrap overflow-hidden"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  )
}
