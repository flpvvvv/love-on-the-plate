'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Header, Footer } from '@/components/layout';
import { UploadZone, ImagePreview } from '@/components/upload';
import { Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import type { PhotoWithUrls } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [recentPhotos, setRecentPhotos] = useState<PhotoWithUrls[]>([]);

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setDescription('');

    // Generate initial description
    try {
      setRegenerating(true);
      const formData = new FormData();
      formData.append('file', file);

      // We'll generate description during upload, just show preview for now
      setDescription('Generating description...');

      // Create a temporary preview - description will be generated on upload
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      // Call describe endpoint with base64 image (this is a preview generation)
      const response = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (response.ok) {
        const data = await response.json();
        setDescription(data.description || '');
      } else {
        setDescription('');
      }
    } catch (error) {
      console.error('Preview generation error:', error);
      setDescription('');
    } finally {
      setRegenerating(false);
    }
  }, []);

  const handleRegenerateDescription = useCallback(async () => {
    if (!selectedFile) return;

    try {
      setRegenerating(true);
      const arrayBuffer = await selectedFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      const response = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (response.ok) {
        const data = await response.json();
        setDescription(data.description || '');
      }
    } catch (error) {
      console.error('Regenerate error:', error);
    } finally {
      setRegenerating(false);
    }
  }, [selectedFile]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const photo: PhotoWithUrls = await response.json();

      // If user edited description, update it
      if (description && description !== photo.description) {
        await fetch('/api/photos', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoId: photo.id, description }),
        });
        photo.description = description;
      }

      // Add to recent photos
      setRecentPhotos((prev) => [photo, ...prev].slice(0, 5));

      // Reset form
      setSelectedFile(null);
      setDescription('');
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [selectedFile, description]);

  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    setDescription('');
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <>
      <Header showAdminLink={false} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-3xl font-semibold text-foreground">Upload Photo</h1>
              <p className="text-muted mt-1">Share your culinary creations</p>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>

          {/* Upload Area */}
          {selectedFile ? (
            <ImagePreview
              file={selectedFile}
              description={description}
              onDescriptionChange={setDescription}
              onRegenerateDescription={handleRegenerateDescription}
              onUpload={handleUpload}
              onCancel={handleCancel}
              uploading={uploading}
              regenerating={regenerating}
            />
          ) : (
            <UploadZone onFileSelect={handleFileSelect} disabled={uploading} />
          )}

          {/* Recent Uploads */}
          {recentPhotos.length > 0 && (
            <div className="mt-12">
              <h2 className="font-serif text-xl font-semibold text-foreground mb-4">
                Recently Uploaded
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {recentPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square relative rounded-xl overflow-hidden bg-surface border border-border"
                  >
                    <Image
                      src={photo.thumbnailUrl}
                      alt={photo.description || 'Recent upload'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 33vw, 200px"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link back to gallery */}
          <div className="mt-8 text-center">
            <Link href="/" className="text-accent hover:text-accent-hover transition-colors">
              View Gallery
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
