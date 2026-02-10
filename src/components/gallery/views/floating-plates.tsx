'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { formatDate } from '@/lib/utils';
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
              transition: { type: 'spring', stiffness: 400, damping: 20 },
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, delay: Math.min(index * 0.05, 0.6) }}
            onClick={() => onPhotoClick(photo)}
            className="relative focus:outline-none focus-ring rounded-2xl flex flex-col items-center group"
          >
            {/* Plate container */}
            <div className="relative aspect-square w-full">
              {/* Plate shadow */}
              <div className="absolute -inset-2 bg-black/10 dark:bg-black/40 rounded-full blur-xl transform translate-y-3" />

              {/* Plate rim (outer ring) */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-canvas-elevated to-canvas-recessed p-2 shadow-xl ring-1 ring-stroke/30">
                {/* Inner plate ring */}
                <div className="absolute inset-3 rounded-full border-2 border-stroke opacity-50" />

                {/* Food image */}
                <div className="relative w-full h-full rounded-full overflow-hidden">
                  <Image
                    src={photo.thumbnailUrl}
                    alt={photo.dish_name || photo.description_en || photo.description_cn || 'A homemade meal'}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                    priority={index < 4}
                  />
                </div>
              </div>

              {/* Hover/focus overlay with description */}
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
              >
                {(photo.dish_name || photo.description_cn || photo.description_en) && (
                  <div className="text-white text-center px-4">
                    {photo.dish_name && (
                      <p className="font-medium mb-1">{photo.dish_name}</p>
                    )}
                    {photo.description_cn && (
                      <p className="text-caption line-clamp-2 text-white/90">{photo.description_cn}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Dish name and date below plate */}
            <div className="mt-3 text-center">
              {photo.dish_name && (
                <p className="font-medium text-ink line-clamp-1">{photo.dish_name}</p>
              )}
              <p className="text-caption text-ink-tertiary mt-0.5">
                {formatDate(photo.created_at)}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
