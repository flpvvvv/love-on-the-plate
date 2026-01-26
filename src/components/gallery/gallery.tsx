'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ViewSwitcher, PhotoCardSkeleton } from '@/components/ui';
import { BottomNav } from '@/components/layout';
import { PhotoModal } from './photo-modal';
import { FloatingPlates, MasonryGrid, LoveTimeline } from './views';
import type { PhotoWithUrls, GalleryView, PaginatedPhotos } from '@/types';

const VIEW_STORAGE_KEY = 'love-on-the-plate-view';

// View order for directional transitions
const VIEW_ORDER: GalleryView[] = ['floating', 'masonry', 'timeline'];

// Get directional offset for view transitions
function getViewTransition(from: GalleryView, to: GalleryView): { x: number; y: number } {
  const fromIndex = VIEW_ORDER.indexOf(from);
  const toIndex = VIEW_ORDER.indexOf(to);
  
  if (fromIndex === toIndex) return { x: 0, y: 0 };
  
  // floating -> masonry: horizontal right
  // masonry -> floating: horizontal left
  // masonry -> timeline: vertical down
  // timeline -> masonry: vertical up
  // floating -> timeline: diagonal (right + down)
  // timeline -> floating: diagonal (left + up)
  
  const isForward = toIndex > fromIndex;
  const isTimeline = to === 'timeline' || from === 'timeline';
  const isFloating = to === 'floating' || from === 'floating';
  
  if (isTimeline && isFloating) {
    // Diagonal transition
    return { x: isForward ? 20 : -20, y: isForward ? 20 : -20 };
  } else if (isTimeline) {
    // Vertical transition (masonry <-> timeline)
    return { x: 0, y: isForward ? 30 : -30 };
  } else {
    // Horizontal transition (floating <-> masonry)
    return { x: isForward ? 30 : -30, y: 0 };
  }
}

// View transition variants
const viewTransitionVariants = {
  initial: (transition: { x: number; y: number }) => ({
    opacity: 0,
    scale: 0.98,
    x: transition.x,
    y: transition.y,
    filter: 'blur(4px)',
  }),
  animate: {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
  exit: (transition: { x: number; y: number }) => ({
    opacity: 0,
    scale: 0.98,
    x: -transition.x,
    y: -transition.y,
    filter: 'blur(4px)',
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  }),
};

export function Gallery() {
  const [photos, setPhotos] = useState<PhotoWithUrls[]>([]);
  const [view, setView] = useState<GalleryView>('floating');
  const [prevView, setPrevView] = useState<GalleryView>('floating');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithUrls | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load view preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem(VIEW_STORAGE_KEY) as GalleryView | null;
    if (savedView && ['floating', 'masonry', 'timeline'].includes(savedView)) {
      setView(savedView);
    }
  }, []);

  // Save view preference
  const handleViewChange = (newView: GalleryView) => {
    if (newView !== view) {
      setPrevView(view);
      setView(newView);
      localStorage.setItem(VIEW_STORAGE_KEY, newView);
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

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 100));
        throw new Error('Invalid response format');
      }

      const data: PaginatedPhotos = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching photos:', error);
      return null;
    }
  }, []);

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
  }, [fetchPhotos]);

  // Load more photos
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;

    setLoadingMore(true);
    const data = await fetchPhotos(cursor);
    if (data) {
      setPhotos((prev) => [...prev, ...data.photos]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    }
    setLoadingMore(false);
  }, [cursor, hasMore, loadingMore, fetchPhotos]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loadMore]);

  const handlePhotoClick = (photo: PhotoWithUrls) => {
    setSelectedPhoto(photo);
  };

  // Navigation handlers for modal
  const selectedIndex = selectedPhoto 
    ? photos.findIndex(p => p.id === selectedPhoto.id) 
    : -1;
  
  const handlePrevPhoto = useCallback(() => {
    if (selectedIndex > 0) {
      setSelectedPhoto(photos[selectedIndex - 1]);
    }
  }, [selectedIndex, photos]);

  const handleNextPhoto = useCallback(() => {
    if (selectedIndex < photos.length - 1) {
      setSelectedPhoto(photos[selectedIndex + 1]);
    }
  }, [selectedIndex, photos]);

  const transition = getViewTransition(prevView, view);

  const renderGallery = () => {
    if (photos.length === 0 && !loading) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 text-love mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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

    const GalleryComponent = () => {
      switch (view) {
        case 'floating':
          return <FloatingPlates photos={photos} onPhotoClick={handlePhotoClick} />;
        case 'masonry':
          return <MasonryGrid photos={photos} onPhotoClick={handlePhotoClick} />;
        case 'timeline':
          return <LoveTimeline photos={photos} onPhotoClick={handlePhotoClick} />;
        default:
          return <FloatingPlates photos={photos} onPhotoClick={handlePhotoClick} />;
      }
    };

    return (
      <AnimatePresence mode="wait" custom={transition}>
        <motion.div
          key={view}
          custom={transition}
          variants={viewTransitionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <LayoutGroup>
            <GalleryComponent />
          </LayoutGroup>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderSkeletons = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <PhotoCardSkeleton key={i} />
        ))}
      </div>
    );
  };

  return (
    <div id="main-content" className="min-h-screen pb-20 md:pb-0">
      {/* View Switcher - Desktop only */}
      <div className="sticky top-16 z-30 glass border-b border-stroke py-3 hidden md:block">
        <div className="container mx-auto px-4 flex justify-center">
          <ViewSwitcher currentView={view} onViewChange={handleViewChange} />
        </div>
      </div>

      {/* Gallery Content */}
      <main className="container mx-auto">
        {loading ? renderSkeletons() : renderGallery()}

        {/* Load More Trigger */}
        {hasMore && !loading && (
          <div ref={loadMoreRef} className="py-8 flex justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-ink-secondary">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Loading more...</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Photo Modal */}
      <PhotoModal
        photo={selectedPhoto}
        open={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        onPrev={handlePrevPhoto}
        onNext={handleNextPhoto}
        hasPrev={selectedIndex > 0}
        hasNext={selectedIndex < photos.length - 1}
        prevPhotoUrl={selectedIndex > 0 ? photos[selectedIndex - 1]?.imageUrl : undefined}
        nextPhotoUrl={selectedIndex < photos.length - 1 ? photos[selectedIndex + 1]?.imageUrl : undefined}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentView={view}
        onViewChange={handleViewChange}
        showViewSwitcher={true}
      />
    </div>
  );
}
