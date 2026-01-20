'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Header, Footer } from '@/components/layout';
import { UploadZone, ImagePreview } from '@/components/upload';
import { Button, Dialog, useToast } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { compressImage, formatFileSize, getBase64Size } from '@/lib/client-image-compression';
import type { PhotoWithUrls } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dishName, setDishName] = useState('');
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
  const [backfillStatus, setBackfillStatus] = useState<{ withDishName: number; withoutDishName: number; total: number } | null>(null);
  const [backfilling, setBackfilling] = useState(false);

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
    setDishName('');
    setDescriptionEn('');
    setDescriptionCn('');

    // Generate initial descriptions
    try {
      setRegenerating(true);

      // We'll generate descriptions during upload, just show preview for now
      setDishName('识别菜名中...');
      setDescriptionEn('Generating English description...');
      setDescriptionCn('正在生成中文描述...');

      // Compress image on client side before sending
      // Compress image for API - use smaller size to avoid request entity too large errors
      const compressedBase64 = await compressImage(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.7,
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

      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response from describe:', text.substring(0, 200));
        throw new Error('Server returned an invalid response. Image may be too large.');
      }

      if (response.ok) {
        const data = await response.json();
        setDishName(data.dishName || '');
        setDescriptionEn(data.descriptionEn || '');
        setDescriptionCn(data.descriptionCn || '');
      } else {
        const errorData = await response.json();
        console.error('Describe API error:', errorData);
        setDishName('');
        setDescriptionEn('');
        setDescriptionCn('');
      }
    } catch (error) {
      console.error('Preview generation error:', error);
      setDishName('');
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
      
      // Compress image before sending - use smaller size for API
      const compressedBase64 = await compressImage(selectedFile, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.7,
        format: 'image/jpeg',
      });

      const response = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: compressedBase64 }),
      });

      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response from describe:', text.substring(0, 200));
        throw new Error('Server returned an invalid response. Image may be too large.');
      }

      if (response.ok) {
        const data = await response.json();
        setDishName(data.dishName || '');
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
        (dishName && dishName !== photo.dish_name) ||
        (descriptionEn && descriptionEn !== photo.description_en) ||
        (descriptionCn && descriptionCn !== photo.description_cn);

      if (needsUpdate) {
        await fetch('/api/photos', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoId: photo.id,
            dishName,
            descriptionEn,
            descriptionCn,
          }),
        });
        photo.dish_name = dishName;
        photo.description_en = descriptionEn;
        photo.description_cn = descriptionCn;
      }

      // Add to recent photos
      setRecentPhotos((prev) => [photo, ...prev].slice(0, 5));

      // Reset form
      setSelectedFile(null);
      setDishName('');
      setDescriptionEn('');
      setDescriptionCn('');

      // Show success toast with heartbeat
      showToast('Photo uploaded with love!', 'success');
      
      // Redirect to main gallery after successful upload
      router.push('/');
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error instanceof Error ? error.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }, [selectedFile, dishName, descriptionEn, descriptionCn, router, showToast]);

  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    setDishName('');
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
      showToast('Photo deleted', 'info');
    } catch (error) {
      console.error('Delete error:', error);
      showToast(error instanceof Error ? error.message : 'Delete failed', 'error');
    } finally {
      setDeletingPhotoId(null);
    }
  }, [photoToDelete, showToast]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModalOpen(false);
    setPhotoToDelete(null);
  }, []);

  // Backfill handlers
  const fetchBackfillStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/backfill');
      if (response.ok) {
        const data = await response.json();
        setBackfillStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch backfill status:', error);
    }
  }, []);

  const handleBackfill = useCallback(async () => {
    try {
      setBackfilling(true);
      const response = await fetch('/api/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Backfill failed');
      }

      const result = await response.json();
      showToast(`Backfill complete: ${result.success} succeeded, ${result.failed} failed`, 'success');
      fetchBackfillStatus();
    } catch (error) {
      console.error('Backfill error:', error);
      showToast(error instanceof Error ? error.message : 'Backfill failed', 'error');
    } finally {
      setBackfilling(false);
    }
  }, [showToast, fetchBackfillStatus]);

  // Fetch backfill status when admin loads
  useEffect(() => {
    if (isAdmin) {
      fetchBackfillStatus();
    }
  }, [isAdmin, fetchBackfillStatus]);

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
              <Link href="/">
                <Button variant="secondary" className="w-full">
                  View Gallery
                </Button>
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
      <Header showAdminLink={false} onSignOut={handleLogout} userEmail={userEmail} />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Top bar with navigation and user info */}
          <div className="flex items-center mb-6">
            <Link href="/">
              <Button variant="secondary" size="sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                View Gallery
              </Button>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-serif text-3xl font-semibold text-foreground">Upload Photo</h1>
            <p className="text-muted mt-1">Share your culinary creations</p>
          </div>

          {/* Upload Area */}
          {selectedFile ? (
            <ImagePreview
              file={selectedFile}
              dishName={dishName}
              descriptionEn={descriptionEn}
              descriptionCn={descriptionCn}
              onDishNameChange={setDishName}
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

          {/* Backfill Section */}
          {backfillStatus && backfillStatus.withoutDishName > 0 && (
            <div className="mt-12 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <h2 className="font-serif text-xl font-semibold text-foreground mb-2">
                Backfill Missing Data
              </h2>
              <p className="text-muted mb-4">
                {backfillStatus.withoutDishName} photo{backfillStatus.withoutDishName > 1 ? 's' : ''} missing dish name or descriptions
                (out of {backfillStatus.total} total).
              </p>
              <Button 
                onClick={handleBackfill} 
                loading={backfilling}
                disabled={backfilling}
              >
                {backfilling ? 'Generating with AI...' : 'Generate Missing Data with AI'}
              </Button>
              {backfilling && (
                <p className="text-sm text-muted mt-2">
                  This may take a while. Please don&apos;t close this page.
                </p>
              )}
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
