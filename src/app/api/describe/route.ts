import { type NextRequest, NextResponse } from "next/server"
import { GeminiError, generateDescription } from "@/lib/gemini"
import { checkRateLimit, cleanupExpiredEntries, DESCRIBE_RATE_LIMIT } from "@/lib/rate-limiter"
import { requireAdmin } from "@/lib/supabase/admin-check"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { isValidBase64Image, isValidUUID, MAX_BASE64_LENGTH } from "@/lib/validation"

// Allow longer processing time for AI description generation
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const supabase = await createClient()
    const { user, response } = await requireAdmin(supabase)
    if (response) return response

    // Check rate limit (per user) - user is guaranteed non-null when error is null
    const rateLimitResult = checkRateLimit(user.id, DESCRIBE_RATE_LIMIT)
    cleanupExpiredEntries(DESCRIBE_RATE_LIMIT.windowMs)

    if (rateLimitResult.isLimited) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Please wait ${rateLimitResult.retryAfter} seconds before trying again.`,
          code: "RATE_LIMIT",
          isRetryable: true,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimitResult.retryAfter) },
        }
      )
    }

    // Safely parse JSON body
    let body: {
      photoId?: string
      imageBase64?: string
      dishName?: string
      descriptionEn?: string
      descriptionCn?: string
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid request format.", code: "INVALID_REQUEST" },
        { status: 400 }
      )
    }

    const { photoId, imageBase64, dishName } = body

    // Option 1: Generate description from base64 image (for preview)
    if (imageBase64) {
      // Validate base64 data with size limit
      const isValid = isValidBase64Image(imageBase64)
      const isTooLarge = typeof imageBase64 === "string" && imageBase64.length > MAX_BASE64_LENGTH
      if (!isValid) {
        return NextResponse.json(
          {
            error: isTooLarge ? "Image too large to process." : "Invalid image data provided.",
            code: isTooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_IMAGE",
          },
          { status: 400 }
        )
      }

      // Validate dishName if provided (must be a non-empty string)
      const dishNameHint =
        typeof dishName === "string" && dishName.trim().length > 0 ? dishName.trim() : undefined

      try {
        const descriptions = await generateDescription(imageBase64, dishNameHint)
        return NextResponse.json({
          dishName: descriptions.dishName,
          descriptionEn: descriptions.en,
          descriptionCn: descriptions.cn,
        })
      } catch (error) {
        // Handle Gemini-specific errors
        if (error instanceof GeminiError) {
          console.error(`Gemini error [${error.code}]:`, error.message)
          return NextResponse.json(
            {
              error: error.userMessage,
              code: error.code,
              isRetryable: error.isRetryable,
            },
            { status: error.code === "RATE_LIMIT" ? 429 : 500 }
          )
        }
        throw error
      }
    }

    // Option 2: Regenerate description for existing photo
    if (!photoId) {
      return NextResponse.json(
        { error: "Photo ID or image data required.", code: "MISSING_DATA" },
        { status: 400 }
      )
    }

    // Validate UUID format
    if (!isValidUUID(photoId)) {
      return NextResponse.json(
        { error: "Invalid photo ID format.", code: "INVALID_ID" },
        { status: 400 }
      )
    }

    // Get photo from database (only fields needed for regeneration)
    const serviceClient = await createServiceClient()
    const { data: photo, error: fetchError } = await serviceClient
      .from("photos")
      .select("storage_path, uploaded_by")
      .eq("id", photoId)
      .single()

    if (fetchError || !photo) {
      return NextResponse.json({ error: "Photo not found.", code: "NOT_FOUND" }, { status: 404 })
    }

    // Verify ownership
    if (photo.uploaded_by !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to edit this photo.", code: "FORBIDDEN" },
        { status: 403 }
      )
    }

    // Download the image from storage
    const { data: imageData, error: downloadError } = await serviceClient.storage
      .from("photos")
      .download(photo.storage_path)

    if (downloadError || !imageData) {
      return NextResponse.json(
        { error: "Failed to load photo from storage.", code: "STORAGE_ERROR" },
        { status: 500 }
      )
    }

    // Convert blob to base64
    const arrayBuffer = await imageData.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    try {
      // Generate new descriptions (English and Chinese)
      const descriptions = await generateDescription(base64)

      // Update the photo record
      const { error: updateError } = await serviceClient
        .from("photos")
        .update({
          dish_name: descriptions.dishName,
          description_en: descriptions.en,
          description_cn: descriptions.cn,
        })
        .eq("id", photoId)

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to save description.", code: "DB_ERROR" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        dishName: descriptions.dishName,
        descriptionEn: descriptions.en,
        descriptionCn: descriptions.cn,
      })
    } catch (error) {
      // Handle Gemini-specific errors
      if (error instanceof GeminiError) {
        console.error(`Gemini error [${error.code}]:`, error.message)
        return NextResponse.json(
          {
            error: error.userMessage,
            code: error.code,
            isRetryable: error.isRetryable,
          },
          { status: error.code === "RATE_LIMIT" ? 429 : 500 }
        )
      }
      throw error
    }
  } catch (error) {
    console.error("Description generation error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }
}
