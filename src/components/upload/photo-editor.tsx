"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  type CropRect,
  DEFAULT_IMAGE_EDITS,
  FILTER_PRESETS,
  getCropRectForAspect,
  getFilterCss,
  type ImageEdits,
  type ImageRotation,
  isFullCrop,
  loadImage,
  MIN_CROP_SIZE,
  mirrorCropRect,
  normalizeCropRect,
  renderCroppedCanvas,
  renderOrientedCanvas,
} from "@/lib/image-editing"
import { cn } from "@/lib/utils"

const PREVIEW_MAX_DIMENSION = 1600

const ASPECT_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: "自由", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
]

interface PhotoEditorProps {
  file: File
  edits: ImageEdits
  onChange: (edits: ImageEdits) => void
  disabled?: boolean
}

export function PhotoEditor({ file, edits, onChange, disabled }: PhotoEditorProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cropMode, setCropMode] = useState(false)
  const [aspect, setAspect] = useState<number | null>(null)

  const thumbnailUrl = useMemo(() => URL.createObjectURL(file), [file])

  useEffect(() => {
    return () => URL.revokeObjectURL(thumbnailUrl)
  }, [thumbnailUrl])

  useEffect(() => {
    let cancelled = false
    setImage(null)
    setLoadError(null)
    setCropMode(false)
    setAspect(null)

    loadImage(file)
      .then((loaded) => {
        if (!cancelled) setImage(loaded)
      })
      .catch(() => {
        if (!cancelled) setLoadError("无法读取这张图片，请换一张试试。")
      })

    return () => {
      cancelled = true
    }
  }, [file])

  const oriented = useMemo(() => {
    if (!image) return null
    return renderOrientedCanvas(
      image,
      { rotation: edits.rotation, flipH: edits.flipH, flipV: edits.flipV },
      PREVIEW_MAX_DIMENSION
    )
  }, [image, edits.rotation, edits.flipH, edits.flipV])

  const hasEdits =
    edits.filter !== "original" ||
    edits.rotation !== 0 ||
    edits.flipH ||
    edits.flipV ||
    !isFullCrop(edits.crop)

  const rotate = (delta: number) => {
    const rotation = (((edits.rotation + delta) % 360) + 360) % 360
    setAspect(null)
    onChange({ ...edits, rotation: rotation as ImageRotation, crop: null })
  }

  const flip = (axis: "horizontal" | "vertical") => {
    const nextCrop = edits.crop ? mirrorCropRect(edits.crop, axis) : null
    onChange({
      ...edits,
      flipH: axis === "horizontal" ? !edits.flipH : edits.flipH,
      flipV: axis === "vertical" ? !edits.flipV : edits.flipV,
      crop: nextCrop,
    })
  }

  const reset = () => {
    setAspect(null)
    setCropMode(false)
    onChange({ ...DEFAULT_IMAGE_EDITS })
  }

  const selectAspect = (value: number | null) => {
    setAspect(value)
    if (value !== null && oriented) {
      onChange({
        ...edits,
        crop: getCropRectForAspect(oriented.width, oriented.height, value),
      })
    }
  }

  const toggleCropMode = () => {
    if (cropMode) {
      onChange({ ...edits, crop: isFullCrop(edits.crop) ? null : edits.crop })
      setCropMode(false)
      return
    }
    setCropMode(true)
  }

  return (
    <div className="border-b-[2.5px] border-line">
      <div className="flex min-h-[240px] items-center justify-center overflow-hidden bg-wash p-3">
        {loadError ? (
          <p className="muted px-4 py-12 text-center text-caption">{loadError}</p>
        ) : !image || !oriented ? (
          <div className="flex items-center gap-2 px-4 py-12 text-caption" role="status">
            <span
              className="h-4 w-4 animate-spin border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            正在载入图片…
          </div>
        ) : cropMode ? (
          <CropStage
            oriented={oriented}
            crop={edits.crop}
            filter={edits.filter}
            aspect={aspect}
            disabled={disabled}
            onCropChange={(crop) => onChange({ ...edits, crop })}
          />
        ) : (
          <PreviewStage oriented={oriented} crop={edits.crop} filter={edits.filter} />
        )}
      </div>

      <div className="space-y-3 border-t-[2.5px] border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label">美食滤镜 / Food Filters</span>
          <button
            type="button"
            onClick={reset}
            disabled={disabled || !hasEdits}
            className="text-caption font-semibold underline decoration-2 underline-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
          >
            重置全部 / Reset
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {FILTER_PRESETS.map((preset) => {
            const selected = edits.filter === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onChange({ ...edits, filter: preset.id })}
                className={cn(
                  "relative overflow-hidden border-[2.5px] border-line bg-canvas text-left transition-[transform,box-shadow] duration-[140ms] ease-[cubic-bezier(0.2,0.9,0.3,1)]",
                  selected ? "shadow-[3px_3px_0_var(--cobalt)]" : "shadow-[2px_2px_0_var(--sh)]",
                  "disabled:cursor-not-allowed disabled:opacity-45"
                )}
              >
                <span className="relative block aspect-square overflow-hidden border-b-[2.5px] border-line bg-wash">
                  <Image
                    src={thumbnailUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="96px"
                    className="object-cover"
                    style={{ filter: preset.css }}
                  />
                  {preset.recommended && <span className="sticker sticker-cobalt st-ne">推荐</span>}
                  {selected && (
                    <span className="pointer-events-none absolute inset-0 border-[3px] border-cobalt" />
                  )}
                </span>
                <span className="block px-1 py-1.5 text-center font-body text-[0.66rem] font-semibold uppercase tracking-[0.08em]">
                  {preset.labelCn}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="icon-btn"
            onClick={() => rotate(-90)}
            disabled={disabled}
            title="向左旋转 / Rotate left"
            aria-label="向左旋转 90 度"
          >
            <RotateLeftIcon />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => rotate(90)}
            disabled={disabled}
            title="向右旋转 / Rotate right"
            aria-label="向右旋转 90 度"
          >
            <RotateRightIcon />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => flip("horizontal")}
            disabled={disabled}
            title="水平翻转 / Flip horizontal"
            aria-label="水平翻转"
          >
            <FlipHorizontalIcon />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => flip("vertical")}
            disabled={disabled}
            title="垂直翻转 / Flip vertical"
            aria-label="垂直翻转"
          >
            <FlipVerticalIcon />
          </button>
          <button
            type="button"
            className={cn("btn btn-sm gap-2", cropMode && "bg-cobalt text-on-cobalt")}
            onClick={toggleCropMode}
            disabled={disabled}
            aria-pressed={cropMode}
          >
            <CropIcon />
            {cropMode ? "完成裁剪 / Done" : "裁剪 / Crop"}
          </button>
        </div>

        {cropMode && (
          <div className="space-y-2 border-t-[2.5px] border-line pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="label">比例 / Ratio</span>
              {ASPECT_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className="chip"
                  aria-pressed={aspect === option.value}
                  disabled={disabled}
                  onClick={() => selectAspect(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="muted text-caption">拖动选框或四角调整裁剪区域。</p>
          </div>
        )}
      </div>
    </div>
  )
}

function PreviewStage({
  oriented,
  crop,
  filter,
}: {
  oriented: HTMLCanvasElement
  crop: CropRect | null
  filter: ImageEdits["filter"]
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rendered = renderCroppedCanvas(oriented, crop, {
      maxWidth: PREVIEW_MAX_DIMENSION,
      maxHeight: PREVIEW_MAX_DIMENSION,
      fit: "inside",
    })
    canvas.width = rendered.width
    canvas.height = rendered.height

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(rendered, 0, 0)
  }, [oriented, crop])

  return (
    <canvas
      ref={canvasRef}
      aria-label="照片预览"
      className="block h-auto max-h-[55vh] w-auto max-w-full"
      style={{ filter: getFilterCss(filter) }}
    />
  )
}

type DragMode = "move" | "nw" | "ne" | "sw" | "se"

interface DragState {
  mode: DragMode
  startX: number
  startY: number
  rect: CropRect
}

function CropStage({
  oriented,
  crop,
  filter,
  aspect,
  disabled,
  onCropChange,
}: {
  oriented: HTMLCanvasElement
  crop: CropRect | null
  filter: ImageEdits["filter"]
  aspect: number | null
  disabled?: boolean
  onCropChange: (crop: CropRect) => void
}) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const rect = normalizeCropRect(crop)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rendered = renderCroppedCanvas(oriented, null, {
      maxWidth: PREVIEW_MAX_DIMENSION,
      maxHeight: PREVIEW_MAX_DIMENSION,
      fit: "inside",
    })
    canvas.width = rendered.width
    canvas.height = rendered.height

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(rendered, 0, 0)
  }, [oriented])

  const getPoint = (event: React.PointerEvent) => {
    const bounds = stageRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0 || bounds.height === 0) {
      return { x: 0, y: 0 }
    }
    return {
      x: Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1),
      y: Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1),
    }
  }

  const startDrag = (event: React.PointerEvent, mode: DragMode) => {
    if (disabled) return
    event.preventDefault()
    event.stopPropagation()
    stageRef.current?.setPointerCapture(event.pointerId)
    const point = getPoint(event)
    dragRef.current = {
      mode,
      startX: point.x,
      startY: point.y,
      rect,
    }
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return

    const point = getPoint(event)
    let next: CropRect

    if (drag.mode === "move") {
      const dx = point.x - drag.startX
      const dy = point.y - drag.startY
      next = {
        ...drag.rect,
        x: Math.min(Math.max(drag.rect.x + dx, 0), 1 - drag.rect.width),
        y: Math.min(Math.max(drag.rect.y + dy, 0), 1 - drag.rect.height),
      }
    } else {
      const anchorX =
        drag.mode === "nw" || drag.mode === "sw" ? drag.rect.x + drag.rect.width : drag.rect.x
      const anchorY =
        drag.mode === "nw" || drag.mode === "ne" ? drag.rect.y + drag.rect.height : drag.rect.y

      const availableWidth = point.x < anchorX ? anchorX : 1 - anchorX
      const availableHeight = point.y < anchorY ? anchorY : 1 - anchorY
      const rawWidth = Math.abs(point.x - anchorX)
      const rawHeight = Math.abs(point.y - anchorY)

      let width: number
      let height: number

      if (aspect) {
        const normalizedRatio = (aspect * oriented.height) / oriented.width
        width = Math.min(rawWidth, rawHeight * normalizedRatio)
        width = Math.min(width, availableWidth, availableHeight * normalizedRatio)
        width = Math.max(width, MIN_CROP_SIZE)
        height = width / normalizedRatio
      } else {
        width = Math.max(Math.min(rawWidth, availableWidth), MIN_CROP_SIZE)
        height = Math.max(Math.min(rawHeight, availableHeight), MIN_CROP_SIZE)
      }

      next = {
        x: point.x < anchorX ? anchorX - width : anchorX,
        y: point.y < anchorY ? anchorY - height : anchorY,
        width,
        height,
      }
    }

    onCropChange(normalizeCropRect(next))
  }

  const endDrag = (event: React.PointerEvent) => {
    if (!dragRef.current) return
    dragRef.current = null
    if (stageRef.current?.hasPointerCapture(event.pointerId)) {
      stageRef.current.releasePointerCapture(event.pointerId)
    }
  }

  const cornerStyle = (corner: "nw" | "ne" | "sw" | "se"): React.CSSProperties => {
    const left = corner === "nw" || corner === "sw" ? rect.x : rect.x + rect.width
    const top = corner === "nw" || corner === "ne" ? rect.y : rect.y + rect.height
    return {
      left: `${left * 100}%`,
      top: `${top * 100}%`,
      transform: "translate(-50%, -50%)",
      touchAction: "none",
    }
  }

  return (
    <div
      ref={stageRef}
      className="relative inline-block max-w-full touch-none select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <canvas
        ref={canvasRef}
        className="block h-auto max-h-[55vh] w-auto max-w-full"
        style={{ filter: getFilterCss(filter) }}
      />

      <div className="absolute inset-0">
        <div
          className="absolute cursor-move"
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
            border: "2px solid var(--butter)",
            boxShadow: "0 0 0 9999px rgba(14, 14, 14, 0.55)",
          }}
          onPointerDown={(event) => startDrag(event, "move")}
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-1/3 border-l border-on-fill/40"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-1/3 border-l border-on-fill/40"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-on-fill/40"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-1/3 border-t border-on-fill/40"
            aria-hidden="true"
          />
        </div>

        {(["nw", "ne", "sw", "se"] as const).map((corner) => (
          <div
            key={corner}
            role="presentation"
            className="absolute h-5 w-5 border-2 border-line bg-butter"
            style={cornerStyle(corner)}
            onPointerDown={(event) => startDrag(event, corner)}
          />
        ))}
      </div>
    </div>
  )
}

function RotateLeftIcon() {
  return (
    <svg
      className="ic ic-sm"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="2"
        d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
      />
    </svg>
  )
}

function RotateRightIcon() {
  return (
    <svg
      className="ic ic-sm"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="2"
        d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3"
      />
    </svg>
  )
}

function FlipHorizontalIcon() {
  return (
    <svg
      className="ic ic-sm"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="2"
        d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </svg>
  )
}

function FlipVerticalIcon() {
  return (
    <svg
      className="ic ic-sm"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="2"
        d="M21 7.5 16.5 3m0 0L12 7.5M16.5 3v13.5m-13.5 0L7.5 21m0 0L12 16.5M7.5 21V7.5"
      />
    </svg>
  )
}

function CropIcon() {
  return (
    <svg
      className="ic ic-sm"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="2"
        d="M7 3v14a1 1 0 0 0 1 1h14M3 7h14a1 1 0 0 1 1 1v14"
      />
    </svg>
  )
}
