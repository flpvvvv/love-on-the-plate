import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useHeartbeat } from "./use-heartbeat"

describe("useHeartbeat", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns initial isBeating state as false", () => {
    const { result } = renderHook(() => useHeartbeat())
    expect(result.current.isBeating).toBe(false)
  })

  it("returns trigger function", () => {
    const { result } = renderHook(() => useHeartbeat())
    expect(result.current.trigger).toBeInstanceOf(Function)
  })

  it("sets isBeating to true when trigger is called", () => {
    const { result } = renderHook(() => useHeartbeat())

    act(() => {
      result.current.trigger()
    })

    expect(result.current.isBeating).toBe(true)
  })

  it("sets isBeating back to false after duration", () => {
    const { result } = renderHook(() => useHeartbeat({ duration: 1000 }))

    act(() => {
      result.current.trigger()
    })

    expect(result.current.isBeating).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.isBeating).toBe(false)
  })

  it("uses custom duration", () => {
    const { result } = renderHook(() => useHeartbeat({ duration: 500 }))

    act(() => {
      result.current.trigger()
    })

    expect(result.current.isBeating).toBe(true)

    act(() => {
      vi.advanceTimersByTime(400)
    })

    expect(result.current.isBeating).toBe(true)

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current.isBeating).toBe(false)
  })

  it("uses default duration of 1000ms", () => {
    const { result } = renderHook(() => useHeartbeat())

    act(() => {
      result.current.trigger()
    })

    act(() => {
      vi.advanceTimersByTime(999)
    })

    expect(result.current.isBeating).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(result.current.isBeating).toBe(false)
  })

  it("can be triggered again after duration completes", () => {
    const { result } = renderHook(() => useHeartbeat({ duration: 1000 }))

    act(() => {
      result.current.trigger()
    })

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.isBeating).toBe(false)

    act(() => {
      result.current.trigger()
    })

    expect(result.current.isBeating).toBe(true)
  })
})
