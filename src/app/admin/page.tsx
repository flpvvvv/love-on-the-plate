'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Header, Footer } from '@/components/layout';
import { UploadZone, ImagePreview } from '@/components/upload';
import { Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { compressImage, formatFileSize, getBase64Size } from '@/lib/client-image-compression';
import type { PhotoWithUrls } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionCn, setDescriptionCn] = useState('');
  const [uploading, setUploading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [recentPhotos, setRecentPhotos] = useState<PhotoWithUrls[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = loading
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    async function checkAdminStatus() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/admin/login');
        return;
      }

      setUserEmail(user.email || null);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setIsAdmin(profile?.role === 'admin');
    }

    checkAdminStatus();
  }, [router]);

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

      // Compress image on client side before sending
      const compressedBase64 = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        format: 'image/jpeg',
      });

      const originalSize = formatFileSize(file.size);
      const compressedSize = formatFileSize(getBase64Size(compressedBase64));
      console.log(`Image compressed: ${originalSize} → ${compressedSize}`);

      // Call describe endpoint with compressed base64 image
      const response = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: compressedBase64 }),
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
      
      // Compress image before sending
      const compressedBase64 = await compressImage(selectedFile, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        format: 'image/jpeg',
      });

      const response = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: compressedBase64 }),
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

  // Loading state
  if (isAdmin === null) {
    return (
      <>
        <Header showAdminLink={false} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="animate-pulse">
              <div className="h-8 bg-surface rounded w-48 mx-auto mb-4"></div>
              <div className="h-4 bg-surface rounded w-64 mx-auto"></div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Pending approval state for non-admin users
  if (!isAdmin) {
    return (
      <>
        <Header showAdminLink={false} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center py-16">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="font-serif text-2xl font-semibold text-foreground mb-2">Pending Approval</h1>
              <p className="text-muted">
                Your account is awaiting admin approval before you can upload images.
              </p>
              {userEmail && (
                <p className="text-sm text-muted mt-2">
                  Signed in as <span className="font-medium text-foreground">{userEmail}</span>
                </p>
              )}
            </div>
            <div className="space-y-3">
              <Button variant="ghost" onClick={handleLogout} className="w-full">
                Sign Out
              </Button>
              <Link href="/" className="block text-accent hover:text-accent-hover transition-colors">
                View Gallery
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

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
