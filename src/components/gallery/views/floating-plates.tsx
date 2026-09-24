"use client"

import { motion, useReducedMotion } from "framer-motion"
import Image from "next/image"
import { formatDate, getDisplayDate } from "@/lib/utils"
import type { PhotoWithUrls } from "@/types"
import { stickerTilt } from "../photo-card"

interface FloatingPlatesProps {
  photos: PhotoWithUrls[]
  onPhotoClick: (photo: PhotoWithUrls) => void
}

/**
 * One 2×2 hero leads, then a [1×1, 1×1, 2×1] unit repeats — a four-column board
 * with no holes; the tail row is allowed to run ragged.
 */
function bentoTileClass(index: number): string {
  if (index === 0) return "card w2 t-hero photo-grid-item"
  const wide = (index - 1) % 3 === 2 ? " w2" : ""
  return `card photo-grid-item${wide}`
}

export function FloatingPlates({ photos, onPhotoClick }: FloatingPlatesProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="bento">
      {photos.map((photo, index) => {
        // Above-fold items use `animate` for reliable rendering after view
        // transitions; below-fold items use `whileInView` for scroll entrance.
        const targetState = { opacity: 1 }
        const entryAnimation =
          index < 12
            ? { animate: targetState }
            : { whileInView: targetState, viewport: { once: true, amount: 0.15 } }

        return (
          <motion.button
            key={photo.id}
            type="button"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            {...entryAnimation}
            transition={
              prefersReducedMotion ? { duration: 0 } : { duration: 0.2, delay: (index % 4) * 0.05 }
            }
            onClick={() => onPhotoClick(photo)}
            className={bentoTileClass(index)}
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
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover"
                priority={index < 4}
              />
              {photo.ingredients?.[0] && (
                <span className="sticker sticker-leaf st-nw" style={stickerTilt(index)}>
                  {photo.ingredients[0]}
                </span>
              )}
            </span>

            <span className="meta">
              <span className="nm">{photo.dish_name || "Untitled dish"}</span>
              {photo.description_en && (
                <span className="en line-clamp-1">{photo.description_en}</span>
              )}
              <span className="dt">{formatDate(getDisplayDate(photo))}</span>
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
