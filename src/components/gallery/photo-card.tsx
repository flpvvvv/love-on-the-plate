'use client';

import { useRef, useState, useCallback } from 'react';
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
  const cardRef = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -8, y: x * 8 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  return (
    <motion.button
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full text-left focus:outline-none focus-ring rounded-xl overflow-hidden group"
      style={{
        perspective: 800,
      }}
    >
      <motion.div
        className="relative bg-canvas-elevated border border-stroke rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300"
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
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
          <p className="text-caption text-ink-tertiary">
            {formatDate(photo.created_at)}
          </p>
          {photo.dish_name && (
            <p className="font-medium text-ink line-clamp-1">{photo.dish_name}</p>
          )}
          {photo.description_cn && (
            <p className="text-caption text-ink-secondary line-clamp-2">{photo.description_cn}</p>
          )}
        </div>
      </motion.div>
    </motion.button>
  );
}
