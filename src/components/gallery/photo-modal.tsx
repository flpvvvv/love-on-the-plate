'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useAnimation, PanInfo } from 'framer-motion';
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

// Buttery smooth spring - feels like iOS
const fluidSpring = {
  type: 'spring' as const,
  damping: 30,
  stiffness: 200,
  mass: 1,
};

// Snappy spring for quick responses
const snappySpring = {
  type: 'spring' as const,
  damping: 40,
  stiffness: 400,
  mass: 0.8,
};

// Exit animation - fast and smooth
const exitSpring = {
  type: 'spring' as const,
  damping: 50,
  stiffness: 300,
  mass: 0.5,
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
  const [isFirstOpen, setIsFirstOpen] = useState(true);
  const [exitDirection, setExitDirection] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Motion value for drag position - this is the raw input
  const x = useMotionValue(0);

  // Much smoother spring for following the drag
  const smoothX = useSpring(x, {
    damping: 50,    // High damping = less oscillation
    stiffness: 500, // High stiffness = responsive
    mass: 0.3       // Low mass = snappy
  });

  // Desktop hover tilt effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { damping: 30, stiffness: 300, mass: 0.5 });
  const smoothMouseY = useSpring(mouseY, { damping: 30, stiffness: 300, mass: 0.5 });

  // Desktop hover rotations
  const hoverRotateY = useTransform(smoothMouseX, [-0.5, 0.5], [8, -8]);
  const hoverRotateX = useTransform(smoothMouseY, [-0.5, 0.5], [-6, 6]);

  // Get screen width for calculations
  const getScreenWidth = () => typeof window !== 'undefined' ? window.innerWidth : 400;

  // 3D rotation based on swipe - more subtle and smooth
  const rotateY = useTransform(smoothX, [-getScreenWidth(), 0, getScreenWidth()], [-25, 0, 25]);
  const rotateZ = useTransform(smoothX, [-getScreenWidth(), 0, getScreenWidth()], [-12, 0, 12]);

  // Smooth scale - card shrinks slightly as it moves away
  const scale = useTransform(
    smoothX,
    [-getScreenWidth() * 0.5, -100, 0, 100, getScreenWidth() * 0.5],
    [0.85, 0.95, 1, 0.95, 0.85]
  );

  // Opacity - gentle fade
  const opacity = useTransform(
    smoothX,
    [-getScreenWidth() * 0.6, 0, getScreenWidth() * 0.6],
    [0, 1, 0]
  );

  // Background indicators showing swipe direction
  const leftIndicatorOpacity = useTransform(smoothX, [0, 100], [0, 1]);
  const rightIndicatorOpacity = useTransform(smoothX, [-100, 0], [1, 0]);

  // Threshold configuration - velocity is key for app-like feel
  const DISTANCE_THRESHOLD = 80;  // Minimum distance
  const VELOCITY_THRESHOLD = 300; // px/s - quick flicks trigger at lower distance

  // Desktop hover handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isDragging) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const normalizedX = (e.clientX - centerX) / rect.width;
    const normalizedY = (e.clientY - centerY) / rect.height;

    mouseX.set(normalizedX);
    mouseY.set(normalizedY);
  }, [mouseX, mouseY, isDragging]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  // Handle drag end with momentum-based navigation
  const handleDragEnd = useCallback(
    async (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;

      // App-like logic: trigger on distance OR velocity
      const shouldNavigate = Math.abs(offset) > DISTANCE_THRESHOLD || Math.abs(velocity) > VELOCITY_THRESHOLD;
      const direction = offset > 0 ? 1 : -1; // 1 = right (prev), -1 = left (next)

      if (shouldNavigate) {
        const canNavigate = (direction > 0 && hasPrev) || (direction < 0 && hasNext);

        if (canNavigate) {
          // Calculate exit position based on velocity
          const exitX = direction * (getScreenWidth() + 200);
          const exitRotateY = direction * -30;
          const exitRotateZ = direction * -15;

          // Set exit direction for incoming card animation
          setExitDirection(direction);

          // Animate card out with momentum
          await controls.start({
            x: exitX,
            rotateY: exitRotateY,
            rotateZ: exitRotateZ,
            scale: 0.8,
            opacity: 0,
            transition: {
              ...exitSpring,
              // Use velocity for more natural exit
              velocity: velocity,
            }
          });

          // Trigger navigation
          if (direction > 0 && onPrev) {
            onPrev();
          } else if (direction < 0 && onNext) {
            onNext();
          }
        } else {
          // Rubber band back - can't navigate in this direction
          await controls.start({
            x: 0,
            rotateY: 0,
            rotateZ: 0,
            scale: 1,
            opacity: 1,
            transition: fluidSpring
          });
        }
      } else {
        // Didn't meet threshold - snap back with bounce
        await controls.start({
          x: 0,
          rotateY: 0,
          rotateZ: 0,
          scale: 1,
          opacity: 1,
          transition: fluidSpring
        });
      }

      setIsDragging(false);
    },
    [hasPrev, hasNext, onPrev, onNext, controls]
  );

  // Handle drag start
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  // Handle button navigation with animation
  const handlePrevClick = useCallback(async () => {
    if (hasPrev && onPrev) {
      setExitDirection(1);
      await controls.start({
        x: getScreenWidth() + 100,
        rotateY: -25,
        scale: 0.85,
        opacity: 0,
        transition: snappySpring
      });
      onPrev();
    }
  }, [hasPrev, onPrev, controls]);

  const handleNextClick = useCallback(async () => {
    if (hasNext && onNext) {
      setExitDirection(-1);
      await controls.start({
        x: -(getScreenWidth() + 100),
        rotateY: 25,
        scale: 0.85,
        opacity: 0,
        transition: snappySpring
      });
      onNext();
    }
  }, [hasNext, onNext, controls]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevClick();
      } else if (e.key === 'ArrowRight') {
        handleNextClick();
      }
    },
    [onClose, handlePrevClick, handleNextClick]
  );

  // Reset controls when photo changes
  useEffect(() => {
    if (photo) {
      // Reset motion value
      x.set(0);
      // Animate in from the opposite direction of exit
      controls.start({
        x: 0,
        rotateY: 0,
        rotateZ: 0,
        scale: 1,
        opacity: 1,
        transition: fluidSpring
      });
    }
  }, [photo?.id, controls, x]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => setIsFirstOpen(false), 500);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        setIsFirstOpen(true);
        setExitDirection(0);
      };
    }
    return undefined;
  }, [open, handleKeyDown]);

  if (!photo) return null;

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-lg"
            onClick={onClose}
          />

          {/* Navigation Buttons - Only visible on desktop */}
          {onPrev && (
            <NavButton direction="prev" onClick={handlePrevClick} disabled={!hasPrev} />
          )}
          {onNext && (
            <NavButton direction="next" onClick={handleNextClick} disabled={!hasNext} />
          )}

          {/* Swipe direction indicators for mobile */}
          {isMobile && (
            <>
              {/* Left indicator (next) */}
              <motion.div
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
                style={{ opacity: rightIndicatorOpacity }}
              >
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </div>
              </motion.div>

              {/* Right indicator (prev) */}
              <motion.div
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
                style={{ opacity: leftIndicatorOpacity }}
              >
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </motion.div>
            </>
          )}

          {/* 3D Perspective Container */}
          <div
            ref={cardRef}
            className="relative w-full max-w-4xl mx-2 md:mx-16"
            style={{ perspective: 1200 }}
            onMouseMove={!isMobile ? handleMouseMove : undefined}
            onMouseLeave={!isMobile ? handleMouseLeave : undefined}
          >
            {/* Main Card - uses useAnimation for programmatic control */}
            <motion.div
              key={photo.id}
              animate={controls}
              initial={{
                y: isFirstOpen ? 80 : 0,
                x: exitDirection !== 0 ? exitDirection * -100 : 0,
                opacity: 0,
                scale: 0.9,
                rotateY: exitDirection !== 0 ? exitDirection * 15 : 0,
              }}
              style={{
                // During drag, use motion values for real-time feedback
                x: isDragging ? smoothX : undefined,
                rotateY: isMobile && isDragging ? rotateY : (!isMobile ? hoverRotateY : undefined),
                rotateX: !isMobile ? hoverRotateX : undefined,
                rotateZ: isMobile && isDragging ? rotateZ : undefined,
                scale: isMobile && isDragging ? scale : undefined,
                transformStyle: 'preserve-3d',
              }}
              drag={isMobile ? "x" : false}
              dragDirectionLock
              dragElastic={0.3} // Higher elasticity = more natural feel
              dragMomentum={false} // We handle momentum ourselves
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              className={`relative will-change-transform ${isMobile ? 'touch-pan-y' : ''}`}
            >
              {/* Card content */}
              <div
                className="relative bg-canvas rounded-2xl shadow-2xl overflow-hidden"
                style={{ transformStyle: 'preserve-3d' }}
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
                  <div
                    className="relative flex-1 min-h-[300px] md:min-h-[500px] bg-canvas-recessed select-none"
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
                  </div>

                  {/* Details Section */}
                  <div
                    className="w-full md:w-80 p-6 bg-canvas overflow-y-auto select-none"
                  >
                    <div className="space-y-4">
                      {/* Dish name */}
                      {photo.dish_name && (
                        <h2 className="font-display text-xl md:text-2xl font-semibold text-ink leading-snug">
                          {photo.dish_name}
                        </h2>
                      )}

                      {/* Date stamp */}
                      <p className="text-caption text-ink-tertiary inline-block">
                        {formatDate(photo.created_at)}
                      </p>

                      {/* Descriptions */}
                      <div className="space-y-4">
                        {photo.description_cn && (
                          <span className="text-body text-ink leading-relaxed block">
                            {photo.description_cn}
                          </span>
                        )}

                        {photo.description_en && (
                          <span className={`text-body text-ink-secondary leading-relaxed block ${photo.description_cn ? "pt-4 border-t border-stroke" : ""}`}>
                            {photo.description_en}
                          </span>
                        )}

                        {!photo.description_en && !photo.description_cn && (
                          <p className="text-ink-tertiary italic">No description yet</p>
                        )}
                      </div>

                      {/* Decorative signature */}
                      <div className="pt-4 text-right">
                        <span className="font-accent text-lg text-ink-tertiary">
                          With love ♡
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
