"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface IngredientTagsProps {
  ingredients: string[]
  onRemove?: (ingredient: string) => void
  onAdd?: (ingredient: string) => void
  max?: number
  editable?: boolean
  /** For "compact" display: tighter chip spacing */
  compact?: boolean
  /** For overlay displays (e.g. on top of photos): solid ink chips */
  overlay?: boolean
}

export function IngredientTags({
  ingredients,
  onRemove,
  onAdd,
  max,
  editable = false,
  compact = false,
  overlay = false,
}: IngredientTagsProps) {
  const [adding, setAdding] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [allIngredients, setAllIngredients] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const suggestionRef = useRef(false)

  // Fetch known ingredients for autocomplete
  useEffect(() => {
    if (!editable) return
    fetch("/api/ingredients")
      .then((res) => res.json())
      .then((data) => {
        if (data.ingredients) setAllIngredients(data.ingredients)
      })
      .catch(() => {})
  }, [editable])

  // Filter suggestions based on input
  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([])
      return
    }
    const filtered = allIngredients
      .filter(
        (ing) => !ingredients.includes(ing) && ing.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 5)
    setSuggestions(filtered)
  }, [inputValue, allIngredients, ingredients])

  // Click outside closes the input (onBlur handles commit on both mobile & desktop)
  useEffect(() => {
    if (!adding) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAdding(false)
        setInputValue("")
        setSuggestions([])
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [adding])

  // Focus input when adding
  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  const handleAdd = useCallback(() => {
    const value = inputValue.trim()
    if (value && onAdd) {
      onAdd(value)
    }
    setInputValue("")
    setAdding(false)
    setSuggestions([])
  }, [inputValue, onAdd])

  const handleBlur = useCallback(() => {
    // If a suggestion click is in-flight, let the click handler commit it
    if (suggestionRef.current) {
      suggestionRef.current = false
      return
    }
    handleAdd()
  }, [handleAdd])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleAdd()
      } else if (e.key === "Escape") {
        setAdding(false)
        setInputValue("")
        setSuggestions([])
      }
    },
    [handleAdd]
  )

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (onAdd) onAdd(suggestion)
      setInputValue("")
      setAdding(false)
      setSuggestions([])
    },
    [onAdd]
  )

  // Overlay chips sit on arbitrary photos, so they carry the ink fill itself.
  // Utilities (not `.nb-ink`) because `.chip` is declared after the fills and
  // would otherwise win the background back.
  const chipClass = cn("chip chip-ing", overlay && "bg-ink text-canvas hover:bg-ink")

  if (ingredients.length === 0 && !editable) return null
  if (ingredients.length === 0 && editable && !adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className={cn(
          "chip cursor-pointer border-dashed",
          overlay && "bg-ink text-canvas hover:bg-ink"
        )}
      >
        <svg className="ic ic-sm" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        添加食材
      </button>
    )
  }

  // Determine visible tags vs overflow
  const displayMax = max && max > 0 ? max : ingredients.length
  const visible = ingredients.slice(0, displayMax)
  const overflow = ingredients.length - displayMax

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-wrap items-center", compact ? "gap-1" : "gap-2")}
    >
      {visible.map((ingredient) => (
        <span key={ingredient} className={chipClass}>
          {ingredient}
          {editable && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(ingredient)}
              className="chip-rm cursor-pointer"
              aria-label={`Remove ${ingredient}`}
            >
              <svg className="ic ic-sm" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </span>
      ))}

      {overflow > 0 && <span className={chipClass}>+{overflow} more</span>}

      {editable && adding && (
        <span className="relative inline-flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="输入食材…"
            autoComplete="off"
            aria-label="输入食材"
            className={cn("input", compact ? "w-24" : "w-32")}
          />
          {suggestions.length > 0 && (
            <span className="nb absolute top-full left-0 z-20 mt-2 min-w-[140px]">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => {
                    suggestionRef.current = true
                  }}
                  onClick={() => handleSuggestionClick(s)}
                  className="block min-h-[44px] w-full cursor-pointer border-b-[2.5px] border-line px-3 text-left font-body text-sm normal-case tracking-normal last:border-b-0 hover:bg-wash"
                >
                  {s}
                </button>
              ))}
            </span>
          )}
        </span>
      )}

      {editable && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={cn(
            "chip cursor-pointer border-dashed px-3",
            overlay && "bg-ink text-canvas hover:bg-ink"
          )}
          aria-label="Add ingredient"
        >
          <svg className="ic ic-sm" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}
    </div>
  )
}
