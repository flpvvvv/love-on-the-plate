import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the display date for a photo.
 * Prefers taken_at (EXIF capture time) over created_at (upload time).
 */
export function getDisplayDate(photo: { taken_at?: string | null; created_at: string }): Date {
  return photo.taken_at ? new Date(photo.taken_at) : new Date(photo.created_at)
}

// Date formatter using Intl.DateTimeFormat for proper i18n
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
})

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return dateFormatter.format(d)
}

// Month-year formatter for timeline grouping (e.g., "February 2026")
const monthYearFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
})

export function formatMonthYear(date: string | Date): string {
  const d = new Date(date)
  return monthYearFormatter.format(d)
}

// Day-date formatter for timeline subheaders (e.g., "Tuesday, Feb 11")
const dayDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
})

export function formatDayDate(date: string | Date): string {
  const d = new Date(date)
  return dayDateFormatter.format(d)
}

// Group items by a date key (YYYY-MM for months, YYYY-MM-DD for days)
function toDateKey(date: string | Date): string {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function toMonthKey(date: string | Date): string {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export interface DateGroup<T> {
  dateKey: string
  label: string
  items: T[]
}

export interface MonthGroup<T> {
  monthKey: string
  label: string
  dates: DateGroup<T>[]
}

/**
 * Groups items by month and date using a date accessor.
 * Returns months in reverse chronological order (newest first),
 * with dates within each month also in reverse chronological order.
 */
export function groupByMonthAndDate<T>(
  items: T[],
  getDate: (item: T) => string | Date
): MonthGroup<T>[] {
  const monthMap = new Map<string, Map<string, T[]>>()

  for (const item of items) {
    const date = getDate(item)
    const mKey = toMonthKey(date)
    const dKey = toDateKey(date)

    if (!monthMap.has(mKey)) {
      monthMap.set(mKey, new Map())
    }
    const dateMap = monthMap.get(mKey)!
    if (!dateMap.has(dKey)) {
      dateMap.set(dKey, [])
    }
    dateMap.get(dKey)!.push(item)
  }

  // Sort months descending (newest first)
  const sortedMonthKeys = [...monthMap.keys()].sort((a, b) => b.localeCompare(a))

  return sortedMonthKeys.map((mKey) => {
    const dateMap = monthMap.get(mKey)!
    // Sort dates descending within the month
    const sortedDateKeys = [...dateMap.keys()].sort((a, b) => b.localeCompare(a))

    const dates: DateGroup<T>[] = sortedDateKeys.map((dKey) => ({
      dateKey: dKey,
      label: formatDayDate(dKey),
      items: dateMap.get(dKey)!,
    }))

    // Use the first item's date for the month label
    const firstDate = dateMap.get(sortedDateKeys[0])![0]
    return {
      monthKey: mKey,
      label: formatMonthYear(getDate(firstDate)),
      dates,
    }
  })
}

// Relative time formatter
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) {
    return formatDate(d)
  } else if (days > 0) {
    return rtf.format(-days, "day")
  } else if (hours > 0) {
    return rtf.format(-hours, "hour")
  } else if (minutes > 0) {
    return rtf.format(-minutes, "minute")
  } else {
    return "Just now"
  }
}
