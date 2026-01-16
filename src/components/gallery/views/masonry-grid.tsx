'use client';

import { PhotoCard } from '../photo-card';
import type { PhotoWithUrls } from '@/types';

interface MasonryGridProps {
  photos: PhotoWithUrls[];
  onPhotoClick: (photo: PhotoWithUrls) => void;
}

export function MasonryGrid({ photos, onPhotoClick }: MasonryGridProps) {
  // Split photos into columns for masonry effect
  const columns = 3;
  const columnPhotos: PhotoWithUrls[][] = Array.from({ length: columns }, () => []);

  photos.forEach((photo, index) => {
    columnPhotos[index % columns].push(photo);
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {columnPhotos.map((column, colIndex) => (
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
  );
}
