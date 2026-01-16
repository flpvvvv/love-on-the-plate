import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { generateDescription } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { photoId, imageBase64 } = body;

    // Option 1: Generate description from base64 image (for preview)
    if (imageBase64) {
      const description = await generateDescription(imageBase64);
      return NextResponse.json({ description });
    }

    // Option 2: Regenerate description for existing photo
    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID or image data required' }, { status: 400 });
    }

    // Get photo from database
    const serviceClient = await createServiceClient();
    const { data: photo, error: fetchError } = await serviceClient
      .from('photos')
      .select('*')
      .eq('id', photoId)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Verify ownership
    if (photo.uploaded_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Download the image from storage
    const { data: imageData, error: downloadError } = await serviceClient.storage
      .from('photos')
      .download(photo.storage_path);

    if (downloadError || !imageData) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
    }

    // Convert blob to base64
    const arrayBuffer = await imageData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Generate new description
    const description = await generateDescription(base64);

    // Update the photo record
    const { error: updateError } = await serviceClient
      .from('photos')
      .update({ description })
      .eq('id', photoId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update description' }, { status: 500 });
    }

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Description generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
