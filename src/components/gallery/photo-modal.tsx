'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { formatDate } from '@/lib/utils';
import type { PhotoWithUrls } from '@/types';

interface PhotoModalProps {
  photo: PhotoWithUrls | null;
  open: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  prevPhotoUrl?: string;
  nextPhotoUrl?: string;
}

// Fast, snappy transition - no delays
const quickTransition = {
  type: 'tween' as const,
  duration: 0.2,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number], // iOS-like ease
};

// Navigation button component - only shown on desktop
function NavButton({
  direction,
  onClick,
  disabled
}: {
  direction: 'prev' | 'next';
  onClick: () => void;
  disabled?: boolean;
}) {
  const isPrev = direction === 'prev';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={`
        absolute top-1/2 -translate-y-1/2 z-30
        w-12 h-12
        rounded-full bg-black/40 hover:bg-black/60
        hidden md:flex items-center justify-center
        transition-all backdrop-blur-sm
        disabled:opacity-30 disabled:cursor-not-allowed
        ${isPrev ? 'left-4' : 'right-4'}
      `}
      aria-label={isPrev ? 'Previous photo' : 'Next photo'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="white"
        className="w-6 h-6"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={isPrev ? "M15.75 19.5L8.25 12l7.5-7.5" : "M8.25 4.5l7.5 7.5-7.5 7.5"} />
      </svg>
    </button>
  );
}

export function PhotoModal({
  photo,
  open,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  prevPhotoUrl,
  nextPhotoUrl,
}: PhotoModalProps) {
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | 'up'>('up');
  const [isMobile, setIsMobile] = useState(false);
  const [dragX, setDragX] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Swipe thresholds
  const SWIPE_THRESHOLD = 50;
  const VELOCITY_THRESHOLD = 300;

  // Handle drag/swipe
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;

      // Check if swipe is strong enough
      const swipedRight = offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD;
      const swipedLeft = offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD;

      if (swipedRight && hasPrev && onPrev) {
        setSlideDirection('right');
        onPrev();
      } else if (swipedLeft && hasNext && onNext) {
        setSlideDirection('left');
        onNext();
      }

      setDragX(0);
    },
    [hasPrev, hasNext, onPrev, onNext]
  );

  // Handle button navigation
  const handlePrevClick = useCallback(() => {
    if (hasPrev && onPrev) {
      setSlideDirection('right');
      onPrev();
    }
  }, [hasPrev, onPrev]);

  const handleNextClick = useCallback(() => {
    if (hasNext && onNext) {
      setSlideDirection('left');
      onNext();
    }
  }, [hasNext, onNext]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        setSlideDirection('right');
        onPrev();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        setSlideDirection('left');
        onNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose, hasPrev, hasNext, onPrev, onNext]);

  // Reset slide direction when modal opens
  useEffect(() => {
    if (open) {
      setSlideDirection('up');
    }
  }, [open]);

  if (!photo) return null;

  // Animation variants based on slide direction
  const getInitialPosition = () => {
    switch (slideDirection) {
      case 'left': return { x: 300, opacity: 0 };
      case 'right': return { x: -300, opacity: 0 };
      case 'up': return { y: 60, opacity: 0 };
      default: return { y: 60, opacity: 0 };
    }
  };

  const getExitPosition = () => {
    switch (slideDirection) {
      case 'left': return { x: -300, opacity: 0 };
      case 'right': return { x: 300, opacity: 0 };
      case 'up': return { y: -60, opacity: 0 };
      default: return { y: -60, opacity: 0 };
    }
  };

  return (
    <AnimatePresence mode="popLayout">
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overscroll-contain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-lg"
            onClick={onClose}
          />

          {/* Navigation Buttons - Desktop only */}
          {onPrev && (
            <NavButton direction="prev" onClick={handlePrevClick} disabled={!hasPrev} />
          )}
          {onNext && (
            <NavButton direction="next" onClick={handleNextClick} disabled={!hasNext} />
          )}

          {/* Swipe indicators for mobile */}
          {isMobile && (
            <>
              <motion.div
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
                animate={{ opacity: dragX < -20 ? 1 : 0 }}
                transition={{ duration: 0.1 }}
              >
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="w-5 h-5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </motion.div>
              <motion.div
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
                animate={{ opacity: dragX > 20 ? 1 : 0 }}
                transition={{ duration: 0.1 }}
              >
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="w-5 h-5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </div>
              </motion.div>
            </>
          )}

          {/* Card Container */}
          <div
            ref={cardRef}
            className="relative w-full max-w-4xl mx-2 md:mx-16 flex items-center justify-center"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={photo.id}
                initial={getInitialPosition()}
                animate={{
                  x: 0,
                  y: 0,
                  opacity: 1,
                  scale: 1,
                }}
                exit={getExitPosition()}
                transition={quickTransition}
                drag={isMobile ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDrag={isMobile ? (_, info) => setDragX(info.offset.x) : undefined}
                onDragEnd={isMobile ? handleDragEnd : undefined}
                className={`w-full ${isMobile ? 'cursor-grab active:cursor-grabbing' : ''}`}
                style={isMobile ? {
                  x: dragX * 0.5,
                  rotate: dragX * 0.02,
                  scale: 1 - Math.abs(dragX) * 0.0005,
                } : undefined}
              >
                {/* Card content */}
                <div className="relative bg-canvas rounded-2xl shadow-2xl overflow-hidden">
                  {/* Close Button */}
                  <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors z-20 backdrop-blur-sm"
                    aria-label="Close"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="white"
                      className="w-5 h-5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="flex flex-col md:flex-row max-h-[85vh]">
                    {/* Image Section */}
                    <div className="relative flex-1 min-h-[250px] md:min-h-[500px] bg-canvas-recessed select-none touch-none">
                      <Image
                        src={photo.imageUrl}
                        alt={photo.dish_name || photo.description_en || photo.description_cn || 'A homemade meal'}
                        fill
                        sizes="(max-width: 768px) 100vw, 60vw"
                        className="object-contain pointer-events-none"
                        priority
                        draggable={false}
                      />
                    </div>

                    {/* Details Section - touch-none prevents scroll interference with swipe */}
                    <div className="w-full md:w-80 p-5 md:p-6 bg-canvas select-none touch-none">
                      <div className="space-y-3 md:space-y-4">
                        {/* Dish name */}
                        {photo.dish_name && (
                          <h2 className="font-display text-lg md:text-2xl font-semibold text-ink leading-snug">
                            {photo.dish_name}
                          </h2>
                        )}

                        {/* Date stamp */}
                        <p className="text-caption text-ink-tertiary inline-block">
                          {formatDate(photo.created_at)}
                        </p>

                        {/* Descriptions */}
                        <div className="space-y-3 md:space-y-4 max-h-[120px] md:max-h-none overflow-y-auto">
                          {photo.description_cn && (
                            <span className="text-body text-ink leading-relaxed block text-sm md:text-base">
                              {photo.description_cn}
                            </span>
                          )}

                          {photo.description_en && (
                            <span className={`text-body text-ink-secondary leading-relaxed block text-sm md:text-base ${photo.description_cn ? "pt-3 md:pt-4 border-t border-stroke" : ""}`}>
                              {photo.description_en}
                            </span>
                          )}

                          {!photo.description_en && !photo.description_cn && (
                            <p className="text-ink-tertiary italic text-sm md:text-base">No description yet</p>
                          )}
                        </div>

                        {/* Decorative signature */}
                        <div className="pt-2 md:pt-4 text-right">
                          <span className="font-accent text-base md:text-lg text-ink-tertiary">
                            With love ♡
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Hidden preload images for instant navigation */}
          <div className="hidden">
            {prevPhotoUrl && (
              <Image
                src={prevPhotoUrl}
                alt=""
                width={1}
                height={1}
                priority
              />
            )}
            {nextPhotoUrl && (
              <Image
                src={nextPhotoUrl}
                alt=""
                width={1}
                height={1}
                priority
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
