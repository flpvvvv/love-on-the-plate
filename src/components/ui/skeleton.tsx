"use client"

import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("rounded-lg animate-shimmer", className)} />
}

export function PhotoCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-canvas-elevated border border-stroke">
      <Skeleton className="aspect-square w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

/** Full-viewport skeleton mimicking the ImmersiveFeed layout */
export function FeedItemSkeleton() {
  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full bg-canvas-recessed">
      {/* Full-bleed image placeholder */}
      <Skeleton className="absolute inset-0 rounded-none" />

      {/* Bottom text overlay skeleton */}
      <div className="absolute inset-x-0 bottom-0 p-5 space-y-3">
        <div className="bg-gradient-to-t from-black/40 via-black/20 to-transparent absolute inset-0 pointer-events-none" />
        <div className="relative space-y-3">
          <Skeleton className="h-7 w-48 rounded-md" />
          <Skeleton className="h-4 w-64 rounded-md" />
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}
