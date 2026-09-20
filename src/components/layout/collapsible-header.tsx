"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ThemeToggle } from "@/components/ui"

export function CollapsibleHeader() {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCollapsed(!entry.isIntersecting)
      },
      { threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* Sentinel -- when this scrolls out of view, header collapses */}
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

      {/* Large title region (visible when at top) */}
      <motion.div
        animate={{
          height: collapsed ? 0 : "auto",
          opacity: collapsed ? 0 : 1,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="overflow-hidden bg-canvas md:hidden"
      >
        <div className="px-5 pt-4 pb-1">
          <div className="flex items-center gap-2.5 mb-0.5">
            <span className="brand-mark">
              <Image src="/logo.svg" alt="" width={22} height={22} />
            </span>
            <h1 className="text-xl">Love on the Plate</h1>
          </div>
          <p className="brand-sub whitespace-nowrap pl-[44px]">Happy wife, happy life</p>
        </div>
      </motion.div>

      {/* Compact header bar (sticky, shown when collapsed -- fixed position to avoid taking flow space) */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-40 md:hidden"
        animate={{
          y: collapsed ? 0 : -56,
          opacity: collapsed ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        style={{ pointerEvents: collapsed ? "auto" : "none" }}
      >
        <div className="bg-canvas border-b-[2.5px] border-ink">
          <div className="px-4 h-14 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5 min-w-0 min-h-11 focus-ring">
              <span className="brand-mark">
                <Image src="/logo.svg" alt="Love on the Plate" width={22} height={22} />
              </span>
              <span className="brand-name truncate">Love on the Plate</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </motion.header>
    </>
  )
}
