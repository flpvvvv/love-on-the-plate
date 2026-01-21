import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { processImage, bufferToBase64 } from '@/lib/image-processing';
import { generateDescription, GeminiError } from '@/lib/gemini';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please sign in to upload photos.', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required to upload photos.', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Parse form data with error handling
    let formData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error('FormData parse error:', formError);
      return NextResponse.json(
        { error: 'Failed to process upload. Please try again.', code: 'INVALID_FORM_DATA' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please select an image.', code: 'NO_FILE' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and HEIC are allowed.', code: 'INVALID_FILE_TYPE' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.', code: 'FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process image (resize and create thumbnail)
    const { fullBuffer, thumbBuffer, width, height } = await processImage(buffer);

    // Generate unique ID for the photo
    const photoId = randomUUID();

    // Upload to Supabase Storage using service role
    const serviceClient = await createServiceClient();

    const fullPath = `photos/${photoId}/full.jpg`;
    const thumbPath = `photos/${photoId}/thumb.jpg`;

    // Upload full image
    const { error: fullUploadError } = await serviceClient.storage
      .from('photos')
      .upload(fullPath, fullBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (fullUploadError) {
      console.error('Full image upload error:', fullUploadError);
      return NextResponse.json(
        { error: 'Failed to upload image to storage.', code: 'STORAGE_UPLOAD_ERROR' },
        { status: 500 }
      );
    }

    // Upload thumbnail
    const { error: thumbUploadError } = await serviceClient.storage
      .from('photos')
      .upload(thumbPath, thumbBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (thumbUploadError) {
      console.error('Thumbnail upload error:', thumbUploadError);
      // Clean up full image if thumbnail fails
      await serviceClient.storage.from('photos').remove([fullPath]);
      return NextResponse.json(
        { error: 'Failed to upload thumbnail.', code: 'THUMBNAIL_UPLOAD_ERROR' },
        { status: 500 }
      );
    }

    // Generate AI descriptions (English and Chinese)
    let dishName = '';
    let descriptionEn = '';
    let descriptionCn = '';
    let descriptionWarning: string | undefined;

    try {
      const descriptions = await generateDescription(bufferToBase64(fullBuffer));
      dishName = descriptions.dishName;
      descriptionEn = descriptions.en;
      descriptionCn = descriptions.cn;
    } catch (descError) {
      console.error('Description generation error:', descError);
      // Set warning message for user
      if (descError instanceof GeminiError) {
        if (descError.code === 'RATE_LIMIT') {
          descriptionWarning = 'AI description skipped (rate limit). You can regenerate it later.';
        } else {
          descriptionWarning = 'AI description generation failed. You can regenerate it later.';
        }
      } else {
        descriptionWarning = 'AI description generation failed. You can regenerate it later.';
      }
      // Continue without description - user can regenerate later
    }

    // Insert photo record into database
    const { data: photo, error: dbError } = await serviceClient
      .from('photos')
      .insert({
        id: photoId,
        storage_path: fullPath,
        thumbnail_path: thumbPath,
        dish_name: dishName,
        description_en: descriptionEn,
        description_cn: descriptionCn,
        original_filename: file.name,
        file_size: fullBuffer.length,
        width,
        height,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Clean up uploaded files
      await serviceClient.storage.from('photos').remove([fullPath, thumbPath]);
      return NextResponse.json(
        { error: 'Failed to save photo record.', code: 'DB_INSERT_ERROR' },
        { status: 500 }
      );
    }

    // Get public URLs
    const { data: fullUrlData } = serviceClient.storage.from('photos').getPublicUrl(fullPath);
    const { data: thumbUrlData } = serviceClient.storage.from('photos').getPublicUrl(thumbPath);

    return NextResponse.json({
      ...photo,
      imageUrl: fullUrlData.publicUrl,
      thumbnailUrl: thumbUrlData.publicUrl,
      ...(descriptionWarning && { warning: descriptionWarning }),
    });
  } catch (error) {
    console.error('Upload error:', error);

    // Provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return NextResponse.json(
        { error: 'Network error during upload. Please check your connection.', code: 'NETWORK_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Upload failed. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
