'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import type { PhotoWithUrls } from '@/types';

interface PhotoCardProps {
  photo: PhotoWithUrls;
  onClick: () => void;
  priority?: boolean;
}

export function PhotoCard({ photo, onClick, priority = false }: PhotoCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className="w-full text-left focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded-xl overflow-hidden group"
    >
      <div className="relative bg-surface border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
        <div className="aspect-square relative overflow-hidden">
          <Image
            src={photo.thumbnailUrl}
            alt={photo.description_en || photo.description_cn || 'A homemade meal'}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
          />
        </div>
        {(photo.description_en || photo.description_cn) && (
          <div className="p-3 space-y-1">
            {photo.description_en && (
              <p className="text-sm text-muted line-clamp-2">{photo.description_en}</p>
            )}
            {photo.description_cn && (
              <p className="text-sm text-muted/70 line-clamp-2">{photo.description_cn}</p>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}
