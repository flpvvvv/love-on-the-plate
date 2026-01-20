'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { formatDate } from '@/lib/utils';
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
      className="w-full text-left focus:outline-none focus-ring rounded-xl overflow-hidden group"
    >
      <div className="relative bg-canvas-elevated border border-stroke rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
        <div className="aspect-square relative overflow-hidden">
          <Image
            src={photo.thumbnailUrl}
            alt={photo.dish_name || photo.description_en || photo.description_cn || 'A homemade meal'}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            priority={priority}
          />
        </div>
        <div className="p-3 space-y-1">
          {/* Date */}
          <p className="text-micro text-ink-tertiary">
            {formatDate(photo.created_at)}
          </p>
          {/* Dish name */}
          {photo.dish_name && (
            <p className="text-sm font-medium text-ink line-clamp-1">{photo.dish_name}</p>
          )}
          {/* Descriptions */}
          {photo.description_cn && (
            <p className="text-caption text-ink-secondary line-clamp-2">{photo.description_cn}</p>
          )}
        </div>
      </div>
    </motion.button>
  );
}
