'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Header, Footer } from '@/components/layout';
import { UploadZone, ImagePreview } from '@/components/upload';
import { Button, Dialog } from '@/components/ui';
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
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<PhotoWithUrls | null>(null);

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

      // Fetch recent photos if user is admin
      if (profile?.role === 'admin') {
        const { data } = await supabase
          .from('photos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6);

        if (data) {
          const photosWithUrls: PhotoWithUrls[] = data.map((photo) => {
            const { data: fullUrlData } = supabase.storage
              .from('photos')
              .getPublicUrl(photo.storage_path);
            const { data: thumbUrlData } = supabase.storage
              .from('photos')
              .getPublicUrl(photo.thumbnail_path);

            return {
              ...photo,
              imageUrl: fullUrlData.publicUrl,
              thumbnailUrl: thumbUrlData.publicUrl,
            };
          });
          setRecentPhotos(photosWithUrls);
        }
      }
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
      
      // Redirect to main gallery after successful upload
      router.push('/');
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [selectedFile, descriptionEn, descriptionCn, router]);

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

  const handleDeleteClick = useCallback((photo: PhotoWithUrls) => {
    setPhotoToDelete(photo);
    setDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!photoToDelete) return;

    try {
      setDeletingPhotoId(photoToDelete.id);
      
      const response = await fetch(`/api/photos?id=${photoToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      // Remove from recent photos list
      setRecentPhotos((prev) => prev.filter((photo) => photo.id !== photoToDelete.id));
      setDeleteModalOpen(false);
      setPhotoToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setDeletingPhotoId(null);
    }
  }, [photoToDelete]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModalOpen(false);
    setPhotoToDelete(null);
  }, []);

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
          {/* Link to gallery at top */}
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-accent hover:text-accent-hover transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              View Gallery
            </Link>
          </div>

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
                    className="aspect-square relative rounded-xl overflow-hidden bg-surface border border-border group"
                  >
                    <Image
                      src={photo.thumbnailUrl}
                      alt={photo.description_en || photo.description_cn || 'Recent upload'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 33vw, 200px"
                    />
                    {/* Delete button overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <button
                        onClick={() => handleDeleteClick(photo)}
                        disabled={deletingPhotoId === photo.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete photo"
                      >
                        {deletingPhotoId === photo.id ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onClose={handleDeleteCancel} className="max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground text-center mb-2">Delete Photo</h3>
          <p className="text-muted text-center mb-6">
            Are you sure you want to delete this photo? This action cannot be undone.
          </p>
          {photoToDelete && (
            <div className="mb-6 rounded-lg overflow-hidden border border-border">
              <div className="aspect-video relative">
                <Image
                  src={photoToDelete.thumbnailUrl}
                  alt={photoToDelete.description_cn || photoToDelete.description_en || 'Photo to delete'}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={handleDeleteCancel} className="flex-1">
              Cancel
            </Button>
            <button
              onClick={handleDeleteConfirm}
              disabled={deletingPhotoId !== null}
              className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deletingPhotoId ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Dialog>

      <Footer />
    </>
  );
}
