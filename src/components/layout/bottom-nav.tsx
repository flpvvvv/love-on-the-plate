'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { GalleryView } from '@/types';

interface BottomNavProps {
  currentView?: GalleryView;
  onViewChange?: (view: GalleryView) => void;
  showViewSwitcher?: boolean;
}

const views: { id: GalleryView; label: string; icon: React.ReactNode }[] = [
  {
    id: 'floating',
    label: 'Plates',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
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
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
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
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
        <path d="M12 4v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 8 C12 8, 16 8, 18 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 14 C12 14, 8 14, 6 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="8" r="2" fill="currentColor" />
        <circle cx="12" cy="14" r="2" fill="currentColor" />
      </svg>
    ),
  },
];

export function BottomNav({ currentView, onViewChange, showViewSwitcher = true }: BottomNavProps) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isAdmin = pathname.startsWith('/admin');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom">
      {/* Glass background */}
      <div className="absolute inset-0 glass border-t border-stroke" />
      
      <div className="relative flex items-center justify-around h-16 px-2">
        {/* Gallery Views - Only show on home page */}
        {showViewSwitcher && isHome && onViewChange && (
          <>
            {views.map((view) => (
              <button
                key={view.id}
                onClick={() => onViewChange(view.id)}
                className={cn(
                  'relative flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors',
                  currentView === view.id
                    ? 'text-love'
                    : 'text-ink-tertiary hover:text-ink-secondary'
                )}
                aria-label={`Switch to ${view.label} view`}
              >
                {currentView === view.id && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute inset-1 bg-love-soft rounded-xl"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{view.icon}</span>
                <span className="relative z-10 text-micro mt-0.5">{view.label}</span>
              </button>
            ))}
          </>
        )}

        {/* Spacer if not on home */}
        {(!isHome || !showViewSwitcher) && <div className="flex-1" />}

        {/* Upload FAB */}
        <Link
          href="/admin"
          className={cn(
            'relative flex flex-col items-center justify-center transition-colors',
            isHome ? 'w-16 h-14' : 'flex-1 h-14',
            isAdmin ? 'text-love' : 'text-ink-tertiary hover:text-ink-secondary'
          )}
        >
          {isAdmin && (
            <motion.div
              layoutId="bottomNavIndicator"
              className="absolute inset-1 bg-love-soft rounded-xl"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75v3.75m0 0-1.5-1.5m1.5 1.5 1.5-1.5" />
            </svg>
          </span>
          <span className="relative z-10 text-micro mt-0.5">Upload</span>
        </Link>
      </div>
    </nav>
  );
}
