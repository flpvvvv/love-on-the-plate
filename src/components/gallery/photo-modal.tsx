'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '@/lib/utils';
import type { PhotoWithUrls } from '@/types';

interface PhotoModalContentProps {
  photo: PhotoWithUrls;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

/**
 * Pure content component for photo detail.
 * Used inside ResponsiveSheet (mobile) and DetailPanel (desktop).
 */
export function PhotoModalContent({
  photo,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: PhotoModalContentProps) {
  return (
    <div className="space-y-4">
      {/* Image */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-canvas-recessed -mx-4 md:mx-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={photo.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <Image
              src={photo.imageUrl}
              alt={photo.dish_name || photo.description_en || photo.description_cn || 'A homemade meal'}
              fill
              sizes="(max-width: 768px) 100vw, 420px"
              className="object-cover"
              priority
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation overlay buttons (mobile sheet) */}
        <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
          {onPrev && (
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="pointer-events-auto w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-20 transition-opacity active:scale-95"
              aria-label="Previous photo"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {onNext && (
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="pointer-events-auto w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-20 transition-opacity active:scale-95"
              aria-label="Next photo"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Details */}
      <AnimatePresence mode="wait">
        <motion.div
          key={photo.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="space-y-3"
        >
          {/* Dish name */}
          {photo.dish_name && (
            <h2 className="font-display text-xl font-semibold text-ink leading-snug">
              {photo.dish_name}
            </h2>
          )}

          {/* Date */}
          <p className="text-caption text-ink-tertiary">
            {formatDate(photo.created_at)}
          </p>

          {/* Chinese description */}
          {photo.description_cn && (
            <p className="text-body text-ink leading-relaxed">
              {photo.description_cn}
            </p>
          )}

          {/* English description */}
          {photo.description_en && (
            <p className={`text-body text-ink-secondary leading-relaxed ${photo.description_cn ? 'pt-3 border-t border-stroke' : ''}`}>
              {photo.description_en}
            </p>
          )}

          {!photo.description_en && !photo.description_cn && (
            <p className="text-ink-tertiary italic">No description yet</p>
          )}

          {/* Signature */}
          <div className="pt-3 text-right">
            <span className="font-accent text-lg text-ink-tertiary">
              With love ♡
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Re-export for backward compatibility if needed elsewhere
export { PhotoModalContent as PhotoModal };
