'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg animate-shimmer',
        className
      )}
    />
  );
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
  );
}
