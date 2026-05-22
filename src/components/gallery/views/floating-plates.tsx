"use client"

import { motion, useReducedMotion } from "framer-motion"
import Image from "next/image"
import { formatDate, getDisplayDate } from "@/lib/utils"
import type { PhotoWithUrls } from "@/types"

interface FloatingPlatesProps {
  photos: PhotoWithUrls[]
  onPhotoClick: (photo: PhotoWithUrls) => void
}

const PLATE_ROTATION = -3 // subtle consistent tilt for all plates
const PLATE_SCALE = 1

function getPlateStyle() {
  return { rotation: PLATE_ROTATION, scale: PLATE_SCALE }
}

export function FloatingPlates({ photos, onPhotoClick }: FloatingPlatesProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 p-4">
      {photos.map((photo, index) => {
        const { rotation, scale } = getPlateStyle()
        // Row-relative stagger: 2-col mobile, 3-col tablet, 4-col desktop
        // We approximate with mod-4 which covers the widest layout
        const colPosition = index % 4

        // Above-fold items use `animate` for reliable rendering after view
        // transitions; below-fold items use `whileInView` for scroll entrance.
        const targetState = prefersReducedMotion
          ? { opacity: 1 }
          : { opacity: 1, scale: scale, rotate: rotation }
        const entryAnimation =
          index < 12
            ? { animate: targetState }
            : { whileInView: targetState, viewport: { once: true, amount: 0.15 } }

        return (
          <motion.button
            key={photo.id}
            initial={
              prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.75, rotate: rotation }
            }
            {...entryAnimation}
            whileHover={
              prefersReducedMotion
                ? undefined
                : {
                    scale: 1.08,
                    rotate: 0,
                    zIndex: 10,
                    transition: { type: "spring", stiffness: 400, damping: 20 },
                  }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 280, damping: 22, delay: colPosition * 0.05 }
            }
            onClick={() => onPhotoClick(photo)}
            className="photo-grid-item relative focus:outline-none focus-ring rounded-2xl flex flex-col items-center group cursor-pointer"
          >
            {/* Plate container */}
            <div className="relative aspect-square w-full">
              {/* Plate ground shadow — lighter on small light screens (less muddy); full depth on dark + desktop */}
              <div className="absolute -inset-1 rounded-full transform bg-black/[0.03] blur-md translate-y-1.5 md:bg-black/5 md:blur-lg md:translate-y-2 dark:bg-black/20 dark:blur-lg dark:translate-y-2" />

              {/* Plate rim — soft lift on mobile, stronger from md up (matches original desktop) */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-canvas-elevated to-canvas p-1.5 shadow-sm md:shadow-md ring-1 ring-stroke/10">
                {/* Inner plate ring */}
                <div className="absolute inset-3 rounded-full border border-stroke/30" />

                {/* Food image */}
                <div className="relative w-full h-full rounded-full overflow-hidden">
                  <Image
                    src={photo.thumbnailUrl}
                    alt={
                      photo.dish_name ||
                      photo.description_en ||
                      photo.description_cn ||
                      "A homemade meal"
                    }
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                    priority={index < 4}
                  />
                </div>
              </div>

              {/* Hover/focus overlay with description — desktop only */}
              <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm opacity-0 md:group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200">
                {(photo.dish_name || photo.description_cn || photo.description_en) && (
                  <div className="text-white text-center px-4">
                    {photo.dish_name && <p className="font-medium mb-1">{photo.dish_name}</p>}
                    {photo.description_cn && (
                      <p className="text-caption line-clamp-2 text-white/90">
                        {photo.description_cn}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Dish name + description below plate */}
            <div className="mt-3 text-center">
              {photo.dish_name && (
                <p className="font-medium text-ink line-clamp-1">{photo.dish_name}</p>
              )}
              {/* Description visible on mobile since hover overlay is hidden */}
              {photo.description_cn && (
                <p className="text-caption text-ink-secondary mt-0.5 line-clamp-1 md:hidden">
                  {photo.description_cn}
                </p>
              )}
              <p className="text-caption text-ink-tertiary mt-0.5">
                {formatDate(getDisplayDate(photo))}
              </p>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
