'use client';

import { type ReactNode, useEffect } from 'react';
import { Drawer } from 'vaul';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery, useFocusTrap } from '@/lib/hooks';
import { cn } from '@/lib/utils';

interface ResponsiveSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** Optional navigation callbacks for lightbox-style prev/next (desktop only). */
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

function MobileDrawer({ open, onClose, children }: ResponsiveSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl bg-canvas outline-none"
          style={{ overscrollBehavior: 'contain' }}
        >
          <Drawer.Title className="sr-only">Photo details</Drawer.Title>
          {/* Drag handle */}
          <div className="mx-auto mt-3 mb-2 h-1 w-10 shrink-0 rounded-full bg-ink-tertiary/30" />
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8 safe-bottom">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function DesktopDialog({
  open,
  onClose,
  children,
  className,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: ResponsiveSheetProps) {
  const focusTrapRef = useFocusTrap(open);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div
          ref={focusTrapRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Navigation — prev button, positioned in the backdrop area */}
          {onPrev && (
            <motion.button
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.05 }}
              onClick={onPrev}
              disabled={!hasPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-md text-white border border-white/20 hover:bg-white/25 hover:scale-105 transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer focus-ring"
              aria-label="Previous photo"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          )}

          {/* Navigation — next button, positioned in the backdrop area */}
          {onNext && (
            <motion.button
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.05 }}
              onClick={onNext}
              disabled={!hasNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-md text-white border border-white/20 hover:bg-white/25 hover:scale-105 transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer focus-ring"
              aria-label="Next photo"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          )}

          {/* Modal card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'relative bg-canvas rounded-2xl shadow-2xl max-h-[90vh] w-full max-w-xl overflow-hidden',
              className,
            )}
          >
            {/* Close button — floats over the image (44px touch target) */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors cursor-pointer focus-ring"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Scrollable content area — no padding so images can fill edge-to-edge */}
            <div
              className="overflow-y-auto max-h-[90vh]"
              style={{ overscrollBehavior: 'contain' }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ResponsiveSheet(props: ResponsiveSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return <DesktopDialog {...props} />;
  }

  return <MobileDrawer {...props} />;
}
