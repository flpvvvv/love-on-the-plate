'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Card, CardContent } from '@/components/ui';
import type { AnalyticsResponse, DailyTrendPoint } from '@/types';

function buildSparklinePoints(points: DailyTrendPoint[], width: number, height: number): string {
  if (points.length === 0) return '';

  const maxCount = Math.max(...points.map((point) => point.count), 1);
  const padding = 8;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  return points
    .map((point, index) => {
      const x = padding + index * step;
      const y = padding + innerHeight - (point.count / maxCount) * innerHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/**
 * Renders analytics cards (total photos, trends, bar chart, top dishes).
 * Can be embedded inline in the Gallery or used in the standalone /analytics page.
 */
export function AnalyticsContent() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analytics', { signal });
      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const payload: AnalyticsResponse = await response.json();
      setData(payload);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === 'AbortError') {
        return;
      }
      setError('Unable to load analytics right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadAnalytics(controller.signal);
    return () => controller.abort();
  }, [loadAnalytics]);

  const maxMonthCount = useMemo(() => {
    if (!data || data.perMonth.length === 0) return 1;
    return Math.max(...data.perMonth.map((month) => month.count), 1);
  }, [data]);

  const sparklinePoints = useMemo(() => {
    return buildSparklinePoints(data?.recentTrend ?? [], 320, 92);
  }, [data]);

  const topDishMax = useMemo(() => {
    if (!data || data.topDishes.length === 0) return 1;
    return Math.max(...data.topDishes.map((dish) => dish.count), 1);
  }, [data]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent>
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-32 rounded bg-canvas-recessed" />
                <div className="h-16 rounded bg-canvas-recessed" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

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
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
    >
      {/* Total photos */}
      <Card>
        <CardContent className="space-y-2">
          <p className="text-sm text-ink-secondary">Total photos</p>
          <p className="font-display text-4xl md:text-5xl text-love font-semibold tabular-nums">
            {data.totalCount.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* Recent trend sparkline */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-secondary">Recent uploads (last 30 days)</p>
            <span className="text-sm text-ink-tertiary tabular-nums">
              {data.recentTrend.reduce((sum, item) => sum + item.count, 0)}
            </span>
          </div>
          <div className="rounded-xl bg-canvas-recessed border border-stroke p-2">
            <svg
              viewBox="0 0 320 92"
              className="w-full h-24"
              role="img"
              aria-label="Daily upload trend in the last 30 days"
            >
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-love"
                points={sparklinePoints}
              />
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Per-month bar chart */}
      <Card className="md:col-span-2">
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink-secondary">Photos per month (last 12 months)</p>
            <span className="text-sm text-ink-tertiary tabular-nums">
              {data.perMonth.reduce((sum, item) => sum + item.count, 0)}
            </span>
          </div>
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="min-w-[560px]">
              <div className="h-52 flex items-end gap-2">
                {data.perMonth.map((month) => {
                  const heightPercent = (month.count / maxMonthCount) * 100;
                  return (
                    <div key={month.month} className="flex-1 min-w-8 flex flex-col items-center gap-2">
                      <div className="h-40 w-full flex items-end justify-center rounded-lg bg-canvas-recessed border border-stroke p-1">
                        <div
                          className="w-full max-w-9 rounded-md bg-love-soft border border-love/20"
                          style={{ height: `${Math.max(heightPercent, 4)}%` }}
                          aria-label={`${month.label}: ${month.count} photos`}
                        />
                      </div>
                      <p className="text-[11px] text-ink-tertiary">{month.label}</p>
                      <p className="text-xs text-ink tabular-nums">{month.count}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top dishes */}
      <Card className="md:col-span-2">
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-secondary">Top dishes (all time)</p>

          {data.topDishes.length === 0 ? (
            <p className="text-ink-tertiary">No dish names available yet.</p>
          ) : (
            <div className="space-y-3">
              {data.topDishes.map((dish) => {
                const widthPercent = (dish.count / topDishMax) * 100;
                return (
                  <div key={dish.dishName} className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-ink truncate">{dish.dishName}</p>
                      <span className="text-sm text-ink-tertiary tabular-nums">{dish.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-canvas-recessed border border-stroke overflow-hidden">
                      <div
                        className="h-full rounded-full bg-love"
                        style={{ width: `${Math.max(widthPercent, 8)}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
