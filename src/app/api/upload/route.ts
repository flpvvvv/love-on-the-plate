import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { processImage, bufferToBase64 } from '@/lib/image-processing';
import { generateDescription } from '@/lib/gemini';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and HEIC are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process image (resize and create thumbnail)
    const { fullBuffer, thumbBuffer, width, height, capturedAt } = await processImage(buffer);

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
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
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
      return NextResponse.json({ error: 'Failed to upload thumbnail' }, { status: 500 });
    }

    // Generate AI descriptions (English and Chinese)
    let descriptionEn = '';
    let descriptionCn = '';
    try {
      const descriptions = await generateDescription(bufferToBase64(fullBuffer));
      descriptionEn = descriptions.en;
      descriptionCn = descriptions.cn;
    } catch (descError) {
      console.error('Description generation error:', descError);
      // Continue without description - user can regenerate later
    }

    // Insert photo record into database
    const { data: photo, error: dbError } = await serviceClient
      .from('photos')
      .insert({
        id: photoId,
        storage_path: fullPath,
        thumbnail_path: thumbPath,
        description_en: descriptionEn,
        description_cn: descriptionCn,
        original_filename: file.name,
        file_size: fullBuffer.length,
        width,
        height,
        captured_at: capturedAt?.toISOString() || null,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Clean up uploaded files
      await serviceClient.storage.from('photos').remove([fullPath, thumbPath]);
      return NextResponse.json({ error: 'Failed to save photo record' }, { status: 500 });
    }

    // Get public URLs
    const { data: fullUrlData } = serviceClient.storage.from('photos').getPublicUrl(fullPath);
    const { data: thumbUrlData } = serviceClient.storage.from('photos').getPublicUrl(thumbPath);

    return NextResponse.json({
      ...photo,
      imageUrl: fullUrlData.publicUrl,
      thumbnailUrl: thumbUrlData.publicUrl,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
