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
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionCn, setDescriptionCn] = useState('');
  const [uploading, setUploading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [recentPhotos, setRecentPhotos] = useState<PhotoWithUrls[]>([]);

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setDescriptionEn('');
    setDescriptionCn('');

    // Generate initial descriptions
    try {
      setRegenerating(true);

      // We'll generate descriptions during upload, just show preview for now
      setDescriptionEn('Generating English description...');
      setDescriptionCn('正在生成中文描述...');

      // Create a temporary preview - descriptions will be generated on upload
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
        setDescriptionEn(data.descriptionEn || '');
        setDescriptionCn(data.descriptionCn || '');
      } else {
        setDescriptionEn('');
        setDescriptionCn('');
      }
    } catch (error) {
      console.error('Preview generation error:', error);
      setDescriptionEn('');
      setDescriptionCn('');
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
        setDescriptionEn(data.descriptionEn || '');
        setDescriptionCn(data.descriptionCn || '');
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

      // If user edited descriptions, update them
      const needsUpdate =
        (descriptionEn && descriptionEn !== photo.description_en) ||
        (descriptionCn && descriptionCn !== photo.description_cn);

      if (needsUpdate) {
        await fetch('/api/photos', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoId: photo.id,
            descriptionEn,
            descriptionCn,
          }),
        });
        photo.description_en = descriptionEn;
        photo.description_cn = descriptionCn;
      }

      // Add to recent photos
      setRecentPhotos((prev) => [photo, ...prev].slice(0, 5));

      // Reset form
      setSelectedFile(null);
      setDescriptionEn('');
      setDescriptionCn('');
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [selectedFile, descriptionEn, descriptionCn]);

  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    setDescriptionEn('');
    setDescriptionCn('');
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
              descriptionEn={descriptionEn}
              descriptionCn={descriptionCn}
              onDescriptionEnChange={setDescriptionEn}
              onDescriptionCnChange={setDescriptionCn}
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
                      alt={photo.description_en || photo.description_cn || 'Recent upload'}
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
