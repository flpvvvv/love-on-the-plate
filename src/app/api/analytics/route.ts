import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AnalyticsResponse, DailyTrendPoint, DishCount, MonthlyCount } from '@/types';

const PAGE_SIZE = 1000;
const MONTH_WINDOW = 12;
const RECENT_DAYS = 30;
const TOP_DISHES_LIMIT = 8;

type CreatedAtRow = { created_at: string };
type DishNameRow = { dish_name: string | null };

function formatMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthLabelFromKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function getMonthWindow(now: Date): string[] {
  const keys: string[] = [];
  for (let i = MONTH_WINDOW - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(formatMonthKey(date));
  }
  return keys;
}

function getDailyWindow(now: Date): string[] {
  const keys: string[] = [];
  for (let i = RECENT_DAYS - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    keys.push(formatDateKey(date));
  }
  return keys;
}

async function fetchPagedRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);

    if (error) {
      throw new Error('Failed to fetch analytics rows');
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const now = new Date();

    const { count, error: countError } = await supabase
      .from('photos')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('Analytics count error:', countError);
      return NextResponse.json({ error: 'Failed to fetch analytics count' }, { status: 500 });
    }

    const monthKeys = getMonthWindow(now);
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTH_WINDOW - 1), 1),
    ).toISOString();

    const dailyKeys = getDailyWindow(now);
    const dailyStart = `${dailyKeys[0]}T00:00:00.000Z`;

    const createdRows = await fetchPagedRows<CreatedAtRow>((from, to) =>
      supabase
        .from('photos')
        .select('created_at')
        .gte('created_at', monthStart)
        .order('created_at', { ascending: false })
        .range(from, to),
    );

    const monthCounts = new Map(monthKeys.map((key) => [key, 0]));
    const dailyCounts = new Map(dailyKeys.map((key) => [key, 0]));

    for (const row of createdRows) {
      const createdAt = new Date(row.created_at);
      const monthKey = formatMonthKey(createdAt);
      if (monthCounts.has(monthKey)) {
        monthCounts.set(monthKey, (monthCounts.get(monthKey) ?? 0) + 1);
      }

      if (row.created_at >= dailyStart) {
        const dayKey = formatDateKey(createdAt);
        if (dailyCounts.has(dayKey)) {
          dailyCounts.set(dayKey, (dailyCounts.get(dayKey) ?? 0) + 1);
        }
      }
    }

    const dishRows = await fetchPagedRows<DishNameRow>((from, to) =>
      supabase
        .from('photos')
        .select('dish_name')
        .not('dish_name', 'is', null)
        .neq('dish_name', '')
        .range(from, to),
    );

    const topDishesMap = new Map<string, number>();
    for (const row of dishRows) {
      const dishName = row.dish_name?.trim();
      if (!dishName) continue;
      topDishesMap.set(dishName, (topDishesMap.get(dishName) ?? 0) + 1);
    }

    const perMonth: MonthlyCount[] = monthKeys.map((month) => ({
      month,
      label: monthLabelFromKey(month),
      count: monthCounts.get(month) ?? 0,
    }));

    const recentTrend: DailyTrendPoint[] = dailyKeys.map((date) => ({
      date,
      count: dailyCounts.get(date) ?? 0,
    }));

    const topDishes: DishCount[] = [...topDishesMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_DISHES_LIMIT)
      .map(([dishName, dishCount]) => ({ dishName, count: dishCount }));

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
