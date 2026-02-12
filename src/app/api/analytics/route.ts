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

    // Total count (efficient head-only query)
    const { count, error: countError } = await supabase
      .from('photos')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('Analytics count error:', countError);
      return NextResponse.json({ error: 'Failed to fetch analytics count' }, { status: 500 });
    }

    // Monthly counts via SQL aggregation (instead of fetching all rows)
    const monthKeys = getMonthWindow(now);
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTH_WINDOW - 1), 1),
    ).toISOString();

    const { data: monthlyRows, error: monthlyError } = await supabase
      .rpc('get_monthly_photo_counts', { since: monthStart });

    if (monthlyError) {
      console.error('Monthly counts error:', monthlyError);
      return NextResponse.json({ error: 'Failed to fetch monthly counts' }, { status: 500 });
    }

    // Build lookup from DB results, then fill in missing months with 0
    const monthlyMap = new Map<string, number>();
    for (const row of monthlyRows ?? []) {
      monthlyMap.set(row.month, Number(row.photo_count));
    }

    const perMonth: MonthlyCount[] = monthKeys.map((month) => ({
      month,
      label: monthLabelFromKey(month),
      count: monthlyMap.get(month) ?? 0,
    }));

    // Daily counts via SQL aggregation
    const dailyKeys = getDailyWindow(now);
    const dailyStart = `${dailyKeys[0]}T00:00:00.000Z`;

    const { data: dailyRows, error: dailyError } = await supabase
      .rpc('get_daily_photo_counts', { since: dailyStart });

    if (dailyError) {
      console.error('Daily counts error:', dailyError);
      return NextResponse.json({ error: 'Failed to fetch daily counts' }, { status: 500 });
    }

    const dailyMap = new Map<string, number>();
    for (const row of dailyRows ?? []) {
      dailyMap.set(row.day, Number(row.photo_count));
    }

    const recentTrend: DailyTrendPoint[] = dailyKeys.map((date) => ({
      date,
      count: dailyMap.get(date) ?? 0,
    }));

    // Top dishes via SQL aggregation
    const { data: dishRows, error: dishError } = await supabase
      .rpc('get_top_dishes', { lim: TOP_DISHES_LIMIT });

    if (dishError) {
      console.error('Top dishes error:', dishError);
      return NextResponse.json({ error: 'Failed to fetch top dishes' }, { status: 500 });
    }

    const topDishes: DishCount[] = (dishRows ?? []).map((row: { dish_name: string; dish_count: number }) => ({
      dishName: row.dish_name,
      count: Number(row.dish_count),
    }));

    const payload: AnalyticsResponse = {
      totalCount: count ?? 0,
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
