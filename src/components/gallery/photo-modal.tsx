'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { formatDate } from '@/lib/utils';
import type { PhotoWithUrls } from '@/types';

interface PhotoModalContentProps {
  photo: PhotoWithUrls;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

// Swipe navigation thresholds
const SWIPE_POWER_THRESHOLD = 5000;   // offset * velocity
const SWIPE_DISTANCE_THRESHOLD = 80;  // px drag distance
const SWIPE_VELOCITY_THRESHOLD = 300; // px/s flick speed

/** Direction-aware slide variants for the image carousel. */
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : direction < 0 ? -300 : 0,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : direction < 0 ? 300 : 0,
    opacity: 0,
  }),
};

/**
 * Pure content component for photo detail.
 * Used inside ResponsiveSheet (mobile) and DetailPanel (desktop).
 * Supports swipe left/right on the image to navigate between photos.
 */
export function PhotoModalContent({
  photo,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: PhotoModalContentProps) {
  // Track swipe direction for enter/exit animation: 1 = next, -1 = prev
  const [direction, setDirection] = useState(0);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;
      const swipePower = Math.abs(offset.x) * Math.abs(velocity.x);

      const triggered =
        swipePower > SWIPE_POWER_THRESHOLD ||
        Math.abs(offset.x) > SWIPE_DISTANCE_THRESHOLD ||
        Math.abs(velocity.x) > SWIPE_VELOCITY_THRESHOLD;

      if (!triggered) return;

      if (offset.x < 0 && hasNext) {
        setDirection(1);
        onNext?.();
      } else if (offset.x > 0 && hasPrev) {
        setDirection(-1);
        onPrev?.();
      }
    },
    [hasNext, hasPrev, onNext, onPrev],
  );

  const handlePrev = useCallback(() => {
    setDirection(-1);
    onPrev?.();
  }, [onPrev]);

  const handleNext = useCallback(() => {
    setDirection(1);
    onNext?.();
  }, [onNext]);

  // Reduce drag elastic at boundaries for a rubber-band "end of list" feel
  const dragElastic = {
    left: hasNext ? 0.7 : 0.15,
    right: hasPrev ? 0.7 : 0.15,
  };

  return (
    <div className="space-y-4">
      {/* Image — swipe left/right to navigate */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-canvas-recessed -mx-4 md:mx-0">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={photo.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.15 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={dragElastic}
            onDragEnd={handleDragEnd}
            className="absolute inset-0"
            style={{ touchAction: 'pan-y' }}
          >
            <Image
              src={photo.imageUrl}
              alt={photo.dish_name || photo.description_en || photo.description_cn || 'A homemade meal'}
              fill
              sizes="(max-width: 768px) 100vw, 420px"
              className="object-cover pointer-events-none select-none"
              priority
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation overlay buttons */}
        <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none z-10">
          {onPrev && (
            <button
              onClick={handlePrev}
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
              onClick={handleNext}
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
