import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { generateDescription, GeminiError } from '@/lib/gemini';

// Allow longer processing time for AI description generation
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please sign in to continue.', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Safely parse JSON body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request format.', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    const { photoId, imageBase64 } = body;

    // Option 1: Generate description from base64 image (for preview)
    if (imageBase64) {
      // Validate base64 data
      if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
        return NextResponse.json(
          { error: 'Invalid image data provided.', code: 'INVALID_IMAGE' },
          { status: 400 }
        );
      }

      try {
        const descriptions = await generateDescription(imageBase64);
        return NextResponse.json({
          dishName: descriptions.dishName,
          descriptionEn: descriptions.en,
          descriptionCn: descriptions.cn,
        });
      } catch (error) {
        // Handle Gemini-specific errors
        if (error instanceof GeminiError) {
          console.error(`Gemini error [${error.code}]:`, error.message);
          return NextResponse.json(
            {
              error: error.userMessage,
              code: error.code,
              isRetryable: error.isRetryable,
            },
            { status: error.code === 'RATE_LIMIT' ? 429 : 500 }
          );
        }
        throw error;
      }
    }

    // Option 2: Regenerate description for existing photo
    if (!photoId) {
      return NextResponse.json(
        { error: 'Photo ID or image data required.', code: 'MISSING_DATA' },
        { status: 400 }
      );
    }

    // Get photo from database
    const serviceClient = await createServiceClient();
    const { data: photo, error: fetchError } = await serviceClient
      .from('photos')
      .select('*')
      .eq('id', photoId)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json(
        { error: 'Photo not found.', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (photo.uploaded_by !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this photo.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Download the image from storage
    const { data: imageData, error: downloadError } = await serviceClient.storage
      .from('photos')
      .download(photo.storage_path);

    if (downloadError || !imageData) {
      return NextResponse.json(
        { error: 'Failed to load photo from storage.', code: 'STORAGE_ERROR' },
        { status: 500 }
      );
    }

    // Convert blob to base64
    const arrayBuffer = await imageData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    try {
      // Generate new descriptions (English and Chinese)
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
        return NextResponse.json(
          { error: 'Failed to save description.', code: 'DB_ERROR' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        dishName: descriptions.dishName,
        descriptionEn: descriptions.en,
        descriptionCn: descriptions.cn,
      });
    } catch (error) {
      // Handle Gemini-specific errors
      if (error instanceof GeminiError) {
        console.error(`Gemini error [${error.code}]:`, error.message);
        return NextResponse.json(
          {
            error: error.userMessage,
            code: error.code,
            isRetryable: error.isRetryable,
          },
          { status: error.code === 'RATE_LIMIT' ? 429 : 500 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Description generation error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
