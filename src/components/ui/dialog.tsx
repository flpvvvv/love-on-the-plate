"use client"

import { AnimatePresence, motion } from "framer-motion"
import { type ReactNode, useCallback, useEffect } from "react"
import { useFocusTrap } from "@/lib/hooks"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
  const focusTrapRef = useFocusTrap(open)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [open, handleKeyDown])

  return (
    <AnimatePresence>
      {open && (
        <div
          ref={focusTrapRef}
          className="fixed inset-0 z-50 flex items-center justify-center"
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

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.14, ease: [0.2, 0.9, 0.3, 1] }}
            className={cn("nb shadow-xl relative max-h-[90vh] overflow-hidden", className)}
            style={{ overscrollBehavior: "contain" }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="icon-btn absolute top-4 right-4 z-10 cursor-pointer"
      aria-label="Close"
    >
      <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>
  )
}
