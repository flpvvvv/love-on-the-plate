const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VARIANT_RE = /^(thumb|full)\.jpg$/

/**
 * Public URL for a Supabase storage object, served by our own image route.
 *
 * Storage URLs are never sent to clients: the bucket is private, so raw
 * `*.supabase.co` URLs cannot be scraped or hotlinked. Every byte Supabase
 * serves is fetched by `/api/images/[...path]`, which puts the Vercel CDN and a
 * one-year immutable cache in front of it.
 */
export function photoImageUrl(storagePath: string): string {
  return `/api/images/${storagePath.split("/").map(encodeURIComponent).join("/")}`
}

/**
 * Validates decoded route segments and returns the storage path, or null.
 * Rejects anything outside `photos/<uuid>/{thumb,full}.jpg` so the proxy
 * can never be used to read another bucket or path.
 */
export function parsePhotoImagePath(segments: readonly string[]): string | null {
  if (segments.length !== 3) return null

  const [folder, id, variant] = segments
  if (folder !== "photos" || !UUID_RE.test(id) || !VARIANT_RE.test(variant)) return null

  return `${folder}/${id}/${variant}`
}
