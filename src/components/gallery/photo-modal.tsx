'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
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
}

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
  hasNext = false 
}: PhotoModalProps) {
  const [showContent, setShowContent] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const constraintsRef = useRef(null);
  
  // Motion values for swipe
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);
  const rotate = useTransform(x, [-200, 0, 200], [-5, 0, 5]);

  // Swipe threshold
  const SWIPE_THRESHOLD = 80;

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;
      
      // Combine offset and velocity for better UX
      const swipe = offset + velocity * 0.2;
      
      if (swipe > SWIPE_THRESHOLD && hasPrev && onPrev) {
        setSwipeDirection('right');
        onPrev();
      } else if (swipe < -SWIPE_THRESHOLD && hasNext && onNext) {
        setSwipeDirection('left');
        onNext();
      }
      
      // Reset swipe direction after animation
      setTimeout(() => setSwipeDirection(null), 300);
    },
    [hasPrev, hasNext, onPrev, onNext]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      }
    },
    [onClose, onPrev, onNext, hasPrev, hasNext]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Delay content reveal for envelope animation
      const timer = setTimeout(() => setShowContent(true), 400);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
    return undefined;
  }, [open, handleKeyDown]);

  // Reset state when photo changes
  useEffect(() => {
    // Use timeout to avoid sync setState warning
    const resetTimer = setTimeout(() => {
      setShowContent(false);
    }, 0);
    
    // Delay content reveal when switching photos
    let showTimer: NodeJS.Timeout | undefined;
    if (open && photo) {
      showTimer = setTimeout(() => setShowContent(true), 200);
    }
    
    return () => {
      clearTimeout(resetTimer);
      if (showTimer) clearTimeout(showTimer);
    };
  }, [photo, open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      // Use timeout to avoid sync setState in render
      const timer = setTimeout(() => {
        setShowContent(false);
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  if (!photo) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Navigation Buttons - Only visible on desktop */}
          {onPrev && (
            <NavButton direction="prev" onClick={onPrev} disabled={!hasPrev} />
          )}
          {onNext && (
            <NavButton direction="next" onClick={onNext} disabled={!hasNext} />
          )}

          {/* Swipe hint indicators for mobile */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 pointer-events-none md:hidden z-20">
            {hasPrev && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                className="text-white/60"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </motion.div>
            )}
            <div className="flex-1" />
            {hasNext && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                className="text-white/60"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </motion.div>
            )}
          </div>

          {/* Swipe constraints container */}
          <div ref={constraintsRef} className="absolute inset-0 pointer-events-none" />

          {/* Envelope Container - Swipeable on mobile */}
          <motion.div
            key={photo.id}
            initial={{ 
              y: 100, 
              opacity: 0, 
              scale: 0.9,
              x: swipeDirection === 'left' ? 100 : swipeDirection === 'right' ? -100 : 0
            }}
            animate={{ y: 0, opacity: 1, scale: 1, x: 0 }}
            exit={{ 
              y: 50, 
              opacity: 0, 
              scale: 0.95,
              x: swipeDirection === 'left' ? -100 : swipeDirection === 'right' ? 100 : 0
            }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
            }}
            style={{ 
              x,
              opacity,
              scale,
              rotate,
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            dragListener={true}
            className="relative w-full max-w-4xl mx-2 md:mx-16 cursor-grab active:cursor-grabbing"
          >
            {/* Main Content Card - touchAction ensures swipe works on entire modal */}
            <motion.div
              initial={{ y: 30 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="relative bg-canvas rounded-2xl shadow-xl overflow-hidden"
              style={{ touchAction: 'pan-y' }}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors z-20 backdrop-blur-sm"
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
                <motion.div
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="relative flex-1 min-h-[300px] md:min-h-[500px] bg-black select-none"
                  style={{ touchAction: 'pan-y' }}
                >
                  <Image
                    src={photo.imageUrl}
                    alt={photo.dish_name || photo.description_en || photo.description_cn || 'A homemade meal'}
                    fill
                    sizes="(max-width: 768px) 100vw, 60vw"
                    className="object-contain pointer-events-none"
                    priority
                    draggable={false}
                  />
                </motion.div>

                {/* Details Section - "Letter" */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: showContent ? 1 : 0, x: showContent ? 0 : 20 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="w-full md:w-80 p-6 bg-canvas overflow-y-auto select-none"
                  style={{ touchAction: 'pan-y' }}
                >
                  <div className="space-y-4">
                    {/* Dish name - prominent display */}
                    {photo.dish_name && showContent && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                      >
                        <h2 className="font-display text-xl md:text-2xl font-semibold text-ink leading-snug">
                          {photo.dish_name}
                        </h2>
                      </motion.div>
                    )}

                    {/* Date stamp */}
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: showContent ? 1 : 0, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="inline-block"
                    >
                      <p className="text-caption text-ink-tertiary">
                        {formatDate(photo.created_at)}
                      </p>
                    </motion.div>

                    {/* Descriptions - simple text display */}
                    <div className="space-y-4">
                      {/* Chinese Description */}
                      {photo.description_cn && showContent && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                          className="mb-4"
                        >
                          <span className="text-body text-ink leading-relaxed block">
                            {photo.description_cn}
                          </span>
                        </motion.div>
                      )}

                      {/* English Description */}
                      {photo.description_en && showContent && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: photo.description_cn ? 0.4 : 0.2 }}
                          className={photo.description_cn ? "pt-4 border-t border-stroke" : ""}
                        >
                          <span className="text-body text-ink-secondary leading-relaxed block">
                            {photo.description_en}
                          </span>
                        </motion.div>
                      )}

                      {/* No description fallback */}
                      {!photo.description_en && !photo.description_cn && (
                        <p className="text-ink-tertiary italic">No description yet</p>
                      )}
                    </div>

                    {/* Decorative signature */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 10 }}
                      transition={{ delay: 1.2 }}
                      className="pt-4 text-right"
                    >
                      <span className="font-accent text-lg text-ink-tertiary">
                        With love ♡
                      </span>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
