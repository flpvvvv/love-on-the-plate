"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface IngredientTagsProps {
  ingredients: string[]
  onRemove?: (ingredient: string) => void
  onAdd?: (ingredient: string) => void
  max?: number
  editable?: boolean
  /** For "compact" display: smaller pills, lighter colors */
  compact?: boolean
  /** For overlay displays (e.g. on dark gradients): white text */
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

  if (ingredients.length === 0 && !editable) return null
  if (ingredients.length === 0 && editable && !adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className={`inline-flex items-center gap-1 rounded-full border border-dashed transition-colors cursor-pointer
          ${
            overlay
              ? "border-white/30 text-white/60 hover:border-white/50 hover:text-white/80"
              : "border-stroke text-ink-tertiary hover:border-love-soft hover:text-love"
          }
          ${compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"}
        `}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" aria-hidden="true">
          <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        添加食材
      </button>
    )
  }

  // Determine visible tags vs overflow
  const displayMax = max && max > 0 ? max : ingredients.length
  const visible = ingredients.slice(0, displayMax)
  const overflow = ingredients.length - displayMax

  const pillBase = `inline-flex items-center gap-0.5 rounded-full font-body
    ${overlay ? "bg-white/15 text-white/90" : "bg-love-soft text-love"}
    ${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}
  `

  const removeBtn = `ml-0.5 rounded-full p-0.5 transition-colors cursor-pointer
    ${
      overlay
        ? "hover:bg-white/20 text-white/60 hover:text-white"
        : "hover:bg-love/15 text-love/60 hover:text-love"
    }
  `

  return (
    <div ref={containerRef} className="flex flex-wrap items-center gap-1.5">
      {visible.map((ingredient) => (
        <span key={ingredient} className={pillBase}>
          {ingredient}
          {editable && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(ingredient)}
              className={removeBtn}
              aria-label={`Remove ${ingredient}`}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" aria-hidden="true">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </span>
      ))}

      {overflow > 0 && (
        <span className={`${pillBase} ${overlay ? "bg-white/10" : "bg-love-soft/50"}`}>
          +{overflow} more
        </span>
      )}

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
            className={`rounded-full border bg-transparent outline-none
              ${
                overlay
                  ? "border-white/30 text-white placeholder:text-white/40"
                  : "border-stroke text-ink placeholder:text-ink-tertiary focus-visible:ring-2 focus-visible:ring-love"
              }
              ${compact ? "px-2 py-0.5 text-[10px] w-20" : "px-2.5 py-1 text-xs w-24"}
            `}
          />
          {suggestions.length > 0 && (
            <span
              className={`absolute top-full left-0 mt-1 rounded-xl overflow-hidden shadow-lg z-20 min-w-[120px]
                ${overlay ? "bg-canvas-elevated" : "bg-canvas-elevated border border-stroke"}
              `}
            >
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => { suggestionRef.current = true }}
                  onClick={() => handleSuggestionClick(s)}
                  className={`block w-full text-left px-3 py-2 text-xs hover:bg-canvas-recessed transition-colors cursor-pointer
                    ${overlay ? "text-ink" : "text-ink-secondary"}
                  `}
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
          className={`inline-flex items-center justify-center rounded-full border border-dashed transition-colors cursor-pointer
            ${
              overlay
                ? "border-white/30 text-white/60 hover:border-white/50 hover:text-white/80"
                : "border-stroke text-ink-tertiary hover:border-love-soft hover:text-love"
            }
            ${compact ? "w-5 h-5" : "w-6 h-6"}
          `}
          aria-label="Add ingredient"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" aria-hidden="true">
            <path
              d="M12 5v14m-7-7h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
