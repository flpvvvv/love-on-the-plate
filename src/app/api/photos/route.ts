import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const PAGE_SIZE = 12;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || String(PAGE_SIZE)), 50);

    const supabase = await createClient();

    let query = supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit + 1); // Fetch one extra to check if there are more

    // Cursor-based pagination
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: photos, error } = await query;

    if (error) {
      console.error('Fetch photos error:', error);
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
    }

    // Check if there are more photos
    const hasMore = photos.length > limit;
    const returnPhotos = hasMore ? photos.slice(0, -1) : photos;

    // Get public URLs for each photo
    const photosWithUrls = returnPhotos.map((photo) => {
      const { data: fullUrlData } = supabase.storage
        .from('photos')
        .getPublicUrl(photo.storage_path);
      const { data: thumbUrlData } = supabase.storage
        .from('photos')
        .getPublicUrl(photo.thumbnail_path);

      return {
        ...photo,
        imageUrl: fullUrlData.publicUrl,
        thumbnailUrl: thumbUrlData.publicUrl,
      };
    });

    // Get cursor for next page
    const nextCursor = hasMore && returnPhotos.length > 0
      ? returnPhotos[returnPhotos.length - 1].created_at
      : null;

    return NextResponse.json({
      photos: photosWithUrls,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Photos fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { photoId, descriptionEn, descriptionCn } = await request.json();

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    // Use service client for the update
    const serviceClient = await createServiceClient();

    // First check ownership
    const { data: photo, error: fetchError } = await serviceClient
      .from('photos')
      .select('uploaded_by')
      .eq('id', photoId)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    if (photo.uploaded_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build update object with only provided fields
    const updateData: { description_en?: string; description_cn?: string } = {};
    if (descriptionEn !== undefined) updateData.description_en = descriptionEn;
    if (descriptionCn !== undefined) updateData.description_cn = descriptionCn;

    // Update the photo
    const { data: updatedPhoto, error: updateError } = await serviceClient
      .from('photos')
      .update(updateData)
      .eq('id', photoId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
    }

    return NextResponse.json(updatedPhoto);
  } catch (error) {
    console.error('Photo update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('id');

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    const serviceClient = await createServiceClient();

    // Check if user is admin
    const { data: profile } = await serviceClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';

    // Get photo to verify ownership and get storage paths
    const { data: photo, error: fetchError } = await serviceClient
      .from('photos')
      .select('*')
      .eq('id', photoId)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Allow deletion if user is admin or is the uploader
    if (!isAdmin && photo.uploaded_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete from storage
    await serviceClient.storage
      .from('photos')
      .remove([photo.storage_path, photo.thumbnail_path]);

    // Delete from database
    const { error: deleteError } = await serviceClient
      .from('photos')
      .delete()
      .eq('id', photoId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Photo delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
