'use client';

import Image from 'next/image';
import { Dialog, DialogClose } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import type { PhotoWithUrls } from '@/types';

interface PhotoModalProps {
  photo: PhotoWithUrls | null;
  open: boolean;
  onClose: () => void;
}

export function PhotoModal({ photo, open, onClose }: PhotoModalProps) {
  if (!photo) return null;

  return (
    <Dialog open={open} onClose={onClose} className="max-w-4xl w-full mx-4">
      <DialogClose onClose={onClose} />

      <div className="flex flex-col md:flex-row max-h-[85vh]">
        {/* Image */}
        <div className="relative flex-1 min-h-[300px] md:min-h-[500px] bg-black">
          <Image
            src={photo.imageUrl}
            alt={photo.description_en || photo.description_cn || 'A homemade meal'}
            fill
            sizes="(max-width: 768px) 100vw, 60vw"
            className="object-contain"
            priority
          />
        </div>

        {/* Details */}
        <div className="w-full md:w-80 p-6 bg-background overflow-y-auto">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-2">
                {formatDate(photo.created_at)}
              </p>

              {/* Chinese Description */}
              {photo.description_cn ? (
                <div className="mb-3">
                  <p className="text-foreground leading-relaxed">{photo.description_cn}</p>
                </div>
              ) : null}

              {/* English Description */}
              {photo.description_en ? (
                <div className="pt-3 border-t border-border">
                  <p className="text-foreground/80 leading-relaxed">{photo.description_en}</p>
                </div>
              ) : null}

              {/* No description fallback */}
              {!photo.description_en && !photo.description_cn && (
                <p className="text-muted italic">No description yet</p>
              )}
            </div>

            {photo.captured_at && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide mb-1">
                  Photo taken
                </p>
                <p className="text-sm text-foreground">
                  {formatDate(photo.captured_at)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
