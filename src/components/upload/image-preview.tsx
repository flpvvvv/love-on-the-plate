"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { useEffect, useMemo } from "react"
import { Button } from "@/components/ui"

interface ImagePreviewProps {
  file: File
  dishName: string
  descriptionEn: string
  descriptionCn: string
  onDishNameChange: (dishName: string) => void
  onDescriptionEnChange: (description: string) => void
  onDescriptionCnChange: (description: string) => void
  onRegenerateDescription: () => void
  onRegenerateDescriptionsOnly: () => void
  onUpload: () => void
  onCancel: () => void
  uploading: boolean
  regenerating: boolean
  regeneratingDescOnly: boolean
}

export function ImagePreview({
  file,
  dishName,
  descriptionEn,
  descriptionCn,
  onDishNameChange,
  onDescriptionEnChange,
  onDescriptionCnChange,
  onRegenerateDescription,
  onRegenerateDescriptionsOnly,
  onUpload,
  onCancel,
  uploading,
  regenerating,
  regeneratingDescOnly,
}: ImagePreviewProps) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file])

  // Clean up object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-canvas-elevated border border-stroke rounded-2xl overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-black">
        {previewUrl && (
          <Image
            src={previewUrl}
            alt="Preview"
            fill
            className="object-contain"
            unoptimized // Use original blob URL
          />
        )}
      </div>

      {/* Descriptions */}
      <div className="p-6 space-y-4">
        {/* Regenerate button */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerateDescription}
            disabled={regenerating || uploading}
            loading={regenerating}
          >
            <svg
              className="w-4 h-4 mr-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Regenerate All
          </Button>
        </div>

        {/* Dish Name */}
        <div>
          <label htmlFor="dishName" className="block text-caption font-medium text-ink mb-2">
            菜名 / Dish Name
          </label>
          <div className="flex gap-2">
            <input
              id="dishName"
              type="text"
              value={dishName}
              onChange={(e) => onDishNameChange(e.target.value)}
              placeholder="AI 正在识别菜名…"
              disabled={uploading}
              autoComplete="off"
              className="flex-1 px-4 py-3 bg-canvas border border-stroke rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-love text-ink placeholder:text-ink-tertiary"
            />
            <button
              type="button"
              onClick={onRegenerateDescriptionsOnly}
              disabled={regenerating || regeneratingDescOnly || uploading || !dishName.trim()}
              title="Regenerate descriptions based on this dish name"
              aria-label="Regenerate descriptions based on this dish name"
              className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl border border-stroke bg-canvas text-ink-secondary hover:text-love hover:border-love-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-ink-secondary disabled:hover:border-stroke focus:outline-none focus-visible:ring-2 focus-visible:ring-love"
            >
              {regeneratingDescOnly ? (
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              )}
            </button>
          </div>
          {dishName.trim() && !regenerating && !regeneratingDescOnly && (
            <p className="text-xs text-ink-tertiary mt-1.5">
              Edit the name, then tap the refresh button to regenerate descriptions
            </p>
          )}
        </div>

        {/* Chinese Description */}
        <div>
          <label htmlFor="descriptionCn" className="block text-caption font-medium text-ink mb-2">
            中文描述
          </label>
          <textarea
            id="descriptionCn"
            value={descriptionCn}
            onChange={(e) => onDescriptionCnChange(e.target.value)}
            placeholder="AI 正在生成中文描述…"
            rows={3}
            disabled={uploading || regeneratingDescOnly}
            autoComplete="off"
            className={`w-full px-4 py-3 bg-canvas border border-stroke rounded-xl resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-love text-ink placeholder:text-ink-tertiary leading-relaxed${regeneratingDescOnly ? " animate-pulse" : ""}`}
          />
        </div>

        {/* English Description */}
        <div>
          <label htmlFor="descriptionEn" className="block text-caption font-medium text-ink mb-2">
            English Description
          </label>
          <textarea
            id="descriptionEn"
            value={descriptionEn}
            onChange={(e) => onDescriptionEnChange(e.target.value)}
            placeholder="AI is generating an English description…"
            rows={3}
            disabled={uploading || regeneratingDescOnly}
            autoComplete="off"
            className={`w-full px-4 py-3 bg-canvas border border-stroke rounded-xl resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-love text-ink placeholder:text-ink-tertiary leading-relaxed${regeneratingDescOnly ? " animate-pulse" : ""}`}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={uploading} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onUpload} loading={uploading} disabled={uploading} className="flex-1">
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
