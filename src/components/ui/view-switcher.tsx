"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { GalleryView } from "@/types"
import { GridIcon, PlatesIcon, TimelineIcon } from "./icons"

interface ViewSwitcherProps {
  currentView: GalleryView
  onViewChange: (view: GalleryView) => void
}

const views: { id: GalleryView; label: string; icon: ReactNode }[] = [
  { id: "floating", label: "Plates", icon: <PlatesIcon className="ic-sm" /> },
  { id: "masonry", label: "Grid", icon: <GridIcon className="ic-sm" /> },
  { id: "timeline", label: "Timeline", icon: <TimelineIcon className="ic-sm" /> },
]

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  const activeIndex = Math.max(
    views.findIndex((view) => view.id === currentView),
    0
  )

  return (
    <div className="switcher" role="tablist">
      <span
        className="sw-ind"
        aria-hidden="true"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {views.map((view) => {
        const isActive = currentView === view.id
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={cn(
              "flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer",
              isActive && "text-on-cobalt"
            )}
            role="tab"
            aria-selected={isActive}
            aria-label={`Switch to ${view.label} view`}
          >
            {view.icon}
            <span className="text-xs sm:text-sm">{view.label}</span>
          </button>
        )
      })}
    </div>
  )
}
