'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';

interface ImagePreviewProps {
  file: File;
  description: string;
  onDescriptionChange: (description: string) => void;
  onRegenerateDescription: () => void;
  onUpload: () => void;
  onCancel: () => void;
  uploading: boolean;
  regenerating: boolean;
}

export function ImagePreview({
  file,
  description,
  onDescriptionChange,
  onRegenerateDescription,
  onUpload,
  onCancel,
  uploading,
  regenerating,
}: ImagePreviewProps) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border rounded-2xl overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-black">
        {previewUrl && (
          <Image
            src={previewUrl}
            alt="Preview"
            fill
            className="object-contain"
            unoptimized // Use original blob URL
          />
        )}
      </div>

      {/* Description */}
      <div className="p-6 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="description" className="text-sm font-medium text-foreground">
              Description
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerateDescription}
              disabled={regenerating || uploading}
              loading={regenerating}
            >
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              Regenerate
            </Button>
          </div>
          <textarea
            id="description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="AI is generating a description..."
            rows={3}
            disabled={uploading}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-accent text-foreground placeholder:text-muted"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={uploading} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onUpload} loading={uploading} disabled={uploading} className="flex-1">
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
