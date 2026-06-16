import { randomUUID } from "node:crypto"
import { type NextRequest, NextResponse } from "next/server"
import { GeminiError, generateDescription } from "@/lib/gemini"
import { bufferToBase64, getDimensions } from "@/lib/image-processing"
import { requireAdmin } from "@/lib/supabase/admin-check"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const supabase = await createClient()
    const { user, response } = await requireAdmin(supabase)
    if (response) return response

    // Parse form data with error handling
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (formError) {
      console.error("FormData parse error:", formError)
      return NextResponse.json(
        { error: "Failed to process upload. Please try again.", code: "INVALID_FORM_DATA" },
        { status: 400 }
      )
    }

    const file = formData.get("file") as File | null
    const thumbnailFile = formData.get("thumbnail") as File | null
    const takenAtStr = formData.get("takenAt") as string | null

    // Parse client-provided takenAt (date-only "YYYY-MM-DD" string from client EXIF / date picker)
    let takenAt: Date | null = null
    if (takenAtStr) {
      const parsed = new Date(`${takenAtStr}T00:00:00Z`)
      if (!Number.isNaN(parsed.getTime())) {
        takenAt = parsed
      }
    }

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Please select an image.", code: "NO_FILE" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only JPEG, PNG, WebP, and HEIC are allowed.",
          code: "INVALID_FILE_TYPE",
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB.", code: "FILE_TOO_LARGE" },
        { status: 400 }
      )
    }

    // Convert files to buffers
    const arrayBuffer = await file.arrayBuffer()
    const fullBuffer = Buffer.from(arrayBuffer)

    let thumbBuffer: Buffer | null = null
    if (thumbnailFile) {
      const thumbArrayBuffer = await thumbnailFile.arrayBuffer()
      thumbBuffer = Buffer.from(thumbArrayBuffer)
    }

    // Get image dimensions from JPEG header (no native libs needed)
    const { width, height } = getDimensions(fullBuffer)

    // Generate unique ID for the photo
    const photoId = randomUUID()

    // Upload to Supabase Storage using service role
    const serviceClient = await createServiceClient()

    const fullPath = `photos/${photoId}/full.jpg`
    const thumbPath = `photos/${photoId}/thumb.jpg`

    // Build upload queue
    const uploads: Promise<unknown>[] = [
      serviceClient.storage.from("photos").upload(fullPath, fullBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      }),
    ]

    if (thumbBuffer) {
      uploads.push(
        serviceClient.storage.from("photos").upload(thumbPath, thumbBuffer, {
          contentType: "image/jpeg",
          upsert: false,
        })
      )
    }

    // Upload full image (and thumbnail if available) in parallel
    const [fullUploadRes, thumbUploadRes] = await Promise.allSettled(uploads) as [
      PromiseSettledResult<{ error: unknown } | null>,
      PromiseSettledResult<{ error: unknown } | null> | undefined,
    ]

    if (fullUploadRes.status === "rejected" || (fullUploadRes.status === "fulfilled" && fullUploadRes.value?.error)) {
      console.error("Full image upload error:", fullUploadRes.status === "rejected" ? fullUploadRes.reason : fullUploadRes.value?.error)
      return NextResponse.json(
        { error: "Failed to upload full image to storage.", code: "STORAGE_UPLOAD_ERROR" },
        { status: 500 }
      )
    }

    if (thumbUploadRes?.status === "rejected") {
      console.error("Thumbnail upload error:", thumbUploadRes.reason)
      // Non-fatal: continue without thumbnail
    }
    if (thumbUploadRes?.status === "fulfilled" && thumbUploadRes.value?.error) {
      console.error("Thumbnail storage error:", thumbUploadRes.value.error)
      // Non-fatal: continue without thumbnail
    }

    // Generate AI descriptions (English and Chinese) and ingredients
    let dishName = ""
    let descriptionEn = ""
    let descriptionCn = ""
    let ingredients: string[] = []
    let descriptionWarning: string | undefined

    try {
      // Fetch existing ingredients for tag consistency
      const { data: knownRows } = await serviceClient
        .from("photos")
        .select("ingredients")
        .not("ingredients", "eq", "{}")
        .limit(500)
      const knownSet = new Set<string>()
      for (const row of knownRows ?? []) {
        if (Array.isArray(row.ingredients)) {
          for (const ing of row.ingredients) {
            if (typeof ing === "string" && ing.trim()) {
              knownSet.add(ing.trim())
            }
          }
        }
      }
      const knownIngredients = Array.from(knownSet)

      const descriptions = await generateDescription(
        bufferToBase64(fullBuffer),
        undefined,
        knownIngredients
      )
      dishName = descriptions.dishName
      descriptionEn = descriptions.en
      descriptionCn = descriptions.cn
      ingredients = descriptions.ingredients
    } catch (descError) {
      console.error("Description generation error:", descError)
      if (descError instanceof GeminiError) {
        if (descError.code === "RATE_LIMIT") {
          descriptionWarning = "AI description skipped (rate limit). You can regenerate it later."
        } else {
          descriptionWarning = "AI description generation failed. You can regenerate it later."
        }
      } else {
        descriptionWarning = "AI description generation failed. You can regenerate it later."
      }
    }

    // Insert photo record into database
    const { data: photo, error: dbError } = await serviceClient
      .from("photos")
      .insert({
        id: photoId,
        storage_path: fullPath,
        thumbnail_path: thumbBuffer ? thumbPath : null,
        dish_name: dishName,
        description_en: descriptionEn,
        description_cn: descriptionCn,
        ingredients,
        original_filename: file.name,
        file_size: fullBuffer.length,
        width,
        height,
        taken_at: takenAt?.toISOString() ?? null,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database insert error:", dbError)
      await serviceClient.storage.from("photos").remove([fullPath, thumbPath])
      return NextResponse.json(
        { error: "Failed to save photo record.", code: "DB_INSERT_ERROR" },
        { status: 500 }
      )
    }

    // Get public URLs
    const { data: fullUrlData } = serviceClient.storage.from("photos").getPublicUrl(fullPath)
    const { data: thumbUrlData } = serviceClient.storage.from("photos").getPublicUrl(thumbPath)

    return NextResponse.json({
      ...photo,
      imageUrl: fullUrlData.publicUrl,
      thumbnailUrl: thumbUrlData.publicUrl,
      ...(descriptionWarning && { warning: descriptionWarning }),
    })
  } catch (error) {
    console.error("Upload error:", error)

    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return NextResponse.json(
        {
          error: "Network error during upload. Please check your connection.",
          code: "NETWORK_ERROR",
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Upload failed. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }
}
