'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '@/lib/utils';
import type { PhotoWithUrls } from '@/types';

interface DetailPanelProps {
  photo: PhotoWithUrls | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function DetailPanel({
  photo,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: DetailPanelProps) {
  // Keyboard navigation
  useEffect(() => {
    if (!photo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [photo, onClose, hasPrev, hasNext, onPrev, onNext]);

  return (
    <AnimatePresence mode="wait">
      {photo && (
        <motion.aside
          key="detail-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 420, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className="h-screen sticky top-0 border-l border-stroke bg-canvas overflow-hidden shrink-0"
        >
          <div className="h-full flex flex-col w-[420px]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-stroke shrink-0">
              <div className="flex items-center gap-2">
                {onPrev && (
                  <button
                    onClick={onPrev}
                    disabled={!hasPrev}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-secondary hover:text-ink hover:bg-canvas-recessed transition-colors disabled:opacity-30"
                    aria-label="Previous photo"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                      <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
                {onNext && (
                  <button
                    onClick={onNext}
                    disabled={!hasNext}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-secondary hover:text-ink hover:bg-canvas-recessed transition-colors disabled:opacity-30"
                    aria-label="Next photo"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-secondary hover:text-ink hover:bg-canvas-recessed transition-colors"
                aria-label="Close detail panel"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Photo content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  {/* Image */}
                  <div className="relative aspect-square bg-canvas-recessed">
                    <Image
                      src={photo.imageUrl}
                      alt={photo.dish_name || photo.description_en || photo.description_cn || 'A homemade meal'}
                      fill
                      sizes="420px"
                      className="object-cover"
                      priority
                    />
                  </div>

                  {/* Details */}
                  <div className="p-5 space-y-4">
                    {photo.dish_name && (
                      <h2 className="font-display text-xl font-semibold text-ink leading-snug">
                        {photo.dish_name}
                      </h2>
                    )}

                    <p className="text-caption text-ink-tertiary">
                      {formatDate(photo.created_at)}
                    </p>

                    {photo.description_cn && (
                      <p className="text-body text-ink leading-relaxed">
                        {photo.description_cn}
                      </p>
                    )}

                    {photo.description_en && (
                      <p className={`text-body text-ink-secondary leading-relaxed ${photo.description_cn ? 'pt-4 border-t border-stroke' : ''}`}>
                        {photo.description_en}
                      </p>
                    )}

                    {!photo.description_en && !photo.description_cn && (
                      <p className="text-ink-tertiary italic">No description yet</p>
                    )}

                    <div className="pt-4 text-right">
                      <span className="font-accent text-lg text-ink-tertiary">
                        With love ♡
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
