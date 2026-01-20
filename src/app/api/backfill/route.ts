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

    // Check if user is admin
    const serviceClient = await createServiceClient();
    const { data: profile } = await serviceClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { photoId } = body;

    // If a specific photoId is provided, only backfill that one
    if (photoId) {
      const result = await backfillSinglePhoto(serviceClient, photoId);
      return NextResponse.json(result);
    }

    // Otherwise, backfill all photos without dish names or descriptions
    const { data: photos, error: fetchError } = await serviceClient
      .from('photos')
      .select('id, storage_path, dish_name, description_cn, description_en')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Fetch photos error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
    }

    // Filter to photos that need backfill (missing dish_name or descriptions)
    const photosToBackfill = photos.filter(p => 
      !p.dish_name || !p.description_cn || !p.description_en
    );

    const results = {
      total: photosToBackfill.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process photos one by one to avoid rate limiting
    for (const photo of photosToBackfill) {
      try {
        await backfillSinglePhoto(serviceClient, photo.id);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${photo.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function backfillSinglePhoto(serviceClient: Awaited<ReturnType<typeof createServiceClient>>, photoId: string) {
  // Get photo from database
  const { data: photo, error: fetchError } = await serviceClient
    .from('photos')
    .select('*')
    .eq('id', photoId)
    .single();

  if (fetchError || !photo) {
    throw new Error('Photo not found');
  }

  // Download the image from storage
  const { data: imageData, error: downloadError } = await serviceClient.storage
    .from('photos')
    .download(photo.storage_path);

  if (downloadError || !imageData) {
    throw new Error('Failed to fetch image');
  }

  // Convert blob to base64
  const arrayBuffer = await imageData.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  // Generate new descriptions with dish name
  const descriptions = await generateDescription(base64);

  // Update the photo record
  const { error: updateError } = await serviceClient
    .from('photos')
    .update({
      dish_name: descriptions.dishName,
      description_en: descriptions.en,
      description_cn: descriptions.cn,
    })
    .eq('id', photoId);

  if (updateError) {
    throw new Error('Failed to update photo');
  }

  return {
    photoId,
    dishName: descriptions.dishName,
    descriptionEn: descriptions.en,
    descriptionCn: descriptions.cn,
  };
}

// GET endpoint to check backfill status
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = await createServiceClient();
    
    // Check if user is admin
    const { data: profile } = await serviceClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all photos to check which need backfill
    const { data: photos, error: fetchError } = await serviceClient
      .from('photos')
      .select('id, dish_name, description_cn, description_en');

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
    }

    // Count photos that need backfill (missing dish_name OR missing descriptions)
    const needsBackfill = photos.filter(p => 
      !p.dish_name || !p.description_cn || !p.description_en
    ).length;

    const complete = photos.length - needsBackfill;

    return NextResponse.json({
      withDishName: complete,
      withoutDishName: needsBackfill,
      total: photos.length,
    });
  } catch (error) {
    console.error('Backfill status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
