"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { PhotoWithUrls } from "@/types"
import { PhotoCard } from "../photo-card"

interface MasonryGridProps {
  photos: PhotoWithUrls[]
  onPhotoClick: (photo: PhotoWithUrls) => void
}

interface NumberedPhoto {
  photo: PhotoWithUrls
  ordinal: number
}

export function MasonryGrid({ photos, onPhotoClick }: MasonryGridProps) {
  const prefersReducedMotion = useReducedMotion()

  // Carry the gallery ordinal through the chunking so each card's stickers keep
  // their true position's tilt, not a column-relative one.
  const numbered: NumberedPhoto[] = photos.map((photo, ordinal) => ({ photo, ordinal }))

  const getColumnPhotos = (columnCount: number) => {
    const cols: NumberedPhoto[][] = Array.from({ length: columnCount }, () => [])
    numbered.forEach((entry, index) => {
      cols[index % columnCount].push(entry)
    })
    return cols
  }

  const twoColumnPhotos = getColumnPhotos(2)
  const threeColumnPhotos = getColumnPhotos(3)

  return (
    <>
      {/* Mobile: 2-column sticker sheet */}
      <div className="grid grid-cols-2 gap-4 p-4 sm:hidden">
        {photos.map((photo, index) => {
          // Above-fold items use `animate` for reliable rendering after view
          // transitions; below-fold items use `whileInView` for scroll entrance.
          const targetState = { opacity: 1 }
          const entryAnimation =
            index < 12
              ? { animate: targetState }
              : { whileInView: targetState, viewport: { once: true, amount: 0.15 } }

          return (
            <motion.div
              key={photo.id}
              className="photo-grid-item-mobile"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
              {...entryAnimation}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 0.2, delay: (index % 2) * 0.06 }
              }
            >
              <PhotoCard
                photo={photo}
                index={index}
                onClick={() => onPhotoClick(photo)}
                priority={index < 4}
              />
            </motion.div>
          )
        })}
      </div>

      {/* Tablet: 2 columns masonry */}
      <div className="hidden sm:grid lg:hidden grid-cols-2 gap-4 p-4">
        {twoColumnPhotos.map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-4">
            {column.map(({ photo, ordinal }, photoIndex) => {
              const targetState = { opacity: 1 }
              const entryAnimation =
                ordinal < 12
                  ? { animate: targetState }
                  : { whileInView: targetState, viewport: { once: true, amount: 0.1 } }

              return (
                <motion.div
                  key={photo.id}
                  className="photo-grid-item"
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                  {...entryAnimation}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { duration: 0.2, delay: colIndex * 0.06 }
                  }
                >
                  <PhotoCard
                    photo={photo}
                    index={ordinal}
                    onClick={() => onPhotoClick(photo)}
                    priority={colIndex === 0 && photoIndex === 0}
                  />
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Desktop: 3 columns masonry */}
      <div className="hidden lg:grid grid-cols-3 gap-4 p-4">
        {threeColumnPhotos.map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-4">
            {column.map(({ photo, ordinal }, photoIndex) => {
              const targetState = { opacity: 1 }
              const entryAnimation =
                ordinal < 12
                  ? { animate: targetState }
                  : { whileInView: targetState, viewport: { once: true, amount: 0.1 } }

              return (
                <motion.div
                  key={photo.id}
                  className="photo-grid-item"
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                  {...entryAnimation}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { duration: 0.2, delay: colIndex * 0.05 }
                  }
                >
                  <PhotoCard
                    photo={photo}
                    index={ordinal}
                    onClick={() => onPhotoClick(photo)}
                    priority={colIndex === 0 && photoIndex === 0}
                  />
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}
