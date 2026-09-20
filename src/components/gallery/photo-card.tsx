"use client"

import { motion, useReducedMotion } from "framer-motion"
import Image from "next/image"
import type { CSSProperties } from "react"
import { formatDate, getDisplayDate } from "@/lib/utils"
import type { PhotoWithUrls } from "@/types"

interface PhotoCardProps {
  photo: PhotoWithUrls
  onClick: () => void
  priority?: boolean
  /** Position in the rendered list — drives the `.badge-no` plate number. */
  index?: number
}

/** Newer than a week is a new plate — the tomato sticker. */
export const NEW_PLATE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

/** Sticker rotations, cycled by position so a board reads hand-stuck. */
const STICKER_TILT = ["-3deg", "2deg", "3deg", "-2deg"]

/** The plate's ordinal in the gallery, zero-padded like the reference. */
export function plateNumber(index: number): string {
  return String(index + 1).padStart(3, "0")
}

/**
 * Portrait 3/4 · landscape 4/3 · square 1/1, from the photo's real pixels.
 * Photos without dimensions keep the `.art` default (5/4).
 */
export function getArtAspect(photo: PhotoWithUrls): CSSProperties | undefined {
  const { width, height } = photo
  if (!width || !height) return undefined
  if (height > width) return { aspectRatio: "3 / 4" }
  if (width > height) return { aspectRatio: "4 / 3" }
  return { aspectRatio: "1 / 1" }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** `date · W×H · size` — the Space Mono caption. Missing fields drop out. */
export function formatCardMeta(photo: PhotoWithUrls): string {
  const parts = [formatDate(getDisplayDate(photo))]
  if (photo.width && photo.height) parts.push(`${photo.width}×${photo.height}`)
  if (photo.file_size) parts.push(formatFileSize(photo.file_size))
  return parts.join(" · ")
}

export function stickerTilt(index: number): CSSProperties {
  return { "--r": STICKER_TILT[index % STICKER_TILT.length] } as CSSProperties
}

export function PhotoCard({ photo, onClick, priority = false, index }: PhotoCardProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.button
      type="button"
      // Opacity only: a transform left inline by Motion would win over `.card`'s
      // CSS press, and the press is the interaction in this language.
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
      onClick={onClick}
      className="card"
    >
      <span className="art" style={getArtAspect(photo)}>
        <Image
          src={photo.thumbnailUrl}
          alt={photo.dish_name || photo.description_en || photo.description_cn || "A homemade meal"}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover"
          priority={priority}
        />
        {photo.ingredients?.[0] && (
          <span className="sticker sticker-leaf st-nw" style={stickerTilt(index ?? 0)}>
            {photo.ingredients[0]}
          </span>
        )}
        {Date.now() - getDisplayDate(photo).getTime() < NEW_PLATE_WINDOW_MS && (
          <span className="sticker sticker-tomato st-ne" style={stickerTilt((index ?? 0) + 1)}>
            NEW
          </span>
        )}
        {index !== undefined && <span className="badge-no">{plateNumber(index)}</span>}
      </span>
      <span className="meta">
        <span className="nm">{photo.dish_name || "Untitled dish"}</span>
        {photo.description_en && <span className="en line-clamp-1">{photo.description_en}</span>}
        <span className="dt">{formatCardMeta(photo)}</span>
      </span>
    </motion.button>
  )
}
