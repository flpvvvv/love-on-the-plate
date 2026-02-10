'use client';

import { type ReactNode } from 'react';
import { Drawer } from 'vaul';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@/lib/hooks';
import { cn } from '@/lib/utils';

interface ResponsiveSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
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

function DesktopDialog({ open, onClose, children, className }: ResponsiveSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'relative bg-canvas rounded-2xl shadow-xl max-h-[90vh] overflow-hidden',
              className
            )}
            style={{ overscrollBehavior: 'contain' }}
          >
            {children}
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
