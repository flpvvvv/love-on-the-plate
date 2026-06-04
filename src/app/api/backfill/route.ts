import { type NextRequest, NextResponse } from "next/server"
import { generateDescription, generateIngredients } from "@/lib/gemini"
import { requireAdmin } from "@/lib/supabase/admin-check"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { isValidUUID } from "@/lib/validation"

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const supabase = await createClient()
    const { response } = await requireAdmin(supabase)
    if (response) return response

    const serviceClient = await createServiceClient()

    const body = await request.json()
    const { photoId } = body

    // If a specific photoId is provided, only backfill that one
    if (photoId) {
      // Validate UUID format
      if (!isValidUUID(photoId)) {
        return NextResponse.json({ error: "Invalid photo ID format" }, { status: 400 })
      }
      const { data: photo, error: fetchError } = await serviceClient
        .from("photos")
        .select("id, dish_name, description_cn, description_en, ingredients, storage_path")
        .eq("id", photoId)
        .single()

      if (fetchError || !photo) {
        return NextResponse.json({ error: "Photo not found" }, { status: 404 })
      }
      const result = await backfillSinglePhoto(serviceClient, photo)
      return NextResponse.json(result)
    }

    // Otherwise, backfill all photos without dish names, descriptions, or ingredients
    // Only fetch necessary fields for filtering
    const { data: photos, error: fetchError } = await serviceClient
      .from("photos")
      .select("id, storage_path, dish_name, description_cn, description_en, ingredients")
      .or(
        "dish_name.is.null,dish_name.eq.,description_cn.is.null,description_cn.eq.,description_en.is.null,description_en.eq.,ingredients.is.null"
      )
      .order("created_at", { ascending: false })

    if (fetchError) {
      console.error("Fetch photos error:", fetchError)
      return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 })
    }

    const results = {
      total: photos.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Process photos one by one to avoid rate limiting
    for (const photo of photos) {
      try {
        await backfillSinglePhoto(serviceClient, photo)
        results.success++
      } catch (error) {
        results.failed++
        // Sanitize error message - only include safe, expected errors
        const safeErrors = ["Photo not found", "Failed to fetch image", "Failed to update photo"]
        const errorMsg =
          error instanceof Error && safeErrors.includes(error.message)
            ? error.message
            : "Processing failed"
        results.errors.push(`Photo ${results.failed}: ${errorMsg}`)
      }

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Backfill error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

interface BackfillPhoto {
  id: string
  storage_path?: string
  dish_name: string | null
  description_cn: string | null
  description_en: string | null
  ingredients: string[] | null
}

async function backfillSinglePhoto(
  serviceClient: Awaited<ReturnType<typeof createServiceClient>>,
  photo: BackfillPhoto
) {
  // Fetch storage_path if not already available
  const storagePath = photo.storage_path
  if (!storagePath) {
    throw new Error("Photo not found")
  }

  // Download the image from storage
  const { data: imageData, error: downloadError } = await serviceClient.storage
    .from("photos")
    .download(storagePath)

  if (downloadError || !imageData) {
    throw new Error("Failed to fetch image")
  }

  // Convert blob to base64
  const arrayBuffer = await imageData.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString("base64")

  const hasDishName = photo.dish_name && photo.dish_name.trim().length > 0
  const needsIngredients = !photo.ingredients || photo.ingredients.length === 0

  // Only ingredients missing — use light prompt, don't touch dish name or descriptions
  if (hasDishName && needsIngredients) {
    const ingredients = await generateIngredients(base64, photo.dish_name!)

    const { error: updateError } = await serviceClient
      .from("photos")
      .update({ ingredients })
      .eq("id", photo.id)

    if (updateError) {
      throw new Error("Failed to update photo")
    }

    return { photoId: photo.id, dishName: photo.dish_name, ingredients }
  }

  // Dish name or descriptions are missing — full regeneration needed
  const descriptions = await generateDescription(base64)

  const updateData: Record<string, unknown> = { ingredients: descriptions.ingredients }
  if (!hasDishName) updateData.dish_name = descriptions.dishName
  if (!photo.description_en) updateData.description_en = descriptions.en
  if (!photo.description_cn) updateData.description_cn = descriptions.cn

  const { error: updateError } = await serviceClient
    .from("photos")
    .update(updateData)
    .eq("id", photo.id)

  if (updateError) {
    throw new Error("Failed to update photo")
  }

  return {
    photoId: photo.id,
    dishName: hasDishName ? photo.dish_name : descriptions.dishName,
    descriptionEn: photo.description_en || descriptions.en,
    descriptionCn: photo.description_cn || descriptions.cn,
    ingredients: descriptions.ingredients,
  }
}

// GET endpoint to check backfill status
export async function GET() {
  try {
    // Check authentication and admin role
    const supabase = await createClient()
    const { response } = await requireAdmin(supabase)
    if (response) return response

    const serviceClient = await createServiceClient()

    // Run three independent count queries in parallel
    const [totalRes, backfillRes, ingredientsRes] = await Promise.all([
      serviceClient.from("photos").select("*", { count: "exact", head: true }),
      serviceClient
        .from("photos")
        .select("*", { count: "exact", head: true })
        .or(
          "dish_name.is.null,dish_name.eq.,description_cn.is.null,description_cn.eq.,description_en.is.null,description_en.eq."
        ),
      serviceClient
        .from("photos")
        .select("*", { count: "exact", head: true })
        .is("ingredients", null),
    ])

    const total = totalRes.count || 0
    const needsBackfill = backfillRes.count || 0
    const needsIngredients = ingredientsRes.count || 0
    const complete = total - needsBackfill

    return NextResponse.json({
      withDishName: complete,
      withoutDishName: needsBackfill,
      withoutIngredients: needsIngredients,
      total,
    })
  } catch (error) {
    console.error("Backfill status error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
