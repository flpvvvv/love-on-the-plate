"use client"

import { AnimatePresence, motion } from "framer-motion"
import { type ReactNode, useEffect } from "react"
import { Drawer } from "vaul"
import { useFocusTrap, useMediaQuery } from "@/lib/hooks"
import { cn } from "@/lib/utils"

interface ResponsiveSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  /** Optional navigation callbacks for lightbox-style prev/next (desktop only). */
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

function MobileDrawer({ open, onClose, children }: ResponsiveSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-backdrop fixed inset-0 z-50" />
        <Drawer.Content
          className="sheet-body fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col outline-none"
          style={{ overscrollBehavior: "contain" }}
        >
          <Drawer.Title className="sr-only">Photo details</Drawer.Title>
          {/* Drag handle */}
          <div className="sheet-grab shrink-0" aria-hidden="true" />
          <div className="flex-1 overflow-y-auto overscroll-contain pb-8 safe-bottom">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
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
  const focusTrapRef = useFocusTrap(open)

  // Escape key to close
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

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
            transition={{ duration: 0.14 }}
            className="sheet-backdrop absolute inset-0"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Navigation — prev button, positioned in the backdrop area */}
          {onPrev && (
            <motion.button
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.14, ease: [0.2, 0.9, 0.3, 1], delay: 0.05 }}
              onClick={onPrev}
              disabled={!hasPrev}
              className="icon-btn absolute left-4 top-1/2 -mt-[22px] z-20 cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
              aria-label="Previous photo"
            >
              <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </motion.button>
          )}

          {/* Navigation — next button, positioned in the backdrop area */}
          {onNext && (
            <motion.button
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.14, ease: [0.2, 0.9, 0.3, 1], delay: 0.05 }}
              onClick={onNext}
              disabled={!hasNext}
              className="icon-btn absolute right-4 top-1/2 -mt-[22px] z-20 cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
              aria-label="Next photo"
            >
              <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          )}

          {/* Modal card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.14, ease: [0.2, 0.9, 0.3, 1] }}
            className={cn(
              "nb shadow-2xl relative max-h-[90vh] w-full max-w-xl overflow-hidden",
              className
            )}
          >
            {/* Close button — floats over the image (44px touch target) */}
            <button
              onClick={onClose}
              className="icon-btn absolute top-3 right-3 z-20 cursor-pointer"
              aria-label="Close"
            >
              <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Scrollable content area — no padding so images can fill edge-to-edge */}
            <div className="overflow-y-auto max-h-[90vh]" style={{ overscrollBehavior: "contain" }}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function ResponsiveSheet(props: ResponsiveSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (isDesktop) {
    return <DesktopDialog {...props} />
  }

  return <MobileDrawer {...props} />
}
