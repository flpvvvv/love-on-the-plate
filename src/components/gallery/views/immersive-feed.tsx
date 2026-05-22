'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { formatDate, getDisplayDate } from '@/lib/utils';
import { useHaptics, useGestureHint } from '@/lib/hooks';
import type { PhotoWithUrls } from '@/types';

interface ImmersiveFeedProps {
  photos: PhotoWithUrls[];
  onPhotoTap?: (photo: PhotoWithUrls) => void;
}

export function ImmersiveFeed({ photos, onPhotoTap }: ImmersiveFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { vibrate } = useHaptics();
  const lastSnapIndex = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  // Track which photo is snapped into view
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const index = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, photos.length - 1));

    if (clampedIndex !== lastSnapIndex.current) {
      lastSnapIndex.current = clampedIndex;
      setActiveIndex(clampedIndex);
      vibrate('light');
    }
  }, [photos.length, vibrate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Arrow-key navigation for keyboard accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const container = containerRef.current;
    if (!container) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      const newIndex = Math.max(0, Math.min(activeIndex + dir, photos.length - 1));
      if (newIndex !== activeIndex) {
        container.scrollTo({ top: newIndex * container.clientHeight, behavior: 'smooth' });
      }
    }
  }, [activeIndex, photos.length]);

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-4rem)] text-center px-8">
        <div className="w-20 h-20 text-love mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
            />
          </svg>
        </div>
        <h3 className="text-display font-display font-semibold text-ink mb-2">No photos yet</h3>
        <p className="text-ink-secondary">Start documenting your culinary journey!</p>
      </div>
    );
  }

  // One-time scroll hint for first-time users
  const { showHint: showScrollHint, dismiss: dismissScrollHint } = useGestureHint('feed-scroll', {
    delay: 1200,
    duration: 3000,
  });

  // Dismiss hint on first scroll
  useEffect(() => {
    if (!showScrollHint) return;
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => dismissScrollHint();
    container.addEventListener('scroll', onScroll, { once: true, passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [showScrollHint, dismissScrollHint]);

  return (
    <div
      ref={containerRef}
      role="feed"
      aria-label="Photo feed"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="h-[calc(100dvh-4rem)] overflow-y-auto snap-y snap-mandatory overscroll-contain outline-none"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      {photos.map((photo, index) => (
        <FeedItem
          key={photo.id}
          photo={photo}
          isActive={index === activeIndex}
          onTap={() => onPhotoTap?.(photo)}
          priority={index <= 1}
          index={index}
          total={photos.length}
          prefersReducedMotion={prefersReducedMotion ?? false}
        />
      ))}

      {/* Spacer to allow last item to snap properly */}
      <div className="h-0 snap-end" />

      {/* Scroll gesture hint — first-time only */}
      <AnimatePresence>
        {showScrollHint && photos.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          >
            <div className="flex flex-col items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white px-4 py-2.5 rounded-full text-sm shadow-lg">
              <span>Swipe up to explore</span>
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-4 h-4"
                  aria-hidden="true"
                >
                  <path d="M12 5v14m0 0l7-7m-7 7l-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeedItem({
  photo,
  isActive,
  onTap,
  priority,
  index,
  total,
  prefersReducedMotion,
}: {
  photo: PhotoWithUrls;
  isActive: boolean;
  onTap: () => void;
  priority: boolean;
  index: number;
  total: number;
  prefersReducedMotion: boolean;
}) {
  const animateProps = prefersReducedMotion
    ? { opacity: 1, y: 0 }
    : undefined;

  return (
    <article
      role="article"
      aria-setsize={total}
      aria-posinset={index + 1}
      aria-label={photo.dish_name || 'Photo'}
      className="relative h-[calc(100dvh-4rem)] w-full snap-start snap-always"
    >
      {/* Full-bleed image */}
      <div className="absolute inset-0 bg-canvas-recessed">
        <Image
          src={photo.imageUrl}
          alt={photo.dish_name || photo.description_en || photo.description_cn || 'A homemade meal'}
          fill
          sizes="100vw"
          className="object-cover"
          priority={priority}
        />
      </div>

      {/* Top gradient for status bar legibility */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />

      {/* Bottom gradient + text overlay */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none">
        <div className="bg-gradient-to-t from-black/70 via-black/40 to-transparent pt-32 pb-6 px-5">
          {/* Dish name */}
          {photo.dish_name && (
            <motion.h2
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={isActive ? { opacity: 1, y: 0 } : (animateProps ?? { opacity: 0, y: 10 })}
              transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
              className="font-display text-2xl font-semibold text-white mb-1.5 drop-shadow-lg"
            >
              {photo.dish_name}
            </motion.h2>
          )}

          {/* Chinese description */}
          {photo.description_cn && (
            <motion.p
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={isActive ? { opacity: 1, y: 0 } : (animateProps ?? { opacity: 0, y: 10 })}
              transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25, delay: 0.2 }}
              className="text-white/90 text-sm leading-relaxed mb-2 line-clamp-2 drop-shadow"
            >
              {photo.description_cn}
            </motion.p>
          )}

          {/* Date + "tap for more" */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={isActive ? { opacity: 1 } : (prefersReducedMotion ? { opacity: 1 } : { opacity: 0 })}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.3 }}
            className="flex items-center justify-between"
          >
            <span className="text-white/60 text-xs">
              {formatDate(getDisplayDate(photo))}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTap();
              }}
              className="pointer-events-auto text-white/70 text-xs flex items-center gap-1 active:scale-95 transition-transform cursor-pointer focus-ring rounded-md px-2 py-1 -mr-2"
              aria-label={`View details for ${photo.dish_name || 'photo'}`}
            >
              <span>Details</span>
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
                <path d="M8.25 4.5l7.5 7.5-7.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </motion.div>
        </div>
      </div>

    </article>
  );
}
