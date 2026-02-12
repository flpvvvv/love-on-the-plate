'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PlatesIcon, GridIcon, TimelineIcon } from './icons';
import type { GalleryView } from '@/types';

interface ViewSwitcherProps {
  currentView: GalleryView;
  onViewChange: (view: GalleryView) => void;
}

const views: { id: GalleryView; label: string; icon: ReactNode }[] = [
  { id: 'floating', label: 'Plates', icon: <PlatesIcon /> },
  { id: 'masonry', label: 'Grid', icon: <GridIcon /> },
  { id: 'timeline', label: 'Timeline', icon: <TimelineIcon /> },
];

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="inline-flex bg-canvas-elevated border border-stroke rounded-xl p-1 gap-1 shadow-sm" role="tablist">
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={cn(
            'relative min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 cursor-pointer focus-ring',
            currentView === view.id ? 'text-white' : 'text-ink-tertiary hover:text-ink'
          )}
          role="tab"
          aria-selected={currentView === view.id}
          aria-label={`Switch to ${view.label} view`}
        >
          {currentView === view.id && (
            <motion.div
              layoutId="viewIndicator"
              className="absolute inset-0 bg-love rounded-lg shadow-sm"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10">{view.icon}</span>
          <span className="relative z-10 text-xs sm:text-sm">{view.label}</span>
        </button>
      ))}
    </div>
  );
}
