'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from 'framer-motion';
import { useMediaQuery, useGestureHint } from '@/lib/hooks';
import { formatDate, getDisplayDate } from '@/lib/utils';
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

// Minimum movement (px) before classifying gesture as horizontal or vertical
const DIRECTION_LOCK_THRESHOLD = 10;

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
 * Used inside ResponsiveSheet — bottom drawer on mobile, centered lightbox on desktop.
 *
 * Navigation gestures (mobile):
 *   Attaches touch listeners to the Vaul [data-vaul-drawer] element so horizontal
 *   swipe works across the entire drawer surface — handle, image, text, padding.
 *   Direction locking ensures vertical scroll / Vaul dismiss are unaffected.
 *
 * Navigation gestures (desktop):
 *   Framer Motion drag="x" on the image with rubber-band feedback.
 *   External prev/next buttons on the lightbox backdrop.
 */
export function PhotoModalContent({
  photo,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: PhotoModalContentProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const prefersReducedMotion = useReducedMotion();

  // One-time swipe hint for mobile users
  const { showHint: showSwipeHint, dismiss: dismissSwipeHint } = useGestureHint('modal-swipe', {
    delay: 600,
    duration: 2500,
  });

  // Track swipe direction for enter/exit animation: 1 = next, -1 = prev
  const [direction, setDirection] = useState(0);

  // Ref to the outermost wrapper — used to find the Vaul drawer via .closest()
  const contentRef = useRef<HTMLDivElement>(null);

  // Stable ref for navigation state — avoids re-attaching listeners on each render
  const navRef = useRef({ hasNext, hasPrev, onNext, onPrev });
  navRef.current = { hasNext, hasPrev, onNext, onPrev };

  // ---------------------------------------------------------------------------
  // Full-drawer swipe (mobile only)
  // Walks up from contentRef to find [data-vaul-drawer] and attaches native
  // touch listeners on that element. Direction locking (10 px dead-zone)
  // classifies each gesture as horizontal → navigate or vertical → ignore.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isDesktop) return;

    const drawerEl = contentRef.current?.closest(
      '[data-vaul-drawer]',
    ) as HTMLElement | null;
    if (!drawerEl) return;

    let touchStart: { x: number; y: number; time: number } | null = null;
    let gestureDir: 'horizontal' | 'vertical' | null = null;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
      gestureDir = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStart || gestureDir) return;
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - touchStart.x);
      const dy = Math.abs(t.clientY - touchStart.y);
      if (dx < DIRECTION_LOCK_THRESHOLD && dy < DIRECTION_LOCK_THRESHOLD) return;
      gestureDir = dx > dy ? 'horizontal' : 'vertical';
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart || gestureDir !== 'horizontal') {
        touchStart = null;
        gestureDir = null;
        return;
      }

      const { hasNext, hasPrev, onNext, onPrev } = navRef.current;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const elapsed = (Date.now() - touchStart.time) / 1000 || 0.001;
      const velocity = Math.abs(dx / elapsed);

      const triggered =
        Math.abs(dx) > SWIPE_DISTANCE_THRESHOLD ||
        velocity > SWIPE_VELOCITY_THRESHOLD;

      if (triggered) {
        if (dx < 0 && hasNext) {
          setDirection(1);
          onNext?.();
        } else if (dx > 0 && hasPrev) {
          setDirection(-1);
          onPrev?.();
        }
      }

      touchStart = null;
      gestureDir = null;
    };

    drawerEl.addEventListener('touchstart', onTouchStart, { passive: true });
    drawerEl.addEventListener('touchmove', onTouchMove, { passive: true });
    drawerEl.addEventListener('touchend', onTouchEnd);

    return () => {
      drawerEl.removeEventListener('touchstart', onTouchStart);
      drawerEl.removeEventListener('touchmove', onTouchMove);
      drawerEl.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDesktop]);

  // ---------------------------------------------------------------------------
  // Framer Motion drag handler — desktop image only (rubber-band feedback)
  // ---------------------------------------------------------------------------
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
    <div ref={contentRef} className="space-y-4 md:pb-5">
      {/* Image — drag on desktop for rubber-band; mobile swipe handled by drawer */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-canvas-recessed -mx-4 md:mx-0 md:rounded-none">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={photo.id}
            custom={direction}
            variants={prefersReducedMotion ? undefined : slideVariants}
            initial={prefersReducedMotion ? { opacity: 1 } : 'enter'}
            animate={prefersReducedMotion ? { opacity: 1 } : 'center'}
            exit={prefersReducedMotion ? { opacity: 0 } : 'exit'}
            transition={prefersReducedMotion ? { duration: 0 } : {
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.15 },
            }}
            drag={isDesktop ? 'x' : false}
            dragConstraints={isDesktop ? { left: 0, right: 0 } : undefined}
            dragElastic={isDesktop ? dragElastic : undefined}
            onDragEnd={isDesktop ? handleDragEnd : undefined}
            className="absolute inset-0"
            style={isDesktop ? { touchAction: 'pan-y' } : undefined}
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

        {/* Prev/next buttons — kept as accessibility fallback + visual affordance */}
        <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none z-10 md:hidden">
          {onPrev && (
            <button
              onClick={() => { handlePrev(); dismissSwipeHint(); }}
              disabled={!hasPrev}
              className="pointer-events-auto w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-20 transition-opacity active:scale-95 cursor-pointer focus-ring"
              aria-label="Previous photo"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {onNext && (
            <button
              onClick={() => { handleNext(); dismissSwipeHint(); }}
              disabled={!hasNext}
              className="pointer-events-auto w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-20 transition-opacity active:scale-95 cursor-pointer focus-ring"
              aria-label="Next photo"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Swipe gesture hint — first-time mobile users */}
        <AnimatePresence>
          {showSwipeHint && !isDesktop && (hasPrev || hasNext) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 bottom-3 flex justify-center z-20 pointer-events-none"
            >
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs shadow-lg">
                <motion.div
                  animate={{ x: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-3.5 h-3.5"
                    aria-hidden="true"
                  >
                    <path d="M19 12H5m0 0l7-7m-7 7l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>
                <span>Swipe to navigate</span>
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-3.5 h-3.5"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14m0 0l-7-7m7 7l-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Details — padded on desktop since the modal scroll container has no padding */}
      <AnimatePresence mode="wait">
        <motion.div
          key={photo.id}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }}
          className="space-y-3 md:px-5"
        >
          {/* Dish name */}
          {photo.dish_name && (
            <h2 className="font-display text-xl font-semibold text-ink leading-snug">
              {photo.dish_name}
            </h2>
          )}

          {/* Date */}
          <p className="text-caption text-ink-tertiary">
            {formatDate(getDisplayDate(photo))}
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
