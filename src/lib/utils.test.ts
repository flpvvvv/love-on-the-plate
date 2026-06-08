import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  formatDate,
  formatDayDate,
  formatMonthYear,
  formatRelativeTime,
  getDisplayDate,
  groupByMonthAndDate,
} from "./utils"

describe("formatDate", () => {
  it("formats date with month name", () => {
    const date = new Date("2026-02-15")
    expect(formatDate(date)).toBe("February 15, 2026")
  })

  it("accepts string date input", () => {
    expect(formatDate("2026-03-20")).toBe("March 20, 2026")
  })
})

describe("formatMonthYear", () => {
  it("formats month and year", () => {
    const date = new Date("2026-02-15")
    expect(formatMonthYear(date)).toBe("February 2026")
  })

  it("accepts string date input", () => {
    expect(formatMonthYear("2026-03-20")).toBe("March 2026")
  })
})

describe("formatDayDate", () => {
  it("formats weekday, month and day", () => {
    const date = new Date("2026-02-15") // Sunday
    expect(formatDayDate(date)).toBe("Sunday, Feb 15")
  })

  it("accepts string date input", () => {
    expect(formatDayDate("2026-03-20")).toBe("Friday, Mar 20")
  })
})

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns 'Just now' for recent times", () => {
    vi.setSystemTime(new Date("2026-02-15T12:00:00"))
    const date = new Date("2026-02-15T11:59:30")
    expect(formatRelativeTime(date)).toBe("Just now")
  })

  it("returns minutes for times under an hour", () => {
    vi.setSystemTime(new Date("2026-02-15T12:00:00"))
    const date = new Date("2026-02-15T11:30:00")
    expect(formatRelativeTime(date)).toBe("30 minutes ago")
  })

  it("returns hours for times under a day", () => {
    vi.setSystemTime(new Date("2026-02-15T12:00:00"))
    const date = new Date("2026-02-15T08:00:00")
    expect(formatRelativeTime(date)).toBe("4 hours ago")
  })

  it("returns days for times under a week", () => {
    vi.setSystemTime(new Date("2026-02-15T12:00:00"))
    const date = new Date("2026-02-12T12:00:00")
    expect(formatRelativeTime(date)).toBe("3 days ago")
  })

  it("returns formatted date for times over a week", () => {
    vi.setSystemTime(new Date("2026-02-15T12:00:00"))
    const date = new Date("2026-02-05T12:00:00")
    expect(formatRelativeTime(date)).toBe("February 5, 2026")
  })
})

describe("getDisplayDate", () => {
  it("prefers display_date over taken_at and created_at", () => {
    const photo = {
      display_date: "2026-03-20",
      taken_at: "2026-01-10",
      created_at: "2026-02-15",
    }
    const result = getDisplayDate(photo)
    expect(result.toISOString().slice(0, 10)).toBe("2026-03-20")
  })

  it("returns taken_at when available", () => {
    const photo = { taken_at: "2026-01-10", created_at: "2026-02-15" }
    const result = getDisplayDate(photo)
    expect(result.toISOString().slice(0, 10)).toBe("2026-01-10")
  })

  it("returns created_at when taken_at is null", () => {
    const photo = { taken_at: null, created_at: "2026-02-15" }
    const result = getDisplayDate(photo)
    expect(result.toISOString().slice(0, 10)).toBe("2026-02-15")
  })

  it("returns created_at when taken_at is undefined", () => {
    const photo = { created_at: "2026-02-15" }
    const result = getDisplayDate(photo)
    expect(result.toISOString().slice(0, 10)).toBe("2026-02-15")
  })
})

describe("groupByMonthAndDate", () => {
  it("groups items by month and date in reverse chronological order", () => {
    const items = [
      { id: 1, date: "2026-02-15" },
      { id: 2, date: "2026-02-14" },
      { id: 3, date: "2026-01-20" },
      { id: 4, date: "2026-02-15" }, // same day as item 1
    ]

    const result = groupByMonthAndDate(items, (item) => item.date)

    expect(result.length).toBe(2) // February and January
    expect(result[0].monthKey).toBe("2026-02") // Newest month first
    expect(result[1].monthKey).toBe("2026-01")

    // Within February, dates should be descending
    expect(result[0].dates.length).toBe(2) // Feb 15 and Feb 14
    expect(result[0].dates[0].dateKey).toBe("2026-02-15")
    expect(result[0].dates[0].items.length).toBe(2) // Two items on Feb 15
    expect(result[0].dates[1].dateKey).toBe("2026-02-14")
  })

  it("returns empty array for empty input", () => {
    expect(groupByMonthAndDate([], (item: { date: string }) => item.date)).toEqual([])
  })

  it("handles single item", () => {
    const items = [{ id: 1, date: "2026-02-15" }]
    const result = groupByMonthAndDate(items, (item) => item.date)
    expect(result.length).toBe(1)
    expect(result[0].dates.length).toBe(1)
    expect(result[0].dates[0].items.length).toBe(1)
  })
})
