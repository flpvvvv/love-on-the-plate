"use client"

import { motion, useReducedMotion } from "framer-motion"
import Image from "next/image"
import { useMemo } from "react"
import { IngredientTags } from "@/components/ui"
import { formatDate, getDisplayDate, groupByMonthAndDate } from "@/lib/utils"
import type { PhotoWithUrls } from "@/types"

interface LoveTimelineProps {
  photos: PhotoWithUrls[]
  onPhotoClick: (photo: PhotoWithUrls) => void
}

export function LoveTimeline({ photos, onPhotoClick }: LoveTimelineProps) {
  const prefersReducedMotion = useReducedMotion()
  const monthGroups = useMemo(() => groupByMonthAndDate(photos, (p) => getDisplayDate(p)), [photos])

  // Flatten index counter for staggered animations
  let entryIndex = 0

  return (
    <>
      {/* Mobile: Love Diary — time-focused journal layout */}
      <div className="md:hidden px-4 py-5">
        {monthGroups.map((month, monthIdx) => (
          <motion.section
            key={month.monthKey}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: monthIdx * 0.1 }}
            className="mb-8 last:mb-0"
          >
            {/* Month header */}
            <div className="mb-4">
              <h2 className="font-accent text-2xl text-love leading-tight">{month.label}</h2>
              <div className="mt-1.5 border-t border-dashed border-love/25" />
            </div>

            {/* Date groups within month */}
            {month.dates.map((dateGroup) => {
              let groupLocalIndex = 0

              return (
                <div key={dateGroup.dateKey} className="mb-6 last:mb-0">
                  {/* Date subheader with heart bullet */}
                  <motion.div
                    initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 300, damping: 25 }
                    }
                    className="flex items-center gap-2 mb-3"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-3.5 h-3.5 text-love shrink-0"
                      aria-hidden="true"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    <h3 className="font-display text-sm font-semibold text-ink">
                      {dateGroup.label}
                    </h3>
                  </motion.div>

                  {/* Entry rows */}
                  <div className="space-y-1">
                    {dateGroup.items.map((photo) => {
                      const localIdx = groupLocalIndex++
                      const globalIdx = entryIndex++
                      // Above-fold items use `animate` for reliable rendering
                      // after view transitions; below-fold use `whileInView`.
                      const entryAnimation =
                        globalIdx < 12
                          ? { animate: { opacity: 1, y: 0 } }
                          : {
                              whileInView: { opacity: 1, y: 0 },
                              viewport: { once: true, amount: 0.2 },
                            }

                      return (
                        <motion.button
                          key={photo.id}
                          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                          {...entryAnimation}
                          transition={
                            prefersReducedMotion
                              ? { duration: 0 }
                              : {
                                  type: "spring",
                                  stiffness: 280,
                                  damping: 24,
                                  delay: Math.min(localIdx * 0.05, 0.25),
                                }
                          }
                          onClick={() => onPhotoClick(photo)}
                          className="photo-grid-item-mobile w-full flex items-center gap-3 p-2 -mx-2 rounded-xl text-left focus:outline-none focus-ring hover:bg-canvas-elevated active:bg-canvas-elevated transition-colors duration-150 cursor-pointer"
                        >
                          {/* Small thumbnail */}
                          <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-canvas-recessed">
                            <Image
                              src={photo.thumbnailUrl}
                              alt={
                                photo.dish_name ||
                                photo.description_en ||
                                photo.description_cn ||
                                "A homemade meal"
                              }
                              fill
                              sizes="56px"
                              className="object-cover"
                              priority={globalIdx < 4}
                            />
                          </div>

                          {/* Text content */}
                          <div className="flex-1 min-w-0 py-0.5">
                            {photo.dish_name ? (
                              <p className="font-body font-semibold text-sm text-ink line-clamp-1">
                                {photo.dish_name}
                              </p>
                            ) : (
                              <p className="font-body text-sm text-ink-tertiary italic">
                                Untitled dish
                              </p>
                            )}
                            {photo.description_cn && (
                              <p className="text-[13px] leading-snug text-ink-secondary line-clamp-2 mt-0.5">
                                {photo.description_cn}
                              </p>
                            )}
                            {photo.ingredients && photo.ingredients.length > 0 && (
                              <div className="mt-1">
                                <IngredientTags ingredients={photo.ingredients} max={2} compact />
                              </div>
                            )}
                          </div>

                          {/* Chevron */}
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            className="w-4 h-4 text-ink-tertiary shrink-0"
                            aria-hidden="true"
                          >
                            <path
                              d="M8.25 4.5l7.5 7.5-7.5 7.5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </motion.section>
        ))}
      </div>

      {/* Desktop: Alternating timeline */}
      <div className="hidden md:block relative max-w-3xl mx-auto px-4 py-8">
        {/* Timeline line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-love/20 transform -translate-x-1/2" />

        {photos.map((photo, index) => {
          const isLeft = index % 2 === 0
          // Above-fold items use `animate` for reliable rendering after view
          // transitions; below-fold items use `whileInView` for scroll entrance.
          const entryAnimation =
            index < 12
              ? { animate: { opacity: 1, x: 0 } }
              : { whileInView: { opacity: 1, x: 0 }, viewport: { once: true, amount: 0.15 } }

          return (
            <motion.div
              key={photo.id}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: isLeft ? -30 : 30 }}
              {...entryAnimation}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 260, damping: 24 }
              }
              className={`photo-grid-item relative flex items-center mb-12 ${
                isLeft ? "flex-row" : "flex-row-reverse"
              }`}
            >
              {/* Content */}
              <button
                onClick={() => onPhotoClick(photo)}
                className={`w-5/12 focus:outline-none focus-ring rounded-xl cursor-pointer ${
                  isLeft ? "pr-8 text-right" : "pl-8 text-left"
                }`}
              >
                <motion.div
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                  className="bg-canvas-elevated border border-stroke rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={photo.thumbnailUrl}
                      alt={
                        photo.dish_name ||
                        photo.description_en ||
                        photo.description_cn ||
                        "A homemade meal"
                      }
                      fill
                      sizes="40vw"
                      className="object-cover"
                      priority={index < 3}
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-caption text-ink-tertiary mb-1">
                      {formatDate(getDisplayDate(photo))}
                    </p>
                    {photo.dish_name && (
                      <p className="font-medium text-ink mb-2 line-clamp-1">{photo.dish_name}</p>
                    )}
                    {photo.description_cn && (
                      <p className="text-caption text-ink-secondary line-clamp-2">
                        {photo.description_cn}
                      </p>
                    )}
                    {photo.ingredients && photo.ingredients.length > 0 && (
                      <div className="mt-2">
                        <IngredientTags ingredients={photo.ingredients} max={2} compact />
                      </div>
                    )}
                  </div>
                </motion.div>
              </button>

              {/* Heart marker */}
              <div className="absolute left-1/2 transform -translate-x-1/2 z-10">
                <motion.div
                  initial={prefersReducedMotion ? { scale: 1 } : { scale: 0 }}
                  {...(index < 12
                    ? { animate: { scale: 1 } }
                    : { whileInView: { scale: 1 }, viewport: { once: true } })}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 400, damping: 20, delay: 0.15 }
                  }
                  className="w-8 h-8 bg-love rounded-full flex items-center justify-center shadow-lg"
                >
                  <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4" aria-hidden="true">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </motion.div>
              </div>

              {/* Empty space for opposite side */}
              <div className="w-5/12" />
            </motion.div>
          )
        })}
      </div>
    </>
  )
}
