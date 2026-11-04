import { describe, expect, it } from "vitest"
import {
  applyFilterToPixels,
  FILTER_PRESETS,
  getCropPixels,
  getCropRectForAspect,
  getFilterCss,
  getOrientedSize,
  isFullCrop,
  MIN_CROP_SIZE,
  mirrorCropRect,
  normalizeCropRect,
} from "./image-editing"

describe("normalizeCropRect", () => {
  it("returns the full image for a null crop", () => {
    expect(normalizeCropRect(null)).toEqual({ x: 0, y: 0, width: 1, height: 1 })
  })

  it("clamps negative offsets and overflowing sizes", () => {
    expect(normalizeCropRect({ x: -0.2, y: -0.1, width: 1.5, height: 1.4 })).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    })
  })

  it("enforces a minimum crop size", () => {
    const crop = normalizeCropRect({ x: 0.5, y: 0.5, width: 0, height: 0 })
    expect(crop.width).toBeGreaterThanOrEqual(MIN_CROP_SIZE)
    expect(crop.height).toBeGreaterThanOrEqual(MIN_CROP_SIZE)
  })

  it("keeps the crop inside the image", () => {
    const crop = normalizeCropRect({ x: 0.9, y: 0.9, width: 0.5, height: 0.5 })
    expect(crop.x + crop.width).toBeLessThanOrEqual(1)
    expect(crop.y + crop.height).toBeLessThanOrEqual(1)
  })
})

describe("isFullCrop", () => {
  it("treats null and the full rect as full", () => {
    expect(isFullCrop(null)).toBe(true)
    expect(isFullCrop({ x: 0, y: 0, width: 1, height: 1 })).toBe(true)
  })

  it("detects an actual crop", () => {
    expect(isFullCrop({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 })).toBe(false)
  })
})

describe("getOrientedSize", () => {
  it("swaps dimensions for quarter turns", () => {
    expect(getOrientedSize(400, 300, 0)).toEqual({ width: 400, height: 300 })
    expect(getOrientedSize(400, 300, 90)).toEqual({ width: 300, height: 400 })
    expect(getOrientedSize(400, 300, 180)).toEqual({ width: 400, height: 300 })
    expect(getOrientedSize(400, 300, 270)).toEqual({ width: 300, height: 400 })
  })
})

describe("getCropRectForAspect", () => {
  it("returns the full image for a free crop", () => {
    expect(getCropRectForAspect(400, 300, null)).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    })
  })

  it("centers a square crop in a landscape image", () => {
    expect(getCropRectForAspect(400, 300, 1)).toEqual({
      x: 0.125,
      y: 0,
      width: 0.75,
      height: 1,
    })
  })

  it("centers a 16:9 crop in a portrait image", () => {
    const crop = getCropRectForAspect(300, 400, 16 / 9)
    expect(crop.width).toBe(1)
    expect(crop.height).toBeCloseTo(300 / (16 / 9) / 400)
    expect(crop.x).toBe(0)
    expect(crop.y).toBeCloseTo((1 - crop.height) / 2)
  })
})

describe("mirrorCropRect", () => {
  const crop = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }

  it("mirrors horizontally around the vertical axis", () => {
    const mirrored = mirrorCropRect(crop, "horizontal")
    expect(mirrored.x).toBeCloseTo(0.6)
    expect(mirrored.y).toBe(0.2)
    expect(mirrored.width).toBe(0.3)
    expect(mirrored.height).toBe(0.4)
  })

  it("mirrors vertically around the horizontal axis", () => {
    const mirrored = mirrorCropRect(crop, "vertical")
    expect(mirrored.y).toBeCloseTo(0.4)
    expect(mirrored.x).toBe(0.1)
    expect(mirrored.width).toBe(0.3)
    expect(mirrored.height).toBe(0.4)
  })
})

describe("getCropPixels", () => {
  it("returns the full source for a null crop", () => {
    expect(getCropPixels(800, 600, null)).toEqual({ sx: 0, sy: 0, sw: 800, sh: 600 })
  })

  it("converts normalized coordinates to pixels", () => {
    expect(getCropPixels(800, 600, { x: 0.25, y: 0.25, width: 0.5, height: 0.5 })).toEqual({
      sx: 200,
      sy: 150,
      sw: 400,
      sh: 300,
    })
  })

  it("never produces a zero-sized crop at the edge", () => {
    const pixels = getCropPixels(800, 600, { x: 1, y: 1, width: 0.5, height: 0.5 })
    expect(pixels.sw).toBeGreaterThan(0)
    expect(pixels.sh).toBeGreaterThan(0)
    expect(pixels.sx + pixels.sw).toBeLessThanOrEqual(800)
    expect(pixels.sy + pixels.sh).toBeLessThanOrEqual(600)
  })
})

describe("applyFilterToPixels", () => {
  it("leaves pixels untouched for the original preset", () => {
    const pixels = new Uint8ClampedArray([10, 20, 30, 255])
    applyFilterToPixels(pixels, "original")
    expect(Array.from(pixels)).toEqual([10, 20, 30, 255])
  })

  it("keeps alpha and increases color spread for vivid", () => {
    const pixels = new Uint8ClampedArray([100, 50, 25, 255])
    applyFilterToPixels(pixels, "vivid")
    expect(pixels[3]).toBe(255)
    expect(pixels[0] - pixels[2]).toBeGreaterThan(100 - 25)
  })

  it("clamps channels instead of overflowing", () => {
    const pixels = new Uint8ClampedArray([250, 250, 250, 255])
    applyFilterToPixels(pixels, "golden")
    expect(pixels[0]).toBeLessThanOrEqual(255)
    expect(pixels[1]).toBeLessThanOrEqual(255)
    expect(pixels[2]).toBeLessThanOrEqual(255)
  })
})

describe("FILTER_PRESETS", () => {
  it("starts with the unedited original and marks one recommendation", () => {
    expect(FILTER_PRESETS[0].id).toBe("original")
    expect(FILTER_PRESETS[0].css).toBe("none")
    expect(FILTER_PRESETS.filter((preset) => preset.recommended)).toHaveLength(1)
  })

  it("derives a usable CSS filter for every preset", () => {
    for (const preset of FILTER_PRESETS) {
      expect(preset.css.length).toBeGreaterThan(0)
      expect(preset.labelCn.length).toBeGreaterThan(0)
    }
    expect(getFilterCss("golden")).toContain("brightness(")
    expect(getFilterCss("golden")).toContain("sepia(")
  })
})
