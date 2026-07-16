"use client"

import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & {
  className?: string
}

export function PlatesIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function GridIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <rect x="3" y="3" width="7" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="3" width="7" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="11" width="7" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function TimelineIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
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
  )
}

export function GalleryIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <path
        d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M4 9h16" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="14" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 18l4-4 3 3 5-5 4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function UploadIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function AnalyticsIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <path d="M4 19h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="6" y="11" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="8" width="3" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="16" y="5" width="3" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function ChevronLeftIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <path
        d="M15 19l-7-7 7-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ChevronRightIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <path
        d="M9 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CloseIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <path
        d="M6 18L18 6M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SearchIcon({ className = "w-5 h-5", ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        stroke="currentColor"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  )
}
