'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/ui';
import { useGalleryContext } from './app-shell';
import { cn } from '@/lib/utils';
import type { GalleryView } from '@/types';

const galleryViews: { id: GalleryView; label: string; icon: React.ReactNode }[] = [
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
        <path d="M12 8 C12 8, 16 8, 18 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 14 C12 14, 8 14, 6 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="8" r="2" fill="currentColor" />
        <circle cx="12" cy="14" r="2" fill="currentColor" />
      </svg>
    ),
  },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isAdmin = pathname.startsWith('/admin');
  const { galleryView, setGalleryView } = useGalleryContext();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 border-r border-stroke bg-canvas-elevated/80 backdrop-blur-xl transition-all duration-300 ease-spring z-40 shrink-0',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="px-4 h-16 flex items-center gap-3 border-b border-stroke shrink-0">
        <Link href="/" className="flex items-center gap-3 group min-w-0">
          <div className="w-9 h-9 shrink-0 transition-transform duration-300 ease-spring group-hover:scale-110">
            <Image
              src="/logo.svg"
              alt="Love on the Plate"
              width={36}
              height={36}
              className="w-full h-full"
              style={{ filter: 'var(--logo-filter, none)' }}
            />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex flex-col overflow-hidden"
              >
                <span className="font-display text-base font-semibold text-ink leading-tight tracking-tight whitespace-nowrap">
                  Love on the Plate
                </span>
                <span className="font-accent text-xs text-ink-secondary whitespace-nowrap">
                  Happy wife, happy life
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {/* Main nav items */}
        <SidebarLink
          href="/"
          active={isHome}
          collapsed={collapsed}
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
              <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 9h16" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8" cy="14" r="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 18l4-4 3 3 5-5 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          label="Gallery"
        />
        <SidebarLink
          href="/admin"
          active={isAdmin}
          collapsed={collapsed}
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          }
          label="Upload"
        />

        {/* View switcher section -- only on gallery */}
        {isHome && (
          <>
            <div className="pt-4 pb-2">
              {!collapsed && (
                <p className="px-3 text-micro text-ink-tertiary uppercase tracking-wider font-medium">
                  View
                </p>
              )}
              {collapsed && <div className="border-t border-stroke mx-2" />}
            </div>
            {galleryViews.map((view) => (
              <button
                key={view.id}
                onClick={() => setGalleryView(view.id)}
                className={cn(
                  'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium',
                  galleryView === view.id
                    ? 'text-love'
                    : 'text-ink-tertiary hover:text-ink hover:bg-canvas-recessed'
                )}
              >
                {galleryView === view.id && (
                  <motion.div
                    layoutId="sidebarViewIndicator"
                    className="absolute inset-0 bg-love-soft rounded-xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 shrink-0">{view.icon}</span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="relative z-10 whitespace-nowrap overflow-hidden"
                    >
                      {view.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-stroke space-y-2 shrink-0">
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between px-2')}>
          <ThemeToggle />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-tertiary hover:text-ink hover:bg-canvas-recessed transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-4 h-4"
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              aria-hidden="true"
            >
              <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          </button>
        </div>
        {!collapsed && (
          <p className="text-center font-accent text-sm text-ink-tertiary py-1">
            Made with love
          </p>
        )}
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  active,
  collapsed,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  collapsed: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium',
        active
          ? 'text-love'
          : 'text-ink-secondary hover:text-ink hover:bg-canvas-recessed'
      )}
    >
      {active && (
        <motion.div
          layoutId="sidebarNavIndicator"
          className="absolute inset-0 bg-love-soft rounded-xl"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10 shrink-0">{icon}</span>
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="relative z-10 whitespace-nowrap overflow-hidden"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
