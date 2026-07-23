"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react"
import { cn } from "@/lib/utils"
import { CalendarIcon, SearchIcon, SpinnerIcon, TagIcon } from "./icons"

export type SearchField = "all" | "title" | "date" | "tags"

export interface SearchBarProps {
  onSearch: (params: { q: string; field: SearchField }) => void
  onClear: () => void
  isSearching: boolean
  /**
   * When false (mobile default), the bar collapses to a compact icon button
   * and stays expanded until explicitly cleared — no blur-collapse.
   * When true (desktop), blur on empty input collapses the bar. */
  collapsible?: boolean
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
  date: "Select a date preset...",
  tags: "Search or pick an ingredient...",
}

const FILTERS: { id: SearchField; label: string }[] = [
  { id: "all", label: "All" },
  { id: "title", label: "Title" },
  { id: "date", label: "Date" },
  { id: "tags", label: "Tags" },
]

// ---- Date presets ----

interface DatePreset {
  label: string
  /** Value passed as `q` to the backend. Matches YYYY or YYYY-MM format. */
  value: string
}

function buildDatePresets(): DatePreset[] {
  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth() + 1

  const presets: DatePreset[] = [
    { label: "This Year", value: String(thisYear) },
    { label: "Last Year", value: String(thisYear - 1) },
  ]

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]
  for (let m = thisMonth; m >= 1; m -= 1) {
    presets.push({
      label: `${monthNames[m - 1]} ${thisYear}`,
      value: `${thisYear}-${String(m).padStart(2, "0")}`,
    })
  }

  for (let y = thisYear - 2; y >= Math.max(thisYear - 5, 2020); y -= 1) {
    presets.push({ label: String(y), value: String(y) })
  }

  return presets
}

const DATE_PRESETS = buildDatePresets()

// ---- Component ----

export function SearchBar({
  onSearch,
  onClear,
  isSearching,
  collapsible = false,
}: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [field, setField] = useState<SearchField>("all")
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [tagSuggestionsLoading, setTagSuggestionsLoading] = useState(false)
  const tagsFetchedRef = useRef(false)

  const handleExpand = useCallback(() => {
    setExpanded(true)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }, [])

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      if (value.trim()) {
        onSearch({ q: value, field })
      }
    },
    [field, onSearch]
  )

  const handleDatePreset = useCallback(
    (preset: DatePreset) => {
      setQuery(preset.value)
      onSearch({ q: preset.value, field: "date" })
    },
    [onSearch]
  )

  const handleTagSuggestion = useCallback(
    (tag: string) => {
      setQuery(tag)
      onSearch({ q: tag, field: "tags" })
    },
    [onSearch]
  )

  const handleFieldChange = useCallback(
    (newField: SearchField) => {
      setField(newField)
      if (newField === "date") setQuery("")
      if (newField === "tags" && !tagsFetchedRef.current) {
        tagsFetchedRef.current = true
        setTagSuggestionsLoading(true)
        fetch("/api/analytics")
          .then((res) => res.json())
          .then((data: { topIngredients?: { ingredientName: string; count: number }[] }) => {
            if (data.topIngredients) {
              setTagSuggestions(data.topIngredients.map((i) => i.ingredientName))
            }
          })
          .catch(() => {
            fetch("/api/ingredients")
              .then((res) => res.json())
              .then((data: { ingredients?: string[] }) => {
                if (data.ingredients) {
                  setTagSuggestions(data.ingredients.slice(0, 20))
                }
              })
              .catch(() => {})
          })
          .finally(() => setTagSuggestionsLoading(false))
      }
      if (query.trim() && newField !== "date") {
        onSearch({ q: query, field: newField })
      }
    },
    [query, onSearch]
  )

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

  const handleBlur = useCallback(() => {
    if (!collapsible) return
    if (!query.trim()) {
      blurTimeoutRef.current = setTimeout(() => {
        setExpanded(false)
      }, 300)
    }
  }, [query, collapsible])

  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
  }, [])

  const handleFilterMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault()
  }, [])

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

  useEffect(() => {
    return () => clearTimeout(blurTimeoutRef.current ?? undefined)
  }, [])

  const ActiveIcon = FIELD_ICON[field]
  const showDatePresets = field === "date"
  const showTagSuggestions = field === "tags" && tagSuggestions.length > 0

  const collapsedButton = (
    <motion.button
      key="collapsed"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      onClick={handleExpand}
      className={cn(
        "inline-flex items-center justify-center w-[44px] h-[44px] rounded-xl",
        "bg-canvas-elevated border border-stroke",
        "text-ink-tertiary cursor-pointer",
        "hover:border-ink-tertiary/40 hover:text-ink-secondary",
        "transition-colors duration-200",
        "focus-ring"
      )}
      aria-label="Open search"
      style={{ touchAction: "manipulation" }}
    >
      <SearchIcon className="w-4 h-4" />
    </motion.button>
  )

  const expandedContent = (
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
          value={showDatePresets ? "" : query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[field]}
          readOnly={showDatePresets}
          className={cn(
            "flex-1 bg-transparent border-none outline-none",
            "text-sm font-body text-ink",
            "placeholder:text-ink-tertiary",
            "[&::-webkit-search-cancel-button]:hidden",
            showDatePresets && "cursor-default",
            "focus-ring"
          )}
          autoComplete="off"
          spellCheck={false}
          aria-label={`Search by ${field}`}
          style={{ touchAction: "manipulation" }}
        />

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
            onMouseDown={handleFilterMouseDown}
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

      {/* Date presets */}
      {showDatePresets && (
        <div className="px-4 pb-2.5">
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => {
              const isActive = query === preset.value
              return (
                <button
                  key={preset.value}
                  onClick={() => handleDatePreset(preset)}
                  onMouseDown={handleFilterMouseDown}
                  className={cn(
                    "inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium font-body",
                    "min-h-[36px]",
                    "transition-colors duration-200 cursor-pointer focus-ring select-none",
                    isActive
                      ? "bg-love text-white shadow-sm"
                      : "text-ink-tertiary hover:text-ink hover:bg-canvas-recessed border border-stroke"
                  )}
                  aria-pressed={isActive}
                  aria-label={`Filter by ${preset.label}`}
                  style={{ touchAction: "manipulation" }}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Tag suggestions */}
      {showTagSuggestions && (
        <div className="px-4 pb-2.5">
          {tagSuggestionsLoading ? (
            <div className="flex items-center gap-2 py-1">
              <SpinnerIcon className="w-3.5 h-3.5 text-ink-tertiary animate-spin" />
              <span className="text-xs text-ink-tertiary font-body">Loading tags...</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tagSuggestions.map((tag) => {
                const isActive = query === tag
                return (
                  <button
                    key={tag}
                    onClick={() => handleTagSuggestion(tag)}
                    onMouseDown={handleFilterMouseDown}
                    className={cn(
                      "inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium font-body",
                      "min-h-[36px]",
                      "transition-colors duration-200 cursor-pointer focus-ring select-none",
                      isActive
                        ? "bg-love text-white shadow-sm"
                        : "text-ink-tertiary hover:text-ink hover:bg-canvas-recessed border border-stroke"
                    )}
                    aria-pressed={isActive}
                    aria-label={`Search for ${tag}`}
                    style={{ touchAction: "manipulation" }}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )

  return (
    <div
      className="px-4 py-2"
      role="search"
      aria-label="Search gallery"
      style={{ touchAction: "manipulation" }}
    >
      <AnimatePresence mode="wait">
        {!expanded ? collapsedButton : expandedContent}
      </AnimatePresence>
    </div>
  )
}
