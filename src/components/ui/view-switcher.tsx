'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { GalleryView } from '@/types';

interface ViewSwitcherProps {
  currentView: GalleryView;
  onViewChange: (view: GalleryView) => void;
}

const views: { id: GalleryView; label: string; icon: ReactNode }[] = [
  {
    id: 'floating',
    label: 'Plates',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
        <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="17" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'masonry',
    label: 'Grid',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
        <rect x="3" y="3" width="7" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="3" width="7" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="15" width="7" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="14" y="11" width="7" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
        <path d="M12 4v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M12 8 C12 8, 16 8, 18 8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M12 14 C12 14, 8 14, 6 14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="8" r="2" fill="currentColor" />
        <circle cx="12" cy="14" r="2" fill="currentColor" />
      </svg>
    ),
  },
];

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="inline-flex bg-canvas-elevated border border-stroke rounded-xl p-1 gap-1 shadow-sm">
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={cn(
            'relative px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
            currentView === view.id ? 'text-white' : 'text-ink-tertiary hover:text-ink'
          )}
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
          <span className="relative z-10 hidden sm:inline">{view.label}</span>
        </button>
      ))}
    </div>
  );
}
