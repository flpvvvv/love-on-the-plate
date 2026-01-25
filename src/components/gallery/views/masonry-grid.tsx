'use client';

import { PhotoCard } from '../photo-card';
import type { PhotoWithUrls } from '@/types';

interface MasonryGridProps {
  photos: PhotoWithUrls[];
  onPhotoClick: (photo: PhotoWithUrls) => void;
}

export function MasonryGrid({ photos, onPhotoClick }: MasonryGridProps) {
  // Split photos into columns for masonry effect (tablet/desktop only)
  const getColumnPhotos = (columnCount: number) => {
    const cols: PhotoWithUrls[][] = Array.from({ length: columnCount }, () => []);
    photos.forEach((photo, index) => {
      cols[index % columnCount].push(photo);
    });
    return cols;
  };

  const twoColumnPhotos = getColumnPhotos(2);
  const threeColumnPhotos = getColumnPhotos(3);

  return (
    <>
      {/* Mobile: Single column - maintains chronological order (newest to oldest) */}
      <div className="flex flex-col gap-4 p-4 sm:hidden">
        {photos.map((photo, index) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            onClick={() => onPhotoClick(photo)}
            priority={index === 0}
          />
        ))}
      </div>

      {/* Tablet: 2 columns masonry */}
      <div className="hidden sm:grid lg:hidden grid-cols-2 gap-4 p-4">
        {twoColumnPhotos.map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-4">
            {column.map((photo, photoIndex) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onClick={() => onPhotoClick(photo)}
                priority={colIndex === 0 && photoIndex === 0}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Desktop: 3 columns masonry */}
      <div className="hidden lg:grid grid-cols-3 gap-4 p-4">
        {threeColumnPhotos.map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-4">
            {column.map((photo, photoIndex) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onClick={() => onPhotoClick(photo)}
                priority={colIndex === 0 && photoIndex === 0}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
