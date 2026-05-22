/**
 * Simple in-memory rate limiter for single-server deployments.
 * Tracks request timestamps per identifier (e.g., user ID).
 */

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitEntry {
  timestamps: number[]
}

// In-memory store - cleared on server restart
const store = new Map<string, RateLimitEntry>()

/**
 * Check if an identifier has exceeded the rate limit.
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Object with isLimited flag and retryAfter seconds
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  isLimited: boolean
  retryAfter: number
  remaining: number
} {
  const now = Date.now()
  const entry = store.get(identifier) || { timestamps: [] }

  // Filter out timestamps outside the window
  const validTimestamps = entry.timestamps.filter((ts) => now - ts < config.windowMs)

  if (validTimestamps.length >= config.maxRequests) {
    // Calculate retry-after based on oldest timestamp in window
    const oldestInWindow = validTimestamps[0]
    const retryAfter = Math.ceil((oldestInWindow + config.windowMs - now) / 1000)
    return { isLimited: true, retryAfter, remaining: 0 }
  }

  // Update store with new request
  validTimestamps.push(now)
  store.set(identifier, { timestamps: validTimestamps })

  return { isLimited: false, retryAfter: 0, remaining: config.maxRequests - validTimestamps.length }
}

/**
 * Clean up expired entries to prevent memory bloat.
 * Call periodically (e.g., on each request or via interval).
 */
export function cleanupExpiredEntries(windowMs: number): void {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    const validTimestamps = entry.timestamps.filter((ts) => now - ts < windowMs)
    if (validTimestamps.length === 0) {
      store.delete(key)
    } else {
      store.set(key, { timestamps: validTimestamps })
    }
  }
}

// Default config for describe endpoint
export const DESCRIBE_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60_000, // 1 minute
}
