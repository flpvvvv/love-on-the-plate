"use client"

import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui"
import type { AnalyticsResponse, DailyTrendPoint } from "@/types"

type RankView = "ingredients" | "dishes"

/* Stable skeleton bar heights (avoids Math.random() during render) */
const SKELETON_BAR_HEIGHTS = [45, 72, 38, 85, 52, 67, 29, 78, 43, 91, 56, 34]

/* The scoreboard and the trend line are fluid grids of equal columns. */
const SCORE_GRID = "score grid-cols-1 sm:grid-cols-2 xl:grid-cols-5"
const TREND_DAYS = 14

/** `.sv` is a display-size numeral; long counts step down to `.sv-sm`. */
function valueClass(value: string): string {
  return value.length > 4 ? "sv sv-sm" : "sv"
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

/* ═══════════════════════════════════════════════════════════════════════════════
   AnalyticsContent
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Renders the analytics scoreboard (total photos, trends, bar chart, top dishes).
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
      const response = await fetch("/api/analytics", { signal, cache: "no-store" })
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

    // Refetch when the tab regains focus/visibility so the total count is current
    // after the user uploads a photo and returns to Analytics.
    const refetch = () => void loadAnalytics()
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch()
    }
    window.addEventListener("focus", refetch)
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      controller.abort()
      window.removeEventListener("focus", refetch)
      document.removeEventListener("visibilitychange", onVisible)
    }
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

  const trendPoints: DailyTrendPoint[] = useMemo(
    () => (data?.recentTrend ?? []).slice(-TREND_DAYS),
    [data]
  )

  const trendMax = useMemo(
    () => (trendPoints.length === 0 ? 1 : Math.max(...trendPoints.map((p) => p.count), 1)),
    [trendPoints]
  )

  const rankItems = useMemo(() => {
    if (!data) return []
    return rankView === "ingredients" ? data.topIngredients : data.topDishes
  }, [data, rankView])

  const rankMax = useMemo(
    () => (rankItems.length === 0 ? 1 : Math.max(...rankItems.map((d) => d.count), 1)),
    [rankItems]
  )

  const thisMonthCount = useMemo(() => {
    if (!data || data.perMonth.length === 0) return 0
    return data.perMonth[data.perMonth.length - 1].count
  }, [data])

  const last30Days = useMemo(
    () => (data?.recentTrend ?? []).reduce((sum, item) => sum + item.count, 0),
    [data]
  )

  const busiestMonth = useMemo(() => {
    if (!data || data.perMonth.length === 0) return null
    return data.perMonth.reduce((best, month) => (month.count > best.count ? month : best))
  }, [data])

  /* ══════════════════════════════════════════════════════════════════════════
     Loading — skeletons trace the score, the bars and the ranking
     ══════════════════════════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className={SCORE_GRID}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="sblock skel">
              <div className="sk-line short" />
              <div className="sk-line" />
              <div className="sk-line short" />
            </div>
          ))}
        </div>

        <div className="nb-block">
          <div className="block-head">
            <div className="sk-line short" />
            <div className="sk-line" />
          </div>
          <div className="bars grid-cols-6 sm:grid-cols-12">
            {SKELETON_BAR_HEIGHTS.map((height, i) => (
              <div key={i} className="bar">
                <div className="sk-line" style={{ height: `${height}%`, margin: 0 }} />
              </div>
            ))}
          </div>
        </div>

        <div className="nb-block">
          <div className="sk-line short" />
          <ul className="ranks">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="rank">
                <div className="sk-line short" />
                <div className="sk-line" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════════════════════════
     Error state
     ══════════════════════════════════════════════════════════════════════════ */

  if (error) {
    return (
      <div className="nb-block space-y-4">
        <p className="muted">{error}</p>
        <Button onClick={() => loadAnalytics()} size="sm">
          Retry
        </Button>
      </div>
    )
  }

  if (!data) return null

  const topIngredients = data.topIngredients
  const topDishes = data.topDishes

  /* ══════════════════════════════════════════════════════════════════════════
     Main content — the scoreboard
     ══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ── The score ───────────────────────────────────────────────────── */}
      <div className={SCORE_GRID}>
        <div className="sblock nb nb-tomato">
          <span className="sk">Total photos</span>
          <span className={valueClass(data.totalCount.toLocaleString())}>
            {data.totalCount.toLocaleString()}
          </span>
          {thisMonthCount > 0 && <span className="sd">+{thisMonthCount} this month</span>}
          {timeLabel && <span className="sd">{timeLabel}</span>}
        </div>

        <div className="sblock nb nb-cobalt">
          <span className="sk">Last 30 days</span>
          <span className={valueClass(String(last30Days))}>{last30Days}</span>
          <span className="sd">uploads</span>
          <span className="sd">14-day trend below</span>
        </div>

        <div className="sblock nb nb-butter">
          <span className="sk">Photos per month</span>
          <span className={valueClass(String(thisMonthCount))}>{thisMonthCount}</span>
          <span className="sd">Busiest · {busiestMonth ? busiestMonth.label : "—"}</span>
          <span className="sd">Last {data.perMonth.length} months</span>
        </div>

        <div className="sblock nb nb-ink">
          <span className="sk">Top ingredients</span>
          <span className={valueClass(String(topIngredients.length))}>{topIngredients.length}</span>
          <span className="sd">Tags in the lead</span>
          <span className="sd">
            {topIngredients
              .slice(0, 2)
              .map((item) => `${item.ingredientName} ${item.count}`)
              .join(" · ")}
          </span>
        </div>

        <div className="sblock nb nb-leaf">
          <span className="sk">Top dishes</span>
          <span className={valueClass(String(topDishes.length))}>{topDishes.length}</span>
          <span className="sd">Dishes in the lead</span>
          <span className="sd">
            {topDishes
              .slice(0, 2)
              .map((item) => `${item.dishName} ${item.count}`)
              .join(" · ")}
          </span>
        </div>
      </div>

      {/* ── Photos per month ────────────────────────────────────────────── */}
      <div className="nb-block">
        <div className="block-head">
          <h3 className="label">Photos per month</h3>
          <span className="mono muted text-micro">Last {data.perMonth.length} months</span>
        </div>

        <div className="bars grid-cols-6 sm:grid-cols-12">
          {data.perMonth.map((month) => (
            <div
              key={month.month}
              className="bar"
              title={`${month.label}: ${month.count} photos`}
              role="img"
              aria-label={`${month.label}: ${month.count} photos`}
            >
              <b>{month.count}</b>
              <i
                style={
                  {
                    "--h": `${Math.max((month.count / maxMonthCount) * 100, 3)}%`,
                  } as CSSProperties
                }
              />
              <span>{month.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top ingredients / Top dishes ────────────────────────────────── */}
      <div className="nb-block">
        <div className="block-head">
          <h3 className="label">Top ingredients / Top dishes</h3>
          <div className="stats-toggle inline-flex" role="group" aria-label="Ranking">
            <button
              type="button"
              onClick={() => setRankView("ingredients")}
              aria-pressed={rankView === "ingredients"}
            >
              Ingredients
            </button>
            <button
              type="button"
              onClick={() => setRankView("dishes")}
              aria-pressed={rankView === "dishes"}
            >
              Dishes
            </button>
          </div>
        </div>

        {rankItems.length === 0 ? (
          <div className="empty-note">
            <p>
              {rankView === "ingredients"
                ? "No ingredient tags yet — start uploading!"
                : "No dish names yet — start uploading!"}
            </p>
          </div>
        ) : (
          <ul className="ranks">
            {rankItems.map((item, i) => {
              const name = "ingredientName" in item ? item.ingredientName : item.dishName
              return (
                <li key={name} className="rank">
                  <span className="rno">{String(i + 1).padStart(2, "0")}</span>
                  <span className="rname truncate" title={name}>
                    {name}
                  </span>
                  <span className="rbar">
                    <i
                      style={
                        {
                          "--h": `${Math.max((item.count / rankMax) * 100, 4)}%`,
                        } as CSSProperties
                      }
                      aria-hidden="true"
                    />
                  </span>
                  <span className="rval">{item.count}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* ── Last 14 days ────────────────────────────────────────────────── */}
      <div className="nb-block">
        <div className="block-head">
          <h3 className="label">Last {TREND_DAYS} days</h3>
          <span className="mono muted text-micro">{last30Days} uploads</span>
        </div>

        <div
          className="trend grid-cols-7 sm:grid-cols-14"
          role="group"
          aria-label={`Daily upload trend in the last ${TREND_DAYS} days`}
        >
          {trendPoints.map((point) => (
            <div
              key={point.date}
              className="td"
              title={`${point.date}: ${point.count} uploads`}
              role="img"
              aria-label={`${point.date}: ${point.count} uploads`}
            >
              <b>{point.count}</b>
              <i
                style={
                  {
                    "--h": `${Math.max((point.count / trendMax) * 100, 3)}%`,
                  } as CSSProperties
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
