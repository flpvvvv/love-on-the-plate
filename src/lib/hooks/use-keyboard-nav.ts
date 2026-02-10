'use client';

import { useEffect, useCallback } from 'react';
import type { GalleryView } from '@/types';

interface UseKeyboardNavOptions {
  photos: { id: string }[];
  selectedPhoto: { id: string } | null;
  onSelect: (index: number) => void;
  onClose: () => void;
  onViewChange: (view: GalleryView) => void;
  enabled?: boolean;
}

const VIEW_KEYS: Record<string, GalleryView> = {
  '1': 'floating',
  '2': 'masonry',
  '3': 'timeline',
};

export function useKeyboardNav({
  photos,
  selectedPhoto,
  onSelect,
  onClose,
  onViewChange,
  enabled = true,
}: UseKeyboardNavOptions) {
  const selectedIndex = selectedPhoto
    ? photos.findIndex(p => p.id === selectedPhoto.id)
    : -1;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture when typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // View switching: 1, 2, 3
      if (VIEW_KEYS[e.key]) {
        e.preventDefault();
        onViewChange(VIEW_KEYS[e.key]);
        return;
      }

      // Photo navigation: j/k or arrow keys
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedIndex < photos.length - 1) {
          onSelect(selectedIndex + 1);
        } else if (selectedIndex === -1 && photos.length > 0) {
          onSelect(0);
        }
        return;
      }

      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedIndex > 0) {
          onSelect(selectedIndex - 1);
        }
        return;
      }

      // Open detail: Enter
      if (e.key === 'Enter' && selectedIndex === -1 && photos.length > 0) {
        e.preventDefault();
        onSelect(0);
        return;
      }

      // Close: Escape
      if (e.key === 'Escape' && selectedPhoto) {
        e.preventDefault();
        onClose();
        return;
      }

      // Left/Right for prev/next when detail is open
      if (selectedPhoto) {
        if (e.key === 'ArrowLeft' && selectedIndex > 0) {
          e.preventDefault();
          onSelect(selectedIndex - 1);
        } else if (e.key === 'ArrowRight' && selectedIndex < photos.length - 1) {
          e.preventDefault();
          onSelect(selectedIndex + 1);
        }
      }
    },
    [photos, selectedPhoto, selectedIndex, onSelect, onClose, onViewChange]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}
