"use client"

import { motion, useReducedMotion } from "framer-motion"
import Image from "next/image"
import type { PhotoWithUrls } from "@/types"
import { PhotoCard } from "../photo-card"

interface MasonryGridProps {
  photos: PhotoWithUrls[]
  onPhotoClick: (photo: PhotoWithUrls) => void
}

export function MasonryGrid({ photos, onPhotoClick }: MasonryGridProps) {
  const prefersReducedMotion = useReducedMotion()

  // Split photos into columns for masonry effect (tablet/desktop only)
  const getColumnPhotos = (columnCount: number) => {
    const cols: PhotoWithUrls[][] = Array.from({ length: columnCount }, () => [])
    photos.forEach((photo, index) => {
      cols[index % columnCount].push(photo)
    })
    return cols
  }

  const twoColumnPhotos = getColumnPhotos(2)
  const threeColumnPhotos = getColumnPhotos(3)

  return (
    <>
      {/* Mobile: Compact 2-column gallery with portrait cards */}
      <div className="grid grid-cols-2 gap-1.5 p-2 sm:hidden">
        {photos.map((photo, index) => {
          // Above-fold items use `animate` for reliable rendering after view
          // transitions; below-fold items use `whileInView` for scroll entrance.
          const targetState = prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
          const entryAnimation =
            index < 12
              ? { animate: targetState }
              : { whileInView: targetState, viewport: { once: true, amount: 0.15 } }

          return (
            <motion.button
              key={photo.id}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.97 }}
              {...entryAnimation}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : {
                      type: "spring",
                      stiffness: 260,
                      damping: 24,
                      delay: (index % 2) * 0.06,
                    }
              }
              onClick={() => onPhotoClick(photo)}
              className="photo-grid-item-mobile relative focus:outline-none focus-ring rounded-[10px] overflow-hidden group cursor-pointer"
            >
              <div className="relative aspect-[3/4] bg-canvas-recessed">
                <Image
                  src={photo.thumbnailUrl}
                  alt={
                    photo.dish_name ||
                    photo.description_en ||
                    photo.description_cn ||
                    "A homemade meal"
                  }
                  fill
                  sizes="(max-width: 640px) 50vw"
                  className="object-cover"
                  priority={index < 4}
                />
                {/* Gradient overlay with dish name */}
                {photo.dish_name && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pt-10 pb-2.5 px-2.5">
                    <p className="text-white text-[13px] font-semibold leading-tight line-clamp-1 drop-shadow-sm">
                      {photo.dish_name}
                    </p>
                  </div>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Tablet: 2 columns masonry */}
      <div className="hidden sm:grid lg:hidden grid-cols-2 gap-4 p-4">
        {twoColumnPhotos.map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-4">
            {column.map((photo, photoIndex) => {
              const originalIndex = photoIndex * 2 + colIndex
              const targetState = prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
              const entryAnimation =
                originalIndex < 12
                  ? { animate: targetState }
                  : { whileInView: targetState, viewport: { once: true, amount: 0.1 } }

              return (
                <motion.div
                  key={photo.id}
                  className="photo-grid-item"
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                  {...entryAnimation}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : {
                          type: "spring",
                          stiffness: 260,
                          damping: 24,
                          delay: colIndex * 0.06,
                        }
                  }
                >
                  <PhotoCard
                    photo={photo}
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
            {column.map((photo, photoIndex) => {
              const originalIndex = photoIndex * 3 + colIndex
              const targetState = prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
              const entryAnimation =
                originalIndex < 12
                  ? { animate: targetState }
                  : { whileInView: targetState, viewport: { once: true, amount: 0.1 } }

              return (
                <motion.div
                  key={photo.id}
                  className="photo-grid-item"
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                  {...entryAnimation}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : {
                          type: "spring",
                          stiffness: 260,
                          damping: 24,
                          delay: colIndex * 0.05,
                        }
                  }
                >
                  <PhotoCard
                    photo={photo}
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
