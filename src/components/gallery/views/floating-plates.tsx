'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import type { PhotoWithUrls } from '@/types';

interface FloatingPlatesProps {
  photos: PhotoWithUrls[];
  onPhotoClick: (photo: PhotoWithUrls) => void;
}

// Generate consistent random values based on index
function getPlateStyle(index: number) {
  // Use a simple hash function for consistent randomness
  const hash = (index * 2654435761) % 100;
  const rotation = ((hash % 20) - 10); // -10 to 10 degrees
  const scale = 0.95 + (hash % 10) / 100; // 0.95 to 1.05

  return {
    rotation,
    scale,
  };
}

export function FloatingPlates({ photos, onPhotoClick }: FloatingPlatesProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 p-4">
      {photos.map((photo, index) => {
        const { rotation, scale } = getPlateStyle(index);

        return (
          <motion.button
            key={photo.id}
            initial={{ opacity: 0, scale: 0.8, rotate: rotation }}
            animate={{ opacity: 1, scale: scale, rotate: rotation }}
            whileHover={{
              scale: 1.08,
              rotate: 0,
              zIndex: 10,
              transition: { duration: 0.25, ease: [0.34, 1.56, 0.64, 1] },
            }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            onClick={() => onPhotoClick(photo)}
            className="relative aspect-square focus:outline-none focus-ring rounded-full"
          >
            {/* Plate shadow */}
            <div className="absolute -inset-2 bg-black/10 dark:bg-black/40 rounded-full blur-xl transform translate-y-3" />

            {/* Plate rim (outer ring) */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white to-gray-100 dark:from-gray-200 dark:to-gray-300 p-2 shadow-xl">
              {/* Inner plate ring */}
              <div className="absolute inset-3 rounded-full border-2 border-gray-200 dark:border-gray-300 opacity-50" />

              {/* Food image */}
              <div className="relative w-full h-full rounded-full overflow-hidden">
                <Image
                  src={photo.thumbnailUrl}
                  alt={photo.description_en || photo.description_cn || 'A homemade meal'}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover"
                  priority={index < 4}
                />
              </div>
            </div>

            {/* Hover overlay with description */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              {(photo.description_en || photo.description_cn) && (
                <div className="text-white text-caption text-center px-4">
                  {photo.description_cn && (
                    <p className="line-clamp-2">{photo.description_cn}</p>
                  )}
                  {photo.description_en && (
                    <p className="line-clamp-2 mt-1 text-white/80">{photo.description_en}</p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.button>
        );
      })}
    </div>
  );
}
