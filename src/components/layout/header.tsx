"use client"

import Image from "next/image"
import Link from "next/link"
import { Button, ThemeToggle } from "@/components/ui"

interface HeaderProps {
  showAdminLink?: boolean
  onSignOut?: () => void
  userEmail?: string | null
}

export function Header({ showAdminLink = true, onSignOut, userEmail }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-canvas border-b-[2.5px] border-ink">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 min-w-0 min-h-11 focus-ring">
          <span className="brand-mark">
            <Image src="/logo.svg" alt="Love on the Plate" width={22} height={22} />
          </span>
          <span className="flex flex-col min-w-0 overflow-hidden">
            <span className="brand-name whitespace-nowrap">Love on the Plate</span>
            <span className="brand-sub whitespace-nowrap hidden sm:block">
              Happy wife, happy life
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Desktop upload button - hidden on mobile (use bottom nav) */}
          {showAdminLink && (
            <Link href="/admin" className="btn btn-fill hidden sm:inline-flex">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="square" strokeLinejoin="miter" d="M12 4.5v15m7.5-7.5h-15" />
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
  )
}
