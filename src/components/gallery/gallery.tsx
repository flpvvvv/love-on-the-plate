'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from 'framer-motion';
import { ViewSwitcher, PhotoCardSkeleton, FeedItemSkeleton, ResponsiveSheet, ScrollToTop } from '@/components/ui';
import { BottomNav, CollapsibleHeader } from '@/components/layout';
import { useGalleryContext, useSelectionContext } from '@/components/layout/app-shell';
import { usePullToRefresh, useKeyboardNav } from '@/lib/hooks';
import { PullToRefreshIndicator } from './pull-to-refresh-indicator';
import { PhotoModalContent } from './photo-modal';
import { MasonryGrid } from './views/masonry-grid';
import type { PhotoWithUrls, GalleryView, PaginatedPhotos } from '@/types';

// Dynamically import non-default views and analytics (only one view visible at a time)
const FloatingPlates = dynamic(() => import('./views/floating-plates').then(m => ({ default: m.FloatingPlates })));
const LoveTimeline = dynamic(() => import('./views/love-timeline').then(m => ({ default: m.LoveTimeline })));
const ImmersiveFeed = dynamic(() => import('./views/immersive-feed').then(m => ({ default: m.ImmersiveFeed })));
const AnalyticsContent = dynamic(() => import('@/components/analytics/analytics-content').then(m => ({ default: m.AnalyticsContent })));

// View order for directional transitions
const VIEW_ORDER: GalleryView[] = ['floating', 'masonry', 'timeline'];

function getViewTransition(from: GalleryView, to: GalleryView): { x: number; y: number } {
  const fromIndex = VIEW_ORDER.indexOf(from);
  const toIndex = VIEW_ORDER.indexOf(to);

  if (fromIndex === toIndex) return { x: 0, y: 0 };

  const isForward = toIndex > fromIndex;
  const isTimeline = to === 'timeline' || from === 'timeline';
  const isFloating = to === 'floating' || from === 'floating';

  if (isTimeline && isFloating) {
    return { x: isForward ? 20 : -20, y: isForward ? 20 : -20 };
  } else if (isTimeline) {
    return { x: 0, y: isForward ? 30 : -30 };
  } else {
    return { x: isForward ? 30 : -30, y: 0 };
  }
}

function getViewTransitionVariants(reducedMotion: boolean | null) {
  if (reducedMotion) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  return {
    initial: (transition: { x: number; y: number }) => ({
      opacity: 0,
      scale: 0.98,
      x: transition.x,
      y: transition.y,
    }),
    animate: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
      },
    },
    exit: (transition: { x: number; y: number }) => ({
      opacity: 0,
      scale: 0.98,
      x: -transition.x,
      y: -transition.y,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
      },
    }),
  };
}

// ---- Selection-aware wrapper (isolates re-renders from the grid) ----

const PhotoDetailSheet = memo(function PhotoDetailSheet() {
  const { selectedPhoto, setSelectedPhoto, handlePrevPhoto, handleNextPhoto, hasPrev, hasNext } =
    useSelectionContext();

  return (
    <ResponsiveSheet
      open={!!selectedPhoto}
      onClose={() => setSelectedPhoto(null)}
      onPrev={handlePrevPhoto}
      onNext={handleNextPhoto}
      hasPrev={hasPrev}
      hasNext={hasNext}
    >
      {selectedPhoto && (
        <PhotoModalContent
          photo={selectedPhoto}
          onPrev={handlePrevPhoto}
          onNext={handleNextPhoto}
          hasPrev={hasPrev}
          hasNext={hasNext}
        />
      )}
    </ResponsiveSheet>
  );
});

// ---- Main Gallery (only subscribes to gallery context, not selection) ----

export function Gallery() {
  const {
    isDesktop,
    mobileTab,
    setMobileTab,
    galleryView,
    setGalleryView,
    photos,
    setPhotos,
    handlePhotoClick,
    loading,
    setLoading,
    hasMore,
    setHasMore,
    cursor,
    setCursor,
    loadingMore,
    setLoadingMore,
    setRefreshPhotos,
  } = useGalleryContext();

  // Selection context is only used for keyboard nav (desktop) -- read it lazily
  const selection = useSelectionContext();

  const prefersReducedMotion = useReducedMotion();
  const [prevView, setPrevView] = useState<GalleryView>(galleryView);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isLoadingMoreRef = useRef(false);

  const handleViewChange = (newView: GalleryView) => {
    if (newView !== galleryView) {
      setPrevView(galleryView);
      setGalleryView(newView);
    }
  };

  // Fetch photos
  const fetchPhotos = useCallback(async (pageCursor?: string | null) => {
    try {
      const url = new URL('/api/photos', window.location.origin);
      if (pageCursor) {
        url.searchParams.set('cursor', pageCursor);
      }

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch photos');

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format');
      }

      const data: PaginatedPhotos = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching photos:', error);
      return null;
    }
  }, []);

  const refreshAll = useCallback(async () => {
    const data = await fetchPhotos();
    if (data) {
      setPhotos(data.photos);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    }
  }, [fetchPhotos, setPhotos, setCursor, setHasMore]);

  useEffect(() => {
    setRefreshPhotos(refreshAll);
  }, [refreshAll, setRefreshPhotos]);

  // Initial load
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      const data = await fetchPhotos();
      if (data) {
        setPhotos(data.photos);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
      setLoading(false);
    };

    loadInitial();
  }, [fetchPhotos, setPhotos, setCursor, setHasMore, setLoading]);

  // Load more — uses a synchronous ref guard to prevent concurrent fetches
  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMore || !cursor) return;

    isLoadingMoreRef.current = true;
    setLoadingMore(true);
    const data = await fetchPhotos(cursor);
    if (data) {
      setPhotos((prev: PhotoWithUrls[]) => [...prev, ...data.photos]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    }
    isLoadingMoreRef.current = false;
    setLoadingMore(false);
  }, [cursor, hasMore, fetchPhotos, setPhotos, setCursor, setHasMore, setLoadingMore]);

  // Keep a stable ref to the latest loadMore so the observer callback never goes stale
  const loadMoreFnRef = useRef(loadMore);
  useEffect(() => { loadMoreFnRef.current = loadMore; }, [loadMore]);

  // Callback ref — attaches the IntersectionObserver whenever the sentinel div
  // mounts (initial load, tab switch, etc.) and detaches when it unmounts.
  const loadMoreSentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadMoreFnRef.current();
          }
        },
        { threshold: 0.1 },
      );
      observerRef.current.observe(node);
    }
  }, []);

  // Clean up observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const transition = getViewTransition(prevView, galleryView);
  const viewVariants = getViewTransitionVariants(prefersReducedMotion);

  // Restore scroll position after returning from admin/upload
  useEffect(() => {
    try {
      const savedY = sessionStorage.getItem('lotp-v1:scroll-y');
      const savedTab = sessionStorage.getItem('lotp-v1:scroll-tab');
      if (savedY && savedTab) {
        sessionStorage.removeItem('lotp-v1:scroll-y');
        sessionStorage.removeItem('lotp-v1:scroll-tab');
        // Restore scroll after a short delay to let the content render
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.scrollTo(0, parseInt(savedY, 10));
          }, 100);
        });
      }
    } catch { /* sessionStorage may not be available */ }
  }, []);

  // Pull-to-refresh (mobile browse mode)
  const { containerRef: pullContainerRef, pullDistance, isRefreshing, progress } = usePullToRefresh({
    onRefresh: refreshAll,
  });

  // Keyboard navigation (desktop)
  useKeyboardNav({
    photos,
    selectedPhoto: selection.selectedPhoto,
    onSelect: (index) => handlePhotoClick(photos[index]),
    onClose: () => selection.setSelectedPhoto(null),
    onViewChange: handleViewChange,
    enabled: isDesktop,
  });

  const renderGalleryView = () => {
    switch (galleryView) {
      case 'floating':
        return <FloatingPlates photos={photos} onPhotoClick={handlePhotoClick} />;
      case 'masonry':
        return <MasonryGrid photos={photos} onPhotoClick={handlePhotoClick} />;
      case 'timeline':
        return <LoveTimeline photos={photos} onPhotoClick={handlePhotoClick} />;
      default:
        return <MasonryGrid photos={photos} onPhotoClick={handlePhotoClick} />;
    }
  };

  const renderBrowseGallery = () => {
    if (photos.length === 0 && !loading) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 text-love mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
              />
            </svg>
          </div>
          <h3 className="text-display font-display font-semibold text-ink mb-2">No photos yet</h3>
          <p className="text-ink-secondary">Start documenting your culinary journey!</p>
        </motion.div>
      );
    }

    return (
      <AnimatePresence mode="wait" custom={transition}>
        <motion.div
          key={galleryView}
          custom={transition}
          variants={viewVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <LayoutGroup>
            {renderGalleryView()}
          </LayoutGroup>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderSkeletons = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <PhotoCardSkeleton key={i} />
      ))}
    </div>
  );

  const loadMoreIndicator = (
    <>
      {hasMore && !loading && (
        <>
          {/* Invisible sentinel that triggers the IntersectionObserver */}
          <div ref={loadMoreSentinelRef} className="h-px" aria-hidden="true" />

          {/* Skeleton placeholders while fetching the next page */}
          <AnimatePresence>
            {loadingMore && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-3 sm:gap-4 sm:p-4 lg:grid-cols-4"
                role="status"
                aria-live="polite"
                aria-label="Loading more photos"
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <PhotoCardSkeleton key={`more-skeleton-${i}`} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );

  // --- DESKTOP LAYOUT ---
  if (isDesktop) {
    const isDesktopAnalytics = mobileTab === 'analytics';

    return (
      <div id="main-content" className="flex-1 overflow-y-auto min-h-0">
        {isDesktopAnalytics ? (
          <main className="container mx-auto px-6 py-8" role="region" aria-label="Analytics">
            <div className="max-w-6xl mx-auto space-y-8">
              <div>
                <h1 className="font-display text-display font-semibold text-ink">Analytics</h1>
                <p className="text-ink-secondary mt-1">A quick look at how the gallery is growing</p>
              </div>
              <AnalyticsContent />
            </div>
          </main>
        ) : (
          <main className="container mx-auto" role="region" aria-label="Photo gallery" aria-busy={loading}>
            {loading ? renderSkeletons() : renderBrowseGallery()}
            {loadMoreIndicator}
          </main>
        )}

        {/* Photo detail modal — renders as a centered overlay */}
        <PhotoDetailSheet />
      </div>
    );
  }

  // --- MOBILE LAYOUT ---
  return (
    <div id="main-content" className="min-h-screen pb-20">
      {/* Feed mode */}
      {mobileTab === 'feed' && (
        <>
          {loading ? <FeedItemSkeleton /> : (
            <ImmersiveFeed
              photos={photos}
              onPhotoTap={handlePhotoClick}
            />
          )}
        </>
      )}

      {/* Browse mode */}
      {mobileTab === 'browse' && (
        <div ref={pullContainerRef}>
          <CollapsibleHeader />

          <PullToRefreshIndicator
            pullDistance={pullDistance}
            progress={progress}
            isRefreshing={isRefreshing}
          />

          {/* View switcher -- top-14 to sit below the compact header (h-14) */}
          <div className="sticky top-14 z-30 glass border-b border-stroke py-2">
            <div className="flex justify-center px-4">
              <ViewSwitcher currentView={galleryView} onViewChange={handleViewChange} />
            </div>
          </div>

          <main className="container mx-auto" role="region" aria-label="Photo gallery" aria-busy={loading}>
            {loading ? renderSkeletons() : renderBrowseGallery()}
            {loadMoreIndicator}
          </main>

          {/* Scroll-to-top button */}
          <ScrollToTop />
        </div>
      )}

      {/* Analytics mode */}
      {mobileTab === 'analytics' && (
        <div>
          <CollapsibleHeader />

          <main className="container mx-auto px-4 py-6" role="region" aria-label="Analytics">
            <div className="max-w-6xl mx-auto space-y-6">
              <div>
                <h1 className="font-display text-display font-semibold text-ink">Analytics</h1>
                <p className="text-ink-secondary mt-1">A quick look at how the gallery is growing</p>
              </div>
              <AnalyticsContent />
            </div>
          </main>
        </div>
      )}

      {/* Mobile Photo Detail -- isolated in its own component so it doesn't re-render the grid */}
      <PhotoDetailSheet />

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={mobileTab}
        onTabChange={setMobileTab}
      />
    </div>
  );
}
