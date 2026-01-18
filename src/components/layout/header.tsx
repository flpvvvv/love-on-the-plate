'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle, Button } from '@/components/ui';

interface HeaderProps {
  showAdminLink?: boolean;
  onSignOut?: () => void;
  userEmail?: string | null;
}

export function Header({ showAdminLink = true, onSignOut, userEmail }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-stroke glass">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 text-ink transition-transform duration-300 ease-spring group-hover:scale-110">
            <Image
              src="/logo.svg"
              alt="Love on the Plate"
              width={40}
              height={40}
              className="w-full h-full"
              style={{ filter: 'var(--logo-filter, none)' }}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl font-semibold text-ink leading-tight tracking-tight">
              Love on the Plate
            </span>
            <span className="font-accent text-sm text-ink-secondary hidden sm:block">
              Happy wife, happy life
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop upload button - hidden on mobile (use bottom nav) */}
          {showAdminLink && (
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-love text-white text-sm font-medium rounded-xl hover:bg-love-intense transition-colors shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Upload</span>
            </Link>
          )}

          {onSignOut && (
            <div className="flex items-center gap-2">
              {userEmail && (
                <span className="text-caption text-ink-secondary max-w-[10rem] truncate hidden sm:inline">
                  {userEmail}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={onSignOut}>
                Sign Out
              </Button>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
