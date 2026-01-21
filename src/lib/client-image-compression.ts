/**
 * Client-side image compression utility
 * Compresses images before uploading to reduce file size and server load
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'image/jpeg' | 'image/webp';
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  format: 'image/jpeg',
};

/**
 * Compression presets for different use cases
 */
export const COMPRESSION_PRESETS = {
  /** For uploading to Supabase storage - higher quality */
  upload: { maxWidth: 1920, maxHeight: 1920, quality: 0.8, format: 'image/jpeg' as const },
  /** For AI description generation - smaller/faster */
  ai: { maxWidth: 1280, maxHeight: 1280, quality: 0.7, format: 'image/jpeg' as const },
} as const;

/**
 * Convert base64 string to Blob for FormData upload
 * @param base64 Base64 encoded string (without data:image prefix)
 * @param mimeType MIME type of the image
 * @returns Blob object
 */
export function base64ToBlob(base64: string, mimeType: string = 'image/jpeg'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([byteNumbers], { type: mimeType });
}

/**
 * Compress an image file on the client side
 * @param file Original image file
 * @param options Compression options
 * @returns Compressed image as base64 string (without data:image prefix)
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new window.Image();

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > opts.maxWidth || height > opts.maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = opts.maxWidth;
            height = width / aspectRatio;
          } else {
            height = opts.maxHeight;
            width = height * aspectRatio;
          }
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Use better image quality settings
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to compressed format
        const dataUrl = canvas.toDataURL(opts.format, opts.quality);

        // Validate dataUrl format
        if (!dataUrl || !dataUrl.includes(',')) {
          reject(new Error('Failed to compress image. Please try a different image or refresh the page.'));
          return;
        }

        // Remove the "data:image/jpeg;base64," prefix
        const base64 = dataUrl.split(',')[1];

        // Validate base64 extraction
        if (!base64 || base64.length === 0) {
          reject(new Error('Failed to process image data. Please try again.'));
          return;
        }

        resolve(base64);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Get the compressed file size estimate in bytes
 * @param base64String Base64 encoded string
 * @returns Estimated file size in bytes
 */
export function getBase64Size(base64String: string): number {
  // Base64 encoding increases size by ~33%
  // To get original size: (base64Length * 3) / 4
  const padding = (base64String.match(/=/g) || []).length;
  return (base64String.length * 3) / 4 - padding;
}

/**
 * Format bytes to human-readable size
 * @param bytes File size in bytes
 * @returns Formatted string like "1.5 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
