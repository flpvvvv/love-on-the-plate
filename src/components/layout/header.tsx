'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ui';

interface HeaderProps {
  showAdminLink?: boolean;
}

export function Header({ showAdminLink = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 text-accent transition-transform group-hover:scale-105">
            <Image
              src="/logo.svg"
              alt="Love on the Plate"
              width={40}
              height={40}
              className="w-full h-full"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-xl font-semibold text-foreground leading-tight">
              Love on the Plate
            </span>
            <span className="font-script text-sm text-muted hidden sm:block">
              Happy wife, happy life
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {showAdminLink && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Upload</span>
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
