"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { CalendarIcon, SearchIcon, SpinnerIcon, TagIcon } from "./icons"

export type SearchField = "all" | "title" | "date" | "tags"

export interface SearchBarProps {
  onSearch: (params: { q: string; field: SearchField }) => void
  onClear: () => void
  isSearching: boolean
}

const FIELD_ICON: Record<SearchField, typeof SearchIcon> = {
  all: SearchIcon,
  title: SearchIcon,
  date: CalendarIcon,
  tags: TagIcon,
}

const PLACEHOLDERS: Record<SearchField, string> = {
  all: "Search dishes, tags, dates...",
  title: "Search by dish name...",
  date: "Search by date (e.g. March 2025)...",
  tags: "Search by ingredient...",
}

const FILTERS: { id: SearchField; label: string }[] = [
  { id: "all", label: "All" },
  { id: "title", label: "Title" },
  { id: "date", label: "Date" },
  { id: "tags", label: "Tags" },
]

export function SearchBar({ onSearch, onClear, isSearching }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [field, setField] = useState<SearchField>("all")
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Expand and auto-focus the input
  const handleExpand = useCallback(() => {
    setExpanded(true)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }, [])

  // Query change — fire onSearch immediately for non-empty queries
  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      if (value.trim()) {
        onSearch({ q: value, field })
      }
    },
    [field, onSearch]
  )

  // Field change — re-fire search with current query if any
  const handleFieldChange = useCallback(
    (newField: SearchField) => {
      setField(newField)
      if (query.trim()) {
        onSearch({ q: query, field: newField })
      }
    },
    [query, onSearch]
  )

  // Clear — reset all state, collapse, notify parent
  const handleClear = useCallback(() => {
    setQuery("")
    setField("all")
    setExpanded(false)
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    onClear()
  }, [onClear])

  // Blur — collapse after short delay so filter chip taps don't trigger collapse
  const handleBlur = useCallback(() => {
    if (!query.trim()) {
      blurTimeoutRef.current = setTimeout(() => {
        setExpanded(false)
      }, 200)
    }
  }, [query])

  // Focus — cancel pending collapse
  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
  }, [])

  // Escape: clear query if present, otherwise collapse
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        if (query.trim()) {
          setQuery("")
          onClear()
        } else {
          setExpanded(false)
          onClear()
        }
      }
    },
    [query, onClear]
  )

  // Cleanup blur timeout on unmount
  useEffect(() => {
    return () => clearTimeout(blurTimeoutRef.current ?? undefined)
  }, [])

  const ActiveIcon = FIELD_ICON[field]

  return (
    <div
      className="px-4 py-2"
      role="search"
      aria-label="Search gallery"
      style={{ touchAction: "manipulation" }}
    >
      <AnimatePresence mode="wait">
        {!expanded ? (
          /* ---- Collapsed ---- */
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            onClick={handleExpand}
            className={cn(
              "w-full flex items-center gap-2.5 min-h-[44px] px-4",
              "bg-canvas-elevated border border-stroke rounded-xl",
              "text-ink-tertiary cursor-pointer",
              "hover:border-ink-tertiary/40 hover:text-ink-secondary",
              "transition-colors duration-200",
              "focus-ring"
            )}
            aria-label="Open search"
            style={{ touchAction: "manipulation" }}
          >
            <SearchIcon className="w-4 h-4 shrink-0" />
            <span className="text-sm font-body truncate">Search dishes...</span>
          </motion.button>
        ) : (
          /* ---- Expanded ---- */
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className={cn(
              "bg-canvas-elevated border border-stroke rounded-xl overflow-hidden",
              isSearching && "border-love/30 shadow-[0_0_0_1px_var(--love-soft)]"
            )}
          >
            {/* Input row */}
            <div className="flex items-center gap-2.5 px-4 min-h-[44px]">
              <ActiveIcon
                className="w-4 h-4 shrink-0 text-ink-tertiary"
                aria-hidden="true"
              />

              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onBlur={handleBlur}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                placeholder={PLACEHOLDERS[field]}
                className={cn(
                  "flex-1 bg-transparent border-none outline-none",
                  "text-sm font-body text-ink",
                  "placeholder:text-ink-tertiary",
                  "focus-ring"
                )}
                autoComplete="off"
                spellCheck={false}
                aria-label={`Search by ${field}`}
                style={{ touchAction: "manipulation" }}
              />

              {/* Loading spinner or clear button */}
              {isSearching ? (
                <SpinnerIcon
                  className="w-4 h-4 shrink-0 text-love"
                  aria-label="Searching"
                />
              ) : (
                <button
                  onClick={handleClear}
                  className={cn(
                    "shrink-0 p-1.5 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center",
                    "text-ink-tertiary hover:text-ink hover:bg-canvas-recessed",
                    "transition-colors duration-200 cursor-pointer",
                    "focus-ring"
                  )}
                  aria-label="Clear search"
                  style={{ touchAction: "manipulation" }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-2 px-4 pb-2.5 pt-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFieldChange(f.id)}
                  className={cn(
                    "inline-flex items-center px-3.5 py-2.5 rounded-lg text-sm font-medium font-body",
                    "min-h-[44px] min-w-[44px]",
                    "transition-colors duration-200 cursor-pointer focus-ring select-none",
                    field === f.id
                      ? "bg-love text-white shadow-sm"
                      : "text-ink-tertiary hover:text-ink hover:bg-canvas-recessed"
                  )}
                  aria-pressed={field === f.id}
                  aria-label={`Filter by ${f.label.toLowerCase()}`}
                  style={{ touchAction: "manipulation" }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
