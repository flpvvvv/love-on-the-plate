"use client"

import { AnimatePresence, motion } from "framer-motion"
import { type ChangeEvent, type DragEvent, useCallback, useState } from "react"
import { cn } from "@/lib/utils"

interface UploadZoneProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

export function UploadZone({ onFileSelect, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const file = e.dataTransfer.files[0]
      if (file?.type.startsWith("image/")) {
        onFileSelect(file)
      }
    },
    [disabled, onFileSelect]
  )

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        onFileSelect(file)
      }
      // Reset input so same file can be selected again
      e.target.value = ""
    },
    [onFileSelect]
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-dragging={isDragging}
      className={cn("upzone", disabled && "opacity-50 pointer-events-none")}
    >
      <AnimatePresence mode="wait">
        {isDragging ? (
          <motion.div
            key="dragging"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <span className="uz-icon bg-ink text-canvas">
              <svg className="ic" aria-hidden="true">
                <path
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                />
              </svg>
            </span>
            <h3 className="uz-title display">Drop your photo here</h3>
            <p className="uz-help">
              Supports JPEG, PNG, WebP, HEIC • Images will be compressed automatically
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <span className="uz-icon">
              <svg className="ic" aria-hidden="true">
                <path
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                />
              </svg>
            </span>

            <h3 className="uz-title display">Upload a photo</h3>
            <p className="uz-help">
              Supports JPEG, PNG, WebP, HEIC • Images will be compressed automatically
            </p>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 justify-center pt-1">
              {/* Camera capture button - primary on mobile */}
              <label className="btn btn-fill">
                <svg className="ic ic-sm" aria-hidden="true">
                  <path
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                  />
                  <path
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
                  />
                </svg>
                <span>Take Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  disabled={disabled}
                  className="hidden"
                />
              </label>

              {/* Choose from gallery button */}
              <label className="btn">
                <svg className="ic ic-sm" aria-hidden="true">
                  <path
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                  />
                </svg>
                <span>Choose from Gallery</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  onChange={handleFileChange}
                  disabled={disabled}
                  className="hidden"
                />
              </label>
            </div>

            {/* Desktop drag and drop hint */}
            <p className="mono muted text-micro pt-1 hidden sm:block">
              or drag and drop an image here
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
