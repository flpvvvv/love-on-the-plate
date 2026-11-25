import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { parsePhotoImagePath } from "@/lib/photo-image"

/**
 * One-year, immutable cache. Objects live at `photos/<uuid>/<variant>.jpg` and
 * are never overwritten (uploads write to a fresh UUID with `upsert: false`),
 * so a cached response can never go stale.
 *
 * `CDN-Cache-Control` keeps Vercel's CDN from stripping `s-maxage` from the
 * browser copy; the result is cached both at the edge and in the browser.
 */
const IMMUTABLE_CACHE = "public, max-age=31536000, s-maxage=31536000, immutable"

/** Kept short: a missing object may appear later (e.g. a backfill). */
const MISS_CACHE = "public, max-age=60"

export const runtime = "nodejs"

let storage: SupabaseClient | undefined

/**
 * Cookie-less service-role client, reused across requests. Reading cookies
 * here would make this route uncacheable at the CDN.
 */
function storageClient(): SupabaseClient {
  if (storage) return storage

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!url || !secretKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.")
  }

  storage = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return storage
}

function imageResponse(body: ArrayBuffer): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(body.byteLength),
      "Cache-Control": IMMUTABLE_CACHE,
      "CDN-Cache-Control": IMMUTABLE_CACHE,
    },
  })
}

function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": MISS_CACHE },
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const storagePath = parsePhotoImagePath((await params).path)
  if (!storagePath) return notFound()

  const { data, error } = await storageClient().storage.from("photos").download(storagePath)
  if (error || !data) return notFound()

  return imageResponse(await data.arrayBuffer())
}
