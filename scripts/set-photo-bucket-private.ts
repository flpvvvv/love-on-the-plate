/**
 * Makes the `photos` Storage bucket private.
 *
 * Run this **after** the release that serves images through `/api/images/*` is
 * live. Until then the deployed client still requests public Supabase URLs.
 *
 * Private is what stops third parties from bulk-downloading the bucket: the
 * public object endpoint stops serving files, `/object/list` stops working for
 * anon, and every image read goes through the first-party proxy, which the
 * Vercel CDN caches for a year.
 */

try {
  process.loadEnvFile(".env.local")
} catch {
  // Environment may already be provided by the shell / CI.
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY

if (!url || !secretKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set.")
}

const endpoint = `${url}/storage/v1/bucket/photos`
const headers = {
  Authorization: `Bearer ${secretKey}`,
  apikey: secretKey,
  "Content-Type": "application/json",
}

const current = await fetch(endpoint, { headers })
if (!current.ok) {
  throw new Error(`Bucket read failed (${current.status}): ${await current.text()}`)
}
const bucket = (await current.json()) as {
  id: string
  name: string
  public: boolean
  file_size_limit: number | null
  allowed_mime_types: string[] | null
}

if (bucket.public === false) {
  console.log(`Bucket "${bucket.name}" is already private.`)
  process.exit(0)
}

// Send the existing constraints back so the update only flips `public`.
const update = await fetch(endpoint, {
  method: "PUT",
  headers,
  body: JSON.stringify({
    id: bucket.id,
    name: bucket.name,
    public: false,
    file_size_limit: bucket.file_size_limit,
    allowed_mime_types: bucket.allowed_mime_types,
  }),
})

if (!update.ok) {
  throw new Error(`Bucket update failed (${update.status}): ${await update.text()}`)
}

const after = await fetch(endpoint, { headers })
if (!after.ok) {
  throw new Error(`Bucket read failed (${after.status}): ${await after.text()}`)
}

const { public: isPublic, name: bucketName } = (await after.json()) as {
  public: boolean
  name: string
}
console.log(`Bucket "${bucketName}" public=${isPublic}`)

export {}
