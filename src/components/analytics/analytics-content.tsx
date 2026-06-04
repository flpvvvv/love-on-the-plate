"use client"

import { motion } from "framer-motion"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button, Card, CardContent } from "@/components/ui"
import type { AnalyticsResponse, DailyTrendPoint } from "@/types"

type RankView = "ingredients" | "dishes"

/* ─────────────────────────────────────────────────────────────────────────────
   Sparkline helpers — smooth curves + gradient area fill
   ───────────────────────────────────────────────────────────────────────────── */

interface SparklinePoint {
  x: number
  y: number
}

const SVG_W = 320
const SVG_H = 100

// Stable skeleton bar heights (avoids Math.random() during render)
const SKELETON_BAR_HEIGHTS = [45, 72, 38, 85, 52, 67, 29, 78, 43, 91, 56, 34]

/** Convert raw daily counts into SVG coordinates. */
function computeSparklineCoords(
  points: DailyTrendPoint[],
  width: number,
  height: number
): SparklinePoint[] {
  if (points.length === 0) return []
  const max = Math.max(...points.map((p) => p.count), 1)
  const pad = 8
  const iw = width - pad * 2
  const ih = height - pad * 2
  const step = points.length > 1 ? iw / (points.length - 1) : 0
  return points.map((p, i) => ({
    x: pad + i * step,
    y: pad + ih - (p.count / max) * ih,
  }))
}

/** Build a smooth cubic-bezier SVG path through all points. */
function smoothLinePath(pts: SparklinePoint[]): string {
  if (pts.length === 0) return ""
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const c = pts[i]
    const n = pts[i + 1]
    const mx = ((c.x + n.x) / 2).toFixed(1)
    d += ` C${mx},${c.y.toFixed(1)} ${mx},${n.y.toFixed(1)} ${n.x.toFixed(1)},${n.y.toFixed(1)}`
  }
  return d
}

/** Closed area path (line → bottom-right → bottom-left → close) for fill. */
function areaFillPath(pts: SparklinePoint[], bottom: number): string {
  const line = smoothLinePath(pts)
  if (!line || pts.length === 0) return ""
  const first = pts[0]
  const last = pts[pts.length - 1]
  return `${line} L${last.x.toFixed(1)},${bottom} L${first.x.toFixed(1)},${bottom} Z`
}

/* ─────────────────────────────────────────────────────────────────────────────
   Relative timestamp
   ───────────────────────────────────────────────────────────────────────────── */

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 10) return "Updated just now"
  if (seconds < 60) return `Updated ${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Updated ${minutes}m ago`
  return `Updated ${Math.floor(minutes / 60)}h ago`
}

/* ─────────────────────────────────────────────────────────────────────────────
   Framer Motion variants — staggered entrance
   ───────────────────────────────────────────────────────────────────────────── */

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
} as const

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
}

/* ═══════════════════════════════════════════════════════════════════════════════
   AnalyticsContent
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Renders analytics cards (total photos, trends, bar chart, top dishes).
 * Can be embedded inline in the Gallery or used in the standalone /analytics page.
 */
export function AnalyticsContent() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)
  const [timeLabel, setTimeLabel] = useState("")
  const [rankView, setRankView] = useState<RankView>("ingredients")

  /* ── Data fetching ── */

  const loadAnalytics = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/analytics", { signal })
      if (!response.ok) throw new Error("Failed to load analytics")

      const payload: AnalyticsResponse = await response.json()
      setData(payload)
      setFetchedAt(new Date())
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") return
      setError("Unable to load analytics right now.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadAnalytics(controller.signal)
    return () => controller.abort()
  }, [loadAnalytics])

  /* Tick the "Updated Xs ago" label every 10 s */
  useEffect(() => {
    if (!fetchedAt) return
    const tick = () => setTimeLabel(formatRelativeTime(fetchedAt))
    tick()
    const id = setInterval(tick, 10_000)
    return () => clearInterval(id)
  }, [fetchedAt])

  /* ── Derived values ── */

  const maxMonthCount = useMemo(() => {
    if (!data || data.perMonth.length === 0) return 1
    return Math.max(...data.perMonth.map((m) => m.count), 1)
  }, [data])

  const sparkCoords = useMemo(
    () => computeSparklineCoords(data?.recentTrend ?? [], SVG_W, SVG_H),
    [data]
  )

  const rankMax = useMemo(() => {
    if (!data) return 1
    const items = rankView === "ingredients" ? data.topIngredients : data.topDishes
    if (items.length === 0) return 1
    return Math.max(...items.map((d) => d.count), 1)
  }, [data, rankView])

  const thisMonthCount = useMemo(() => {
    if (!data || data.perMonth.length === 0) return 0
    return data.perMonth[data.perMonth.length - 1].count
  }, [data])

  /* ══════════════════════════════════════════════════════════════════════════
     Loading — skeletons match the real 2-small + 2-full-width layout
     ══════════════════════════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Half-width: Total photos skeleton */}
        <Card>
          <CardContent>
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-28 rounded bg-canvas-recessed" />
              <div className="h-12 w-36 rounded bg-canvas-recessed" />
              <div className="h-3 w-24 rounded bg-canvas-recessed" />
            </div>
          </CardContent>
        </Card>
        {/* Half-width: Sparkline skeleton */}
        <Card>
          <CardContent>
            <div className="animate-pulse space-y-3">
              <div className="flex justify-between">
                <div className="h-4 w-28 rounded bg-canvas-recessed" />
                <div className="h-4 w-16 rounded bg-canvas-recessed" />
              </div>
              <div className="h-24 rounded-xl bg-canvas-recessed" />
            </div>
          </CardContent>
        </Card>
        {/* Full-width: Bar chart skeleton */}
        <Card className="md:col-span-2">
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-40 rounded bg-canvas-recessed" />
              <div className="flex items-end gap-2 h-44">
                {SKELETON_BAR_HEIGHTS.map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-canvas-recessed"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Full-width: Top ranking skeleton */}
        <Card className="md:col-span-2">
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-4 w-28 rounded bg-canvas-recessed" />
                <div className="h-6 w-20 rounded bg-canvas-recessed" />
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded bg-canvas-recessed shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-32 rounded bg-canvas-recessed" />
                    <div className="h-1.5 rounded-full bg-canvas-recessed" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════════════════════════
     Error state
     ══════════════════════════════════════════════════════════════════════════ */

  if (error) {
    return (
      <Card>
        <CardContent className="space-y-4">
          <p className="text-ink-secondary">{error}</p>
          <Button onClick={() => loadAnalytics()} size="sm">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  /* ══════════════════════════════════════════════════════════════════════════
     Main content — staggered entrance with per-element animations
     ══════════════════════════════════════════════════════════════════════════ */

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
    >
      {/* ── Total Photos ─────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card className="h-full">
          <CardContent className="space-y-1 relative overflow-hidden">
            {/* Decorative heart watermark */}
            <svg
              className="absolute -right-3 -top-3 w-20 h-20 text-love/[0.07]"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>

            <p className="text-sm text-ink-secondary">Total photos</p>
            <p className="font-display text-4xl md:text-5xl text-love font-semibold tabular-nums">
              {data.totalCount.toLocaleString()}
            </p>
            {thisMonthCount > 0 && (
              <p className="text-sm text-freshness font-medium tabular-nums">
                +{thisMonthCount} this month
              </p>
            )}
            {timeLabel && <p className="text-micro text-ink-tertiary pt-1">{timeLabel}</p>}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Recent Trend Sparkline (warmth palette) ──────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card className="h-full">
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-secondary">Last 30 days</p>
              <span className="text-sm font-medium text-warmth tabular-nums">
                {data.recentTrend.reduce((sum, item) => sum + item.count, 0)} uploads
              </span>
            </div>
            <div className="rounded-xl bg-canvas-recessed/60 p-2">
              <svg
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                className="w-full h-24"
                role="img"
                aria-label="Daily upload trend in the last 30 days"
              >
                <defs>
                  <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--warmth)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--warmth)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {sparkCoords.length > 1 && (
                  <>
                    {/* Gradient area fill */}
                    <path d={areaFillPath(sparkCoords, SVG_H)} fill="url(#sparkline-gradient)" />
                    {/* Smooth line */}
                    <path
                      d={smoothLinePath(sparkCoords)}
                      fill="none"
                      stroke="var(--warmth)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* End dot — latest data point */}
                    <circle
                      cx={sparkCoords[sparkCoords.length - 1].x}
                      cy={sparkCoords[sparkCoords.length - 1].y}
                      r="3.5"
                      fill="var(--warmth)"
                    />
                  </>
                )}
              </svg>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Per-Month Bar Chart (no individual containers, shared baseline) ─ */}
      <motion.div variants={fadeUp} className="md:col-span-2">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-secondary">Photos per month</p>
              <span className="text-sm text-ink-tertiary tabular-nums">
                Last {data.perMonth.length} months
              </span>
            </div>

            <div className="flex items-end gap-1 sm:gap-2">
              {data.perMonth.map((month, i) => {
                const pct = (month.count / maxMonthCount) * 100
                return (
                  <div key={month.month} className="flex-1 flex flex-col items-center gap-1.5">
                    {/* Count above bar */}
                    <span className="text-[10px] sm:text-[11px] text-ink-secondary tabular-nums">
                      {month.count > 0 ? month.count : "\u00A0"}
                    </span>

                    {/* Bar area — shared baseline, no per-bar containers */}
                    <div className="w-full flex justify-center h-36 items-end">
                      <motion.div
                        className="w-full max-w-8 rounded-t-md bg-love-soft hover:bg-love/30 transition-colors"
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(pct, 5)}%` }}
                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 24,
                          delay: 0.3 + i * 0.04,
                        }}
                        title={`${month.label}: ${month.count} photos`}
                        role="img"
                        aria-label={`${month.label}: ${month.count} photos`}
                      />
                    </div>

                    {/* Month label */}
                    <p className="text-[11px] text-ink-tertiary leading-none">{month.label}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Top Ingredients / Top Dishes Toggle ──────────────────────── */}
      <motion.div variants={fadeUp} className="md:col-span-2">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-secondary">
                {rankView === "ingredients" ? "Top ingredients" : "Top dishes"}
              </p>
              <div className="flex rounded-lg bg-canvas-recessed p-0.5">
                <button
                  type="button"
                  onClick={() => setRankView("ingredients")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    rankView === "ingredients"
                      ? "bg-canvas text-ink shadow-sm"
                      : "text-ink-tertiary hover:text-ink-secondary"
                  }`}
                >
                  Ingredients
                </button>
                <button
                  type="button"
                  onClick={() => setRankView("dishes")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    rankView === "dishes"
                      ? "bg-canvas text-ink shadow-sm"
                      : "text-ink-tertiary hover:text-ink-secondary"
                  }`}
                >
                  Dishes
                </button>
              </div>
            </div>

            {(rankView === "ingredients" ? data.topIngredients : data.topDishes).length === 0 ? (
              <p className="text-ink-tertiary font-accent text-lg">
                {rankView === "ingredients"
                  ? "No ingredient tags yet — start uploading!"
                  : "No dish names yet — start uploading!"}
              </p>
            ) : (
              <div className="space-y-3">
                {(rankView === "ingredients" ? data.topIngredients : data.topDishes).map(
                  (item, i) => {
                    const widthPct =
                      (("ingredientName" in item ? item.count : item.count) / rankMax) * 100
                    const name = "ingredientName" in item ? item.ingredientName : item.dishName
                    const count = item.count
                    const isTop3 = i < 3
                    const isIngredients = rankView === "ingredients"
                    return (
                      <div key={name} className="flex gap-2.5">
                        {/* Rank number */}
                        <span
                          className={`
                          text-xs tabular-nums w-5 text-right shrink-0 pt-0.5
                          ${
                            isTop3
                              ? `font-display font-semibold ${isIngredients ? "text-warmth" : "text-freshness"}`
                              : "text-ink-tertiary"
                          }
                        `}
                        >
                          {i + 1}
                        </span>

                        {/* Name, count, progress bar */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <p
                              className={`text-sm truncate ${isTop3 ? "text-ink font-medium" : "text-ink-secondary"}`}
                            >
                              {name}
                            </p>
                            <span className="text-sm text-ink-tertiary tabular-nums shrink-0">
                              {count}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-canvas-recessed overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${
                                isTop3
                                  ? isIngredients
                                    ? "bg-warmth"
                                    : "bg-freshness"
                                  : isIngredients
                                    ? "bg-warmth/50"
                                    : "bg-freshness/50"
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(widthPct, 8)}%` }}
                              transition={{
                                type: "spring",
                                stiffness: 260,
                                damping: 24,
                                delay: 0.5 + i * 0.05,
                              }}
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
