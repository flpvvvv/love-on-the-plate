"use client"

import { motion, useReducedMotion } from "framer-motion"
import Image from "next/image"
import { useMemo } from "react"
import { getDisplayDate, groupByMonthAndDate } from "@/lib/utils"
import type { PhotoWithUrls } from "@/types"
import { formatCardMeta } from "../photo-card"

interface LoveTimelineProps {
  photos: PhotoWithUrls[]
  onPhotoClick: (photo: PhotoWithUrls) => void
}

export function LoveTimeline({ photos, onPhotoClick }: LoveTimelineProps) {
  const prefersReducedMotion = useReducedMotion()
  const monthGroups = useMemo(() => groupByMonthAndDate(photos, (p) => getDisplayDate(p)), [photos])

  // Flattened counter for staggered animations across every month
  let entryIndex = 0

  return (
    <div className="mx-auto max-w-3xl px-4 py-5">
      {monthGroups.map((month) => {
        return (
          <section key={month.monthKey} className="mb-5 last:mb-0">
            <h3 className="month-head">
              <span className="mn">{month.monthKey.slice(5)}</span>
              {month.label}
            </h3>

            {month.dates.map((dateGroup) => (
              <div key={dateGroup.dateKey} className="tl-day-group">
                <h4 className="tl-day">{dateGroup.label}</h4>

                <div className="tl-rows">
                  {dateGroup.items.map((photo) => {
                    const globalIdx = entryIndex++
                    // Above-fold items use `animate` for reliable rendering after
                    // view transitions; below-fold use `whileInView`.
                    const entryAnimation =
                      globalIdx < 12
                        ? { animate: { opacity: 1 } }
                        : {
                            whileInView: { opacity: 1 },
                            viewport: { once: true, amount: 0.2 },
                          }

                    return (
                      <motion.button
                        key={photo.id}
                        type="button"
                        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                        {...entryAnimation}
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : { duration: 0.2, delay: Math.min((globalIdx % 4) * 0.05, 0.25) }
                        }
                        onClick={() => onPhotoClick(photo)}
                        className="card trow photo-grid-item overflow-visible"
                      >
                        <span className="art">
                          <Image
                            src={photo.thumbnailUrl}
                            alt={
                              photo.dish_name ||
                              photo.description_en ||
                              photo.description_cn ||
                              "A homemade meal"
                            }
                            fill
                            sizes="96px"
                            className="object-cover"
                            priority={globalIdx < 4}
                          />
                        </span>

                        <span className="meta flex-1 min-w-0">
                          <span className="nm">{photo.dish_name || "Untitled dish"}</span>
                          {photo.description_en && (
                            <span className="en line-clamp-1">{photo.description_en}</span>
                          )}
                          <span className="dt">{formatCardMeta(photo)}</span>
                          {photo.description_cn && (
                            <span className="desc line-clamp-2">{photo.description_cn}</span>
                          )}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
