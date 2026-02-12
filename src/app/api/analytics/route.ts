import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AnalyticsResponse, DailyTrendPoint, DishCount, MonthlyCount } from '@/types';

const MONTH_WINDOW = 12;
const RECENT_DAYS = 30;
const TOP_DISHES_LIMIT = 8;

function monthLabelFromKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function getMonthWindow(now: Date): string[] {
  const keys: string[] = [];
  for (let i = MONTH_WINDOW - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    keys.push(`${year}-${month}`);
  }
  return keys;
}

function getDailyWindow(now: Date): string[] {
  const keys: string[] = [];
  for (let i = RECENT_DAYS - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    keys.push(`${year}-${month}-${day}`);
  }
  return keys;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const now = new Date();

    const monthKeys = getMonthWindow(now);
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTH_WINDOW - 1), 1),
    ).toISOString();

    const dailyKeys = getDailyWindow(now);
    const dailyStart = `${dailyKeys[0]}T00:00:00.000Z`;

    // Run all four independent queries in parallel (was sequential — 4 round-trips → 1)
    const [countRes, monthlyRes, dailyRes, dishRes] = await Promise.all([
      supabase.from('photos').select('id', { count: 'exact', head: true }),
      supabase.rpc('get_monthly_photo_counts', { since: monthStart }),
      supabase.rpc('get_daily_photo_counts', { since: dailyStart }),
      supabase.rpc('get_top_dishes', { lim: TOP_DISHES_LIMIT }),
    ]);

    if (countRes.error) {
      console.error('Analytics count error:', countRes.error);
      return NextResponse.json({ error: 'Failed to fetch analytics count' }, { status: 500 });
    }

    if (monthlyRes.error) {
      console.error('Monthly counts error:', monthlyRes.error);
      return NextResponse.json({ error: 'Failed to fetch monthly counts' }, { status: 500 });
    }

    if (dailyRes.error) {
      console.error('Daily counts error:', dailyRes.error);
      return NextResponse.json({ error: 'Failed to fetch daily counts' }, { status: 500 });
    }

    if (dishRes.error) {
      console.error('Top dishes error:', dishRes.error);
      return NextResponse.json({ error: 'Failed to fetch top dishes' }, { status: 500 });
    }

    // Build lookup from DB results, then fill in missing months with 0
    const monthlyMap = new Map<string, number>();
    for (const row of monthlyRes.data ?? []) {
      monthlyMap.set(row.month, Number(row.photo_count));
    }

    const perMonth: MonthlyCount[] = monthKeys.map((month) => ({
      month,
      label: monthLabelFromKey(month),
      count: monthlyMap.get(month) ?? 0,
    }));

    const dailyMap = new Map<string, number>();
    for (const row of dailyRes.data ?? []) {
      dailyMap.set(row.day, Number(row.photo_count));
    }

    const recentTrend: DailyTrendPoint[] = dailyKeys.map((date) => ({
      date,
      count: dailyMap.get(date) ?? 0,
    }));

    const topDishes: DishCount[] = (dishRes.data ?? []).map((row: { dish_name: string; dish_count: number }) => ({
      dishName: row.dish_name,
      count: Number(row.dish_count),
    }));

    const payload: AnalyticsResponse = {
      totalCount: countRes.count ?? 0,
      perMonth,
      topDishes,
      recentTrend,
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
