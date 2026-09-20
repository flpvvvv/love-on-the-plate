"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
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
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
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

export function SearchBar({ onSearch, onClear, isSearching, collapsible = false }: SearchBarProps) {
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14, ease: [0.2, 0.9, 0.3, 1] }}
      onClick={handleExpand}
      className="icon-btn cursor-pointer"
      aria-label="Open search"
      style={{ touchAction: "manipulation" }}
    >
      <SearchIcon className="ic" />
    </motion.button>
  )

  const expandedContent = (
    <motion.div
      key="expanded"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14, ease: [0.2, 0.9, 0.3, 1] }}
      className={cn("nb", isSearching && "sh-cobalt")}
    >
      {/* Input row */}
      <div className="search-row">
        <ActiveIcon className="ic ml-1 shrink-0 text-ink-secondary" aria-hidden="true" />

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
          className={cn("sinput", showDatePresets && "cursor-default")}
          autoComplete="off"
          spellCheck={false}
          aria-label={`Search by ${field}`}
          style={{ touchAction: "manipulation" }}
        />

        {isSearching ? (
          <SpinnerIcon className="ic shrink-0 text-cobalt" aria-label="Searching" />
        ) : (
          <button
            onClick={handleClear}
            className="icon-btn icon-btn-bare shrink-0 cursor-pointer"
            aria-label="Clear search"
            style={{ touchAction: "manipulation" }}
          >
            <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Field presets */}
      <div className="flex flex-wrap items-center gap-2 px-3 pt-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => handleFieldChange(f.id)}
            onMouseDown={handleFilterMouseDown}
            className="preset cursor-pointer select-none"
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
        <div className="flex flex-wrap gap-2 px-3 pt-3">
          {DATE_PRESETS.map((preset) => {
            const isActive = query === preset.value
            return (
              <button
                key={preset.value}
                onClick={() => handleDatePreset(preset)}
                onMouseDown={handleFilterMouseDown}
                className="preset cursor-pointer select-none"
                aria-pressed={isActive}
                aria-label={`Filter by ${preset.label}`}
                style={{ touchAction: "manipulation" }}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Tag suggestions */}
      {showTagSuggestions && (
        <div className="px-3 pb-3 pt-3">
          {tagSuggestionsLoading ? (
            <div className="flex items-center gap-2 py-1">
              <SpinnerIcon className="ic ic-sm text-ink-secondary" />
              <span className="text-caption font-body text-ink-secondary">Loading tags...</span>
            </div>
          ) : (
            <div className="nb nb-flat">
              {tagSuggestions.map((tag) => {
                const isActive = query === tag
                return (
                  <button
                    key={tag}
                    onClick={() => handleTagSuggestion(tag)}
                    onMouseDown={handleFilterMouseDown}
                    className={cn(
                      "flex min-h-[44px] w-full cursor-pointer items-center gap-3 border-b-[2.5px] border-line px-3 text-left font-body text-sm normal-case tracking-normal last:border-b-0",
                      isActive ? "bg-butter text-on-fill" : "hover:bg-wash"
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
      <AnimatePresence mode="wait">{!expanded ? collapsedButton : expandedContent}</AnimatePresence>
    </div>
  )
}
