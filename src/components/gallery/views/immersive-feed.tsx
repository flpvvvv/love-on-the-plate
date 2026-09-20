"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import Image from "next/image"
import type { CSSProperties } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { IngredientTags } from "@/components/ui"
import { useGestureHint, useHaptics } from "@/lib/hooks"
import { formatDate, getDisplayDate } from "@/lib/utils"
import type { PhotoWithUrls } from "@/types"

interface ImmersiveFeedProps {
  photos: PhotoWithUrls[]
  onPhotoTap?: (photo: PhotoWithUrls) => void
}

export function ImmersiveFeed({ photos, onPhotoTap }: ImmersiveFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const { vibrate } = useHaptics()
  const lastSnapIndex = useRef(0)
  const prefersReducedMotion = useReducedMotion()

  // Track which photo is snapped into view
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const scrollTop = container.scrollTop
    const itemHeight = container.clientHeight
    const index = Math.round(scrollTop / itemHeight)
    const clampedIndex = Math.max(0, Math.min(index, photos.length - 1))

    if (clampedIndex !== lastSnapIndex.current) {
      lastSnapIndex.current = clampedIndex
      setActiveIndex(clampedIndex)
      vibrate("light")
    }
  }, [photos.length, vibrate])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  // Arrow-key navigation for keyboard accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const container = containerRef.current
      if (!container) return

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()
        const dir = e.key === "ArrowDown" ? 1 : -1
        const newIndex = Math.max(0, Math.min(activeIndex + dir, photos.length - 1))
        if (newIndex !== activeIndex) {
          container.scrollTo({ top: newIndex * container.clientHeight, behavior: "smooth" })
        }
      }
    },
    [activeIndex, photos.length]
  )

  // One-time scroll hint for first-time users (called before early return for hooks rules)
  const { showHint: showScrollHint, dismiss: dismissScrollHint } = useGestureHint("feed-scroll", {
    delay: 1200,
    duration: 3000,
  })

  // Dismiss hint on first scroll
  useEffect(() => {
    if (!showScrollHint || photos.length === 0) return
    const container = containerRef.current
    if (!container) return

    const onScroll = () => dismissScrollHint()
    container.addEventListener("scroll", onScroll, { once: true, passive: true })
    return () => container.removeEventListener("scroll", onScroll)
  }, [showScrollHint, dismissScrollHint, photos.length])

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-4rem)] text-center px-8">
        <div className="w-20 h-20 text-love mb-4">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="square"
              strokeLinejoin="miter"
              d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
            />
            <path
              strokeLinecap="square"
              strokeLinejoin="miter"
              d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
            />
          </svg>
        </div>
        <h3 className="text-display font-display font-semibold text-ink mb-2">No photos yet</h3>
        <p className="text-ink-secondary">Start documenting your culinary journey!</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      role="feed"
      aria-label="Photo feed"
      onKeyDown={handleKeyDown}
      className="h-[calc(100dvh-4rem)] overflow-y-auto overflow-x-hidden snap-y snap-mandatory overscroll-contain outline-none border-x-[2.5px] border-line"
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
    >
      {photos.map((photo, index) => (
        <FeedItem
          key={photo.id}
          photo={photo}
          isActive={index === activeIndex}
          onTap={() => onPhotoTap?.(photo)}
          priority={index <= 1}
          index={index}
          total={photos.length}
          prefersReducedMotion={prefersReducedMotion ?? false}
        />
      ))}

      {/* Spacer to allow last item to snap properly */}
      <div className="h-0 snap-end" />

      {/* Scroll gesture hint — first-time only */}
      <AnimatePresence>
        {showScrollHint && photos.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          >
            <div className="sticker" style={{ "--r": "-2deg" } as CSSProperties}>
              <motion.span
                animate={{ y: [0, 3, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              >
                <svg className="ic ic-sm" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 19V5m0 0l-7 7m7-7l7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                  />
                </svg>
              </motion.span>
              <span>Swipe up to explore</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FeedItem({
  photo,
  isActive,
  onTap,
  priority,
  index,
  total,
  prefersReducedMotion,
}: {
  photo: PhotoWithUrls
  isActive: boolean
  onTap: () => void
  priority: boolean
  index: number
  total: number
  prefersReducedMotion: boolean
}) {
  const animateProps = prefersReducedMotion ? { opacity: 1, y: 0 } : undefined

  return (
    <article
      aria-setsize={total}
      aria-posinset={index + 1}
      aria-label={photo.dish_name || "Photo"}
      className="relative h-[calc(100dvh-4rem)] w-full snap-start snap-always overflow-hidden border-[2.5px] border-line bg-canvas"
    >
      {/* Full-bleed image */}
      <div className="absolute inset-0 bg-canvas-recessed">
        <Image
          src={photo.imageUrl}
          alt={photo.dish_name || photo.description_en || photo.description_cn || "A homemade meal"}
          fill
          sizes="100vw"
          className="object-cover"
          priority={priority}
        />
      </div>

      {/* Caption bar — solid cream, ink top rule */}
      <div className="absolute inset-x-0 bottom-0 z-10 border-t-[2.5px] border-line bg-canvas p-[11px]">
        {/* Dish name */}
        {photo.dish_name && (
          <motion.h2
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={isActive ? { opacity: 1, y: 0 } : (animateProps ?? { opacity: 0, y: 10 })}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 300, damping: 25, delay: 0.1 }
            }
            className="nm text-[1.12rem]"
          >
            {photo.dish_name}
          </motion.h2>
        )}

        {/* English name */}
        {photo.description_en && (
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={isActive ? { opacity: 1, y: 0 } : (animateProps ?? { opacity: 0, y: 10 })}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 300, damping: 25, delay: 0.15 }
            }
            className="en line-clamp-1"
          >
            {photo.description_en}
          </motion.p>
        )}

        {/* Chinese description */}
        {photo.description_cn && (
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={isActive ? { opacity: 1, y: 0 } : (animateProps ?? { opacity: 0, y: 10 })}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 300, damping: 25, delay: 0.2 }
            }
            className="mt-1 text-caption leading-relaxed text-ink-secondary line-clamp-2"
          >
            {photo.description_cn}
          </motion.p>
        )}

        {/* Ingredients tags */}
        {photo.ingredients && photo.ingredients.length > 0 && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={isActive ? { opacity: 1, y: 0 } : (animateProps ?? { opacity: 0, y: 10 })}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 300, damping: 25, delay: 0.25 }
            }
            className="mt-2"
          >
            <IngredientTags ingredients={photo.ingredients} max={3} compact />
          </motion.div>
        )}

        {/* Date + "tap for more" */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={
            isActive ? { opacity: 1 } : prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }
          }
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.3 }}
          className="mt-2 flex items-center justify-between gap-3"
        >
          <span className="dt">{formatDate(getDisplayDate(photo))}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTap()
            }}
            className="chip"
            aria-label={`View details for ${photo.dish_name || "photo"}`}
          >
            <span>Details</span>
            <svg className="ic ic-sm" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
            </svg>
          </button>
        </motion.div>
      </div>

      {/* Index chip */}
      <span className="nb nb-sm nb-ink mono-b absolute right-[10px] top-[10px] z-20 px-2 py-[3px] text-[0.72rem]">
        {index + 1} / {total}
      </span>
    </article>
  )
}
