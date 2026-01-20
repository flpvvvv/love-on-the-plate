'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { formatDate } from '@/lib/utils';
import type { PhotoWithUrls } from '@/types';

interface LoveTimelineProps {
  photos: PhotoWithUrls[];
  onPhotoClick: (photo: PhotoWithUrls) => void;
}

export function LoveTimeline({ photos, onPhotoClick }: LoveTimelineProps) {
  return (
    <div className="relative max-w-3xl mx-auto px-4 py-8">
      {/* Timeline line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-love/20 transform -translate-x-1/2" />

      {photos.map((photo, index) => {
        const isLeft = index % 2 === 0;

        return (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className={`relative flex items-center mb-12 ${
              isLeft ? 'flex-row' : 'flex-row-reverse'
            }`}
          >
            {/* Content */}
            <button
              onClick={() => onPhotoClick(photo)}
              className={`w-5/12 focus:outline-none focus-ring rounded-xl ${
                isLeft ? 'pr-8 text-right' : 'pl-8 text-left'
              }`}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-canvas-elevated border border-stroke rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={photo.thumbnailUrl}
                    alt={photo.dish_name || photo.description_en || photo.description_cn || 'A homemade meal'}
                    fill
                    sizes="(max-width: 768px) 100vw, 40vw"
                    className="object-cover"
                    priority={index < 3}
                  />
                </div>
                <div className="p-4">
                  <p className="text-micro text-ink-tertiary mb-1">
                    {formatDate(photo.created_at)}
                  </p>
                  {photo.dish_name && (
                    <p className="text-sm font-medium text-ink mb-2 line-clamp-1">
                      {photo.dish_name}
                    </p>
                  )}
                  {photo.description_cn && (
                    <p className="text-caption text-ink line-clamp-2">
                      {photo.description_cn}
                    </p>
                  )}
                </div>
              </motion.div>
            </button>

            {/* Heart marker */}
            <div className="absolute left-1/2 transform -translate-x-1/2 z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
                className="w-8 h-8 bg-love rounded-full flex items-center justify-center shadow-lg"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="white"
                  className="w-4 h-4"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </motion.div>
            </div>

            {/* Empty space for opposite side */}
            <div className="w-5/12" />
          </motion.div>
        );
      })}
    </div>
  );
}
