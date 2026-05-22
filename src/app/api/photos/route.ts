import { type NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { isValidUUID } from "@/lib/validation"

const PAGE_SIZE = 12

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10), 50)

    const supabase = await createClient()

    let query = supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit + 1) // Fetch one extra to check if there are more

    // Cursor-based pagination
    if (cursor) {
      query = query.lt("created_at", cursor)
    }

    const { data: photos, error } = await query

    if (error) {
      console.error("Fetch photos error:", error)
      return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 })
    }

    // Check if there are more photos
    const hasMore = photos.length > limit
    const returnPhotos = hasMore ? photos.slice(0, -1) : photos

    // Get public URLs and strip internal fields before sending to client
    const photosWithUrls = returnPhotos.map((photo) => {
      const { data: fullUrlData } = supabase.storage.from("photos").getPublicUrl(photo.storage_path)
      const { data: thumbUrlData } = supabase.storage
        .from("photos")
        .getPublicUrl(photo.thumbnail_path)

      // Strip internal fields that the client doesn't need
      const {
        storage_path: _sp,
        thumbnail_path: _tp,
        uploaded_by: _ub,
        file_size: _fs,
        original_filename: _of,
        updated_at: _ua,
        ...clientPhoto
      } = photo

      return {
        ...clientPhoto,
        imageUrl: fullUrlData.publicUrl,
        thumbnailUrl: thumbUrlData.publicUrl,
      }
    })

    // Get cursor for next page
    const nextCursor =
      hasMore && returnPhotos.length > 0 ? returnPhotos[returnPhotos.length - 1].created_at : null

    return NextResponse.json(
      {
        photos: photosWithUrls,
        nextCursor,
        hasMore,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    )
  } catch (error) {
    console.error("Photos fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { photoId, dishName, descriptionEn, descriptionCn } = await request.json()

    if (!photoId) {
      return NextResponse.json({ error: "Photo ID required" }, { status: 400 })
    }

    // Validate UUID format
    if (!isValidUUID(photoId)) {
      return NextResponse.json({ error: "Invalid photo ID format" }, { status: 400 })
    }

    // Build update object with only provided fields
    const updateData: { dish_name?: string; description_en?: string; description_cn?: string } = {}
    if (dishName !== undefined) updateData.dish_name = dishName
    if (descriptionEn !== undefined) updateData.description_en = descriptionEn
    if (descriptionCn !== undefined) updateData.description_cn = descriptionCn

    // Update via RLS-enforced client (policy checks ownership automatically)
    const { data: updatedPhoto, error: updateError } = await supabase
      .from("photos")
      .update(updateData)
      .eq("id", photoId)
      .select()
      .single()

    if (updateError) {
      // RLS will block unauthorized updates — surface as 404 to avoid leaking existence
      if (updateError.code === "PGRST116") {
        return NextResponse.json({ error: "Photo not found or access denied" }, { status: 404 })
      }
      return NextResponse.json({ error: "Failed to update photo" }, { status: 500 })
    }

    return NextResponse.json(updatedPhoto)
  } catch (error) {
    console.error("Photo update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get("id")

    if (!photoId) {
      return NextResponse.json({ error: "Photo ID required" }, { status: 400 })
    }

    // Validate UUID format
    if (!isValidUUID(photoId)) {
      return NextResponse.json({ error: "Invalid photo ID format" }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Fetch admin profile and photo in parallel (independent queries)
    const [profileRes, photoRes] = await Promise.all([
      serviceClient.from("user_profiles").select("role").eq("id", user.id).single(),
      serviceClient
        .from("photos")
        .select("storage_path, thumbnail_path, uploaded_by")
        .eq("id", photoId)
        .single(),
    ])

    const isAdmin = profileRes.data?.role === "admin"
    const photo = photoRes.data

    if (photoRes.error || !photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    // Allow deletion if user is admin or is the uploader
    if (!isAdmin && photo.uploaded_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete from storage
    await serviceClient.storage.from("photos").remove([photo.storage_path, photo.thumbnail_path])

    // Delete from database
    const { error: deleteError } = await serviceClient.from("photos").delete().eq("id", photoId)

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Photo delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
