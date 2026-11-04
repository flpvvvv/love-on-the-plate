/**
 * Client-side photo filters and geometric edits.
 *
 * The upload flow keeps the original file for AI description, then bakes these
 * edits (rotation, flips, crop, filter) into the JPEG that is stored.
 */

export type FilterId = "original" | "golden" | "vivid" | "fresh" | "smoky" | "creamy"

export type ImageRotation = 0 | 90 | 180 | 270

export interface CropRect {
  /** Normalized 0–1 coordinates in the rotated + flipped image. */
  x: number
  y: number
  width: number
  height: number
}

export interface ImageEdits {
  filter: FilterId
  rotation: ImageRotation
  flipH: boolean
  flipV: boolean
  crop: CropRect | null
}

export const DEFAULT_IMAGE_EDITS: ImageEdits = {
  filter: "original",
  rotation: 0,
  flipH: false,
  flipV: false,
  crop: null,
}

type FilterOperation =
  | { type: "brightness"; value: number }
  | { type: "contrast"; value: number }
  | { type: "saturate"; value: number }
  | { type: "sepia"; value: number }

export interface FilterPreset {
  id: FilterId
  labelEn: string
  labelCn: string
  /** The CSS/canvas filter string, derived from `operations`. */
  css: string
  operations: FilterOperation[]
  /** Highlighted in the editor as a food-friendly suggestion. */
  recommended?: boolean
}

const FILTER_DEFINITIONS: Array<Omit<FilterPreset, "css">> = [
  {
    id: "original",
    labelEn: "Original",
    labelCn: "原图",
    operations: [],
  },
  {
    id: "golden",
    labelEn: "Golden",
    labelCn: "暖阳",
    recommended: true,
    operations: [
      { type: "brightness", value: 1.05 },
      { type: "contrast", value: 1.04 },
      { type: "saturate", value: 1.12 },
      { type: "sepia", value: 0.1 },
    ],
  },
  {
    id: "vivid",
    labelEn: "Vivid",
    labelCn: "鲜味",
    operations: [
      { type: "brightness", value: 1.02 },
      { type: "contrast", value: 1.14 },
      { type: "saturate", value: 1.28 },
    ],
  },
  {
    id: "fresh",
    labelEn: "Fresh",
    labelCn: "清爽",
    operations: [
      { type: "brightness", value: 1.07 },
      { type: "contrast", value: 1.02 },
      { type: "saturate", value: 1.12 },
    ],
  },
  {
    id: "smoky",
    labelEn: "Smoky",
    labelCn: "炭火",
    operations: [
      { type: "brightness", value: 0.97 },
      { type: "contrast", value: 1.17 },
      { type: "saturate", value: 1.04 },
      { type: "sepia", value: 0.16 },
    ],
  },
  {
    id: "creamy",
    labelEn: "Creamy",
    labelCn: "奶油",
    operations: [
      { type: "brightness", value: 1.08 },
      { type: "contrast", value: 0.94 },
      { type: "saturate", value: 1.05 },
      { type: "sepia", value: 0.08 },
    ],
  },
]

function toCss(operations: FilterOperation[]): string {
  if (operations.length === 0) return "none"
  return operations.map((op) => `${op.type}(${op.value})`).join(" ")
}

export const FILTER_PRESETS: FilterPreset[] = FILTER_DEFINITIONS.map((preset) => ({
  ...preset,
  css: toCss(preset.operations),
}))

export function getFilterPreset(id: FilterId): FilterPreset {
  return FILTER_PRESETS.find((preset) => preset.id === id) ?? FILTER_PRESETS[0]
}

export function getFilterCss(id: FilterId): string {
  return getFilterPreset(id).css
}

export const MIN_CROP_SIZE = 0.02
const FULL_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 }

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Clamp a crop rect into the image and enforce a minimum size. */
export function normalizeCropRect(crop: CropRect | null): CropRect {
  if (!crop) return { ...FULL_CROP }

  const x = clamp(crop.x, 0, 1 - MIN_CROP_SIZE)
  const y = clamp(crop.y, 0, 1 - MIN_CROP_SIZE)
  const width = clamp(crop.width, MIN_CROP_SIZE, 1 - x)
  const height = clamp(crop.height, MIN_CROP_SIZE, 1 - y)

  return { x, y, width, height }
}

export function isFullCrop(crop: CropRect | null): boolean {
  if (!crop) return true
  const normalized = normalizeCropRect(crop)
  return (
    normalized.x <= 0.0001 &&
    normalized.y <= 0.0001 &&
    normalized.width >= 0.9999 &&
    normalized.height >= 0.9999
  )
}

/** Dimensions after applying a 90° step rotation. */
export function getOrientedSize(
  width: number,
  height: number,
  rotation: ImageRotation
): { width: number; height: number } {
  return rotation === 90 || rotation === 270 ? { width: height, height: width } : { width, height }
}

/**
 * Largest centered crop with the given physical aspect ratio (width / height).
 * `null` returns the full image.
 */
export function getCropRectForAspect(
  orientedWidth: number,
  orientedHeight: number,
  aspect: number | null
): CropRect {
  if (!aspect || !Number.isFinite(aspect) || aspect <= 0) return { ...FULL_CROP }

  let width = orientedWidth
  let height = width / aspect
  if (height > orientedHeight) {
    height = orientedHeight
    width = height * aspect
  }

  return {
    x: (1 - width / orientedWidth) / 2,
    y: (1 - height / orientedHeight) / 2,
    width: width / orientedWidth,
    height: height / orientedHeight,
  }
}

/** Mirror a crop selection so it keeps covering the same content after a flip. */
export function mirrorCropRect(crop: CropRect, axis: "horizontal" | "vertical"): CropRect {
  const normalized = normalizeCropRect(crop)
  if (axis === "horizontal") {
    return { ...normalized, x: 1 - normalized.x - normalized.width }
  }
  return { ...normalized, y: 1 - normalized.y - normalized.height }
}

/** Normalized crop → integer source pixels, safely clamped to the source. */
export function getCropPixels(
  sourceWidth: number,
  sourceHeight: number,
  crop: CropRect | null
): { sx: number; sy: number; sw: number; sh: number } {
  const normalized = normalizeCropRect(crop)
  const sx = clamp(Math.round(normalized.x * sourceWidth), 0, Math.max(0, sourceWidth - 1))
  const sy = clamp(Math.round(normalized.y * sourceHeight), 0, Math.max(0, sourceHeight - 1))
  const sw = Math.max(1, Math.min(Math.round(normalized.width * sourceWidth), sourceWidth - sx))
  const sh = Math.max(1, Math.min(Math.round(normalized.height * sourceHeight), sourceHeight - sy))
  return { sx, sy, sw, sh }
}

/**
 * Apply a preset to raw RGBA pixels. Mirrors the CSS filter string used for
 * previews so the stored JPEG matches what the user picked. Mutates in place.
 */
export function applyFilterToPixels(pixels: Uint8ClampedArray, filterId: FilterId): void {
  const operations = getFilterPreset(filterId).operations
  if (operations.length === 0) return

  for (let i = 0; i < pixels.length; i += 4) {
    let r = pixels[i]
    let g = pixels[i + 1]
    let b = pixels[i + 2]

    for (const op of operations) {
      switch (op.type) {
        case "brightness":
          r *= op.value
          g *= op.value
          b *= op.value
          break
        case "contrast":
          r = (r - 128) * op.value + 128
          g = (g - 128) * op.value + 128
          b = (b - 128) * op.value + 128
          break
        case "saturate": {
          const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
          r = luminance + (r - luminance) * op.value
          g = luminance + (g - luminance) * op.value
          b = luminance + (b - luminance) * op.value
          break
        }
        case "sepia": {
          const sr = 0.393 * r + 0.769 * g + 0.189 * b
          const sg = 0.349 * r + 0.686 * g + 0.168 * b
          const sb = 0.272 * r + 0.534 * g + 0.131 * b
          r += (sr - r) * op.value
          g += (sg - g) * op.value
          b += (sb - b) * op.value
          break
        }
      }
    }

    pixels[i] = r
    pixels[i + 1] = g
    pixels[i + 2] = b
  }
}

export function loadImage(source: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source)
    const image = new window.Image()

    const cleanup = () => URL.revokeObjectURL(url)

    image.onload = () => {
      cleanup()
      resolve(image)
    }
    image.onerror = () => {
      cleanup()
      reject(new Error("Failed to load image"))
    }
    image.src = url
  })
}

interface OrientedEdits {
  rotation: ImageRotation
  flipH: boolean
  flipV: boolean
}

/**
 * Draw the source image rotated and flipped. Used both as the crop-mode preview
 * and as the input for the final export. `maxDimension` caps preview memory.
 */
export function renderOrientedCanvas(
  image: HTMLImageElement,
  edits: OrientedEdits,
  maxDimension?: number
): HTMLCanvasElement {
  const naturalWidth = image.naturalWidth || image.width
  const naturalHeight = image.naturalHeight || image.height
  const oriented = getOrientedSize(naturalWidth, naturalHeight, edits.rotation)

  const scale =
    maxDimension && Math.max(oriented.width, oriented.height) > maxDimension
      ? maxDimension / Math.max(oriented.width, oriented.height)
      : 1

  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(oriented.width * scale))
  canvas.height = Math.max(1, Math.round(oriented.height * scale))

  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Failed to get canvas context")

  const drawWidth = naturalWidth * scale
  const drawHeight = naturalHeight * scale

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.translate(canvas.width / 2, canvas.height / 2)
  // Flips are display-space edits, so they wrap the rotation.
  ctx.scale(edits.flipH ? -1 : 1, edits.flipV ? -1 : 1)
  ctx.rotate((edits.rotation * Math.PI) / 180)
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)

  return canvas
}

export interface RenderOptions {
  maxWidth: number
  maxHeight: number
  fit?: "inside" | "cover"
  filter?: FilterId
  bakeFilter?: boolean
}

interface RenderGeometry {
  sourceX: number
  sourceY: number
  sourceWidth: number
  sourceHeight: number
  targetWidth: number
  targetHeight: number
  scaleX: number
  scaleY: number
}

function getRenderGeometry(
  sourceWidth: number,
  sourceHeight: number,
  crop: CropRect | null,
  options: RenderOptions
): RenderGeometry {
  const { sx, sy, sw, sh } = getCropPixels(sourceWidth, sourceHeight, crop)
  const fit = options.fit ?? "inside"

  let sourceX = sx
  let sourceY = sy
  let sourceW = sw
  let sourceH = sh
  let targetWidth: number
  let targetHeight: number

  if (fit === "cover") {
    targetWidth = options.maxWidth
    targetHeight = options.maxHeight
    const targetAspect = targetWidth / targetHeight
    if (sourceW / sourceH > targetAspect) {
      const nextWidth = sourceH * targetAspect
      sourceX += (sourceW - nextWidth) / 2
      sourceW = nextWidth
    } else {
      const nextHeight = sourceW / targetAspect
      sourceY += (sourceH - nextHeight) / 2
      sourceH = nextHeight
    }
  } else {
    const scale = Math.min(1, options.maxWidth / sourceW, options.maxHeight / sourceH)
    targetWidth = Math.max(1, Math.round(sourceW * scale))
    targetHeight = Math.max(1, Math.round(sourceH * scale))
  }

  return {
    sourceX,
    sourceY,
    sourceWidth: sourceW,
    sourceHeight: sourceH,
    targetWidth,
    targetHeight,
    scaleX: targetWidth / sourceW,
    scaleY: targetHeight / sourceH,
  }
}

function bakeFilter(canvas: HTMLCanvasElement, filter: FilterId | undefined): void {
  if (!filter || filter === "original") return
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  applyFilterToPixels(imageData.data, filter)
  ctx.putImageData(imageData, 0, 0)
}

type DrawableImage = HTMLImageElement | HTMLCanvasElement

/**
 * Crop, scale and optionally filter an already-oriented canvas.
 * With `fit: "cover"` the result is exactly maxWidth × maxHeight (thumbnails).
 */
export function renderCroppedCanvas(
  source: DrawableImage,
  crop: CropRect | null,
  options: RenderOptions
): HTMLCanvasElement {
  const geometry = getRenderGeometry(source.width, source.height, crop, options)
  const canvas = document.createElement("canvas")
  canvas.width = geometry.targetWidth
  canvas.height = geometry.targetHeight

  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Failed to get canvas context")

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(
    source,
    geometry.sourceX,
    geometry.sourceY,
    geometry.sourceWidth,
    geometry.sourceHeight,
    0,
    0,
    geometry.targetWidth,
    geometry.targetHeight
  )

  if (options.bakeFilter) bakeFilter(canvas, options.filter)

  return canvas
}

/**
 * Draw the original image straight into the export canvas with rotation, flips
 * and crop applied. Avoids materializing a full-resolution oriented canvas,
 * which matters for large phone photos.
 */
export function renderEditedCanvas(
  image: HTMLImageElement,
  edits: ImageEdits,
  options: RenderOptions
): HTMLCanvasElement {
  const naturalWidth = image.naturalWidth || image.width
  const naturalHeight = image.naturalHeight || image.height
  const oriented = getOrientedSize(naturalWidth, naturalHeight, edits.rotation)
  const geometry = getRenderGeometry(oriented.width, oriented.height, edits.crop, options)

  const canvas = document.createElement("canvas")
  canvas.width = geometry.targetWidth
  canvas.height = geometry.targetHeight

  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Failed to get canvas context")

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.translate(-geometry.sourceX * geometry.scaleX, -geometry.sourceY * geometry.scaleY)
  ctx.scale(geometry.scaleX, geometry.scaleY)
  ctx.translate(oriented.width / 2, oriented.height / 2)
  // Flips are display-space edits, so they wrap the rotation.
  ctx.scale(edits.flipH ? -1 : 1, edits.flipV ? -1 : 1)
  ctx.rotate((edits.rotation * Math.PI) / 180)
  ctx.drawImage(image, -naturalWidth / 2, -naturalHeight / 2, naturalWidth, naturalHeight)

  if (options.bakeFilter) bakeFilter(canvas, options.filter)

  return canvas
}

export interface ExportOptions {
  maxWidth: number
  maxHeight: number
  quality?: number
  format?: "image/jpeg" | "image/webp"
  fit?: "inside" | "cover"
}

export interface RenderedImage {
  base64: string
  width: number
  height: number
}

/**
 * Bake all edits into a base64 image and return its final dimensions.
 * The caller supplies the destination preset (upload size or thumbnail size).
 */
export async function renderEditedImage(
  source: Blob,
  edits: ImageEdits,
  options: ExportOptions
): Promise<RenderedImage> {
  const image = await loadImage(source)
  const canvas = renderEditedCanvas(image, edits, {
    maxWidth: options.maxWidth,
    maxHeight: options.maxHeight,
    fit: options.fit,
    filter: edits.filter,
    bakeFilter: true,
  })

  const dataUrl = canvas.toDataURL(options.format ?? "image/jpeg", options.quality ?? 0.8)
  const base64 = dataUrl.split(",")[1]
  if (!base64) throw new Error("Failed to encode edited image")

  return { base64, width: canvas.width, height: canvas.height }
}
