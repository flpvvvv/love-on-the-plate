"use client"

import { useEffect } from "react"

/**
 * Compensates for the iOS Safari dynamic toolbar overlapping fixed-bottom elements.
 *
 * ## The Problem
 *
 * On iOS Safari the bottom toolbar (URL bar + back/forward/share buttons) is drawn
 * *on top* of the web viewport. When the toolbar is expanded (e.g. user scrolls up
 * or taps the collapsed bar), it covers `position: fixed; bottom: 0` elements.
 * `window.innerHeight` (the layout viewport) stays constant regardless of the
 * toolbar state, so pure-CSS approaches like `100vh` cannot account for it.
 *
 * ## How It Works
 *
 * The Visual Viewport API exposes the *visible* area of the page. By comparing
 * `window.innerHeight` (layout viewport) with `visualViewport.height + offsetTop`
 * (visual viewport), we get the exact pixel height of the overlapping toolbar.
 * This value is written to the CSS custom property `--ios-bottom-offset` on
 * `<html>`, which the `.safe-bottom` CSS class consumes as extra `padding-bottom`.
 *
 * ## Cross-Platform Behaviour
 *
 * | Platform         | Toolbar position | `innerHeight` updates? | Hook activates? |
 * |------------------|-----------------|------------------------|-----------------|
 * | iOS Safari       | Bottom          | No (stays at LVH)      | Yes             |
 * | iOS Chrome / FF  | Bottom (WebKit) | No                     | Yes             |
 * | Android Chrome   | Top             | Yes (tracks toolbar)   | No — not iOS    |
 * | Android Firefox  | Top             | Yes                    | No — not iOS    |
 * | Desktop browsers | N/A             | N/A                    | No — no touch   |
 *
 * On Android, `window.innerHeight` already adjusts when the top address bar
 * appears / disappears, so the offset would always be ~0. Restricting activation
 * to iOS prevents false positives from the Android keyboard suggestion bar or
 * other minor viewport fluctuations.
 *
 * ## Safety Bounds
 *
 * Offsets > 100 px are ignored — they indicate the virtual keyboard is open, not
 * the toolbar. The keyboard is a separate concern handled elsewhere (or not at all
 * for a bottom nav, which should hide behind it).
 */
export function useIOSSafeBottom(): void {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    // ── iOS gate ─────────────────────────────────────────────────────────
    // The dynamic-bottom-toolbar problem is specific to iOS Safari (and iOS
    // Chrome / Firefox which use WebKit). Android has the toolbar at the top.
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      // iPadOS 13+ reports "MacIntel" with touch support
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

    if (!isIOS) return

    // ── Offset tracking ──────────────────────────────────────────────────
    const root = document.documentElement
    let rafId: number
    let lastOffset = -1

    const update = () => {
      // Layout viewport bottom minus visual viewport bottom = toolbar height.
      const offset = Math.round(window.innerHeight - vv.height - vv.offsetTop)

      // Only accept small positive offsets (1–100 px). Larger values mean
      // the virtual keyboard is open — we don't compensate for that.
      const safeOffset = offset > 1 && offset < 100 ? offset : 0

      if (safeOffset !== lastOffset) {
        lastOffset = safeOffset
        root.style.setProperty("--ios-bottom-offset", `${safeOffset}px`)
      }
    }

    const onResize = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(update)
    }

    vv.addEventListener("resize", onResize)
    update() // initial measurement

    return () => {
      vv.removeEventListener("resize", onResize)
      cancelAnimationFrame(rafId)
      root.style.removeProperty("--ios-bottom-offset")
    }
  }, [])
}
