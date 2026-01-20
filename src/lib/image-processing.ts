import sharp from 'sharp';

interface ProcessedImage {
  fullBuffer: Buffer;
  thumbBuffer: Buffer;
  width: number;
  height: number;
}

const MAX_FULL_SIZE = 2000;
const THUMB_SIZE = 400;
const JPEG_QUALITY = 80;

export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  // Get image metadata
  const metadata = await sharp(buffer).metadata();

  // Calculate dimensions for full image (maintain aspect ratio)
  const originalWidth = metadata.width || MAX_FULL_SIZE;
  const originalHeight = metadata.height || MAX_FULL_SIZE;

  let fullWidth = originalWidth;
  let fullHeight = originalHeight;

  if (originalWidth > MAX_FULL_SIZE || originalHeight > MAX_FULL_SIZE) {
    if (originalWidth > originalHeight) {
      fullWidth = MAX_FULL_SIZE;
      fullHeight = Math.round((originalHeight / originalWidth) * MAX_FULL_SIZE);
    } else {
      fullHeight = MAX_FULL_SIZE;
      fullWidth = Math.round((originalWidth / originalHeight) * MAX_FULL_SIZE);
    }
  }

  // Process full image
  const fullBuffer = await sharp(buffer)
    .rotate() // Auto-rotate based on EXIF orientation
    .resize(fullWidth, fullHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  // Process thumbnail
  const thumbBuffer = await sharp(buffer)
    .rotate()
    .resize(THUMB_SIZE, THUMB_SIZE, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  return {
    fullBuffer,
    thumbBuffer,
    width: fullWidth,
    height: fullHeight,
  };
}

export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}
