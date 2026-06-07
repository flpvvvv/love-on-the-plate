import { randomUUID } from "node:crypto"
import { type NextRequest, NextResponse } from "next/server"
import { GeminiError, generateDescription } from "@/lib/gemini"
import { bufferToBase64, extractExifTakenAt, processImage } from "@/lib/image-processing"
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
    const takenAtStr = formData.get("takenAt") as string | null
    const originalHeaderBase64 = formData.get("originalHeader") as string | null

    // Parse client-provided takenAt (from browser EXIF extraction via exifr)
    // exifr reads only metadata chunks — reliable for JPEG, HEIC, and other formats
    let clientTakenAt: Date | null = null
    if (takenAtStr) {
      const parsed = new Date(takenAtStr)
      if (!Number.isNaN(parsed.getTime())) {
        const year = parsed.getFullYear()
        if (year >= 1990 && year <= 2100) {
          clientTakenAt = parsed
        }
      }
    }

    // Parse original header (first 2MB of original file) for server-side EXIF fallback.
    // The header contains the full EXIF metadata and is small enough to avoid
    // Vercel's 4.5MB body size limit (header ~2MB + compressed file ~1MB = ~3MB total).
    let headerTakenAt: Date | null = null
    if (!clientTakenAt && originalHeaderBase64) {
      try {
        const headerBuffer = Buffer.from(originalHeaderBase64, "base64")
        headerTakenAt = await extractExifTakenAt(headerBuffer)
      } catch (headerErr) {
        console.error("Failed to extract EXIF from file header:", headerErr)
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

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Prefer client EXIF (exifr) → server EXIF from file header → server EXIF from compressed buffer
    const {
      fullBuffer,
      thumbBuffer,
      width,
      height,
      takenAt: compressedTakenAt,
    } = await processImage(buffer)
    const takenAt = clientTakenAt ?? headerTakenAt ?? compressedTakenAt

    // Generate unique ID for the photo
    const photoId = randomUUID()

    // Upload to Supabase Storage using service role
    const serviceClient = await createServiceClient()

    const fullPath = `photos/${photoId}/full.jpg`
    const thumbPath = `photos/${photoId}/thumb.jpg`

    // Upload full image and thumbnail in parallel
    const [fullUploadRes, thumbUploadRes] = await Promise.all([
      serviceClient.storage.from("photos").upload(fullPath, fullBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      }),
      serviceClient.storage.from("photos").upload(thumbPath, thumbBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      }),
    ])

    if (fullUploadRes.error || thumbUploadRes.error) {
      // Clean up any successfully uploaded files
      const toRemove: string[] = []
      if (!fullUploadRes.error) toRemove.push(fullPath)
      if (!thumbUploadRes.error) toRemove.push(thumbPath)
      if (toRemove.length > 0) {
        await serviceClient.storage.from("photos").remove(toRemove)
      }

      const uploadError = fullUploadRes.error || thumbUploadRes.error
      console.error("Storage upload error:", uploadError)
      return NextResponse.json(
        { error: "Failed to upload image to storage.", code: "STORAGE_UPLOAD_ERROR" },
        { status: 500 }
      )
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
      // Set warning message for user
      if (descError instanceof GeminiError) {
        if (descError.code === "RATE_LIMIT") {
          descriptionWarning = "AI description skipped (rate limit). You can regenerate it later."
        } else {
          descriptionWarning = "AI description generation failed. You can regenerate it later."
        }
      } else {
        descriptionWarning = "AI description generation failed. You can regenerate it later."
      }
      // Continue without description - user can regenerate later
    }

    // Insert photo record into database
    const { data: photo, error: dbError } = await serviceClient
      .from("photos")
      .insert({
        id: photoId,
        storage_path: fullPath,
        thumbnail_path: thumbPath,
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
      // Clean up uploaded files
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

    // Provide more specific error messages
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
