"use client"

import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("skel", className)} />
}

export function PhotoCardSkeleton() {
  return (
    <div className="skel">
      <div className="sk-art" />
      <div className="sk-line" />
      <div className="sk-line short" />
    </div>
  )
}

/** Full-viewport skeleton mimicking the ImmersiveFeed layout */
export function FeedItemSkeleton() {
  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full">
      {/* Full-bleed image placeholder */}
      <div className="skel h-full">
        <div className="sk-art h-full" />
      </div>

      {/* Bottom text overlay skeleton */}
      <div className="skel border-x-0 border-b-0 absolute inset-x-0 bottom-0 p-5">
        <div className="sk-line" />
        <div className="sk-line short" />
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="sk-line w-20" />
          <div className="sk-line w-16" />
        </div>
      </div>
    </div>
  )
}
