"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Footer, Header } from "@/components/layout"
import { Button, Dialog, Skeleton, useToast } from "@/components/ui"
import { ImagePreview, UploadZone } from "@/components/upload"
import { extractTakenAt } from "@/lib/client-exif"
import {
  base64ToBlob,
  COMPRESSION_PRESETS,
  compressImage,
  formatFileSize,
  getBase64Size,
} from "@/lib/client-image-compression"
import { createClient } from "@/lib/supabase/client"
import type { PhotoWithUrls } from "@/types"

function getTodayDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function AdminPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [takenDate, setTakenDate] = useState<string | null>(null)
  const [compressedForUpload, setCompressedForUpload] = useState<string | null>(null)
  const [dishName, setDishName] = useState("")
  const [descriptionEn, setDescriptionEn] = useState("")
  const [descriptionCn, setDescriptionCn] = useState("")
  const [ingredients, setIngredients] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regeneratingDescOnly, setRegeneratingDescOnly] = useState(false)
  const [recentPhotos, setRecentPhotos] = useState<PhotoWithUrls[]>([])
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null) // null = loading
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [photoToDelete, setPhotoToDelete] = useState<PhotoWithUrls | null>(null)
  const [backfillStatus, setBackfillStatus] = useState<{
    withDishName: number
    withoutDishName: number
    withoutIngredients: number
    total: number
  } | null>(null)
  const [backfilling, setBackfilling] = useState(false)

  // Check if user is admin
  useEffect(() => {
    async function checkAdminStatus() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/admin/login")
        return
      }

      setUserEmail(user.email || null)

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      setIsAdmin(profile?.role === "admin")

      // Fetch recent photos if user is admin
      if (profile?.role === "admin") {
        const { data } = await supabase
          .from("photos")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6)

        if (data) {
          const photosWithUrls: PhotoWithUrls[] = data.map((photo) => {
            const { data: fullUrlData } = supabase.storage
              .from("photos")
              .getPublicUrl(photo.storage_path)
            const { data: thumbUrlData } = supabase.storage
              .from("photos")
              .getPublicUrl(photo.thumbnail_path)

            return {
              ...photo,
              imageUrl: fullUrlData.publicUrl,
              thumbnailUrl: thumbUrlData.publicUrl,
            }
          })
          setRecentPhotos(photosWithUrls)
        }
      }
    }

    checkAdminStatus()
  }, [router])

  const handleFileSelect = useCallback(
    async (file: File) => {
      setSelectedFile(file)
      setCompressedForUpload(null)
      setDishName("")
      setDescriptionEn("")
      setDescriptionCn("")
      setIngredients([])

      // Extract EXIF capture date from the original file before compression strips it.
      // If no EXIF date is found, default to today — user can adjust via the date picker.
      try {
        const exifDate = await extractTakenAt(file)
        const dateValue = exifDate ?? getTodayDate()
        setTakenDate(dateValue)
        if (process.env.NODE_ENV === "development") {
          console.log(`Taken date: ${dateValue}${exifDate ? " (from EXIF)" : " (default: today)"}`)
        }
      } catch (exifError) {
        console.error("EXIF extraction error:", exifError)
        setTakenDate(getTodayDate())
      }

      // Generate initial descriptions
      try {
        setRegenerating(true)

        // We'll generate descriptions during upload, just show preview for now
        setDishName("识别菜名中…")
        setDescriptionEn("Generating English description…")
        setDescriptionCn("正在生成中文描述…")

        // Compress for upload (1920px - higher quality for storage)
        const uploadBase64 = await compressImage(file, COMPRESSION_PRESETS.upload)
        setCompressedForUpload(uploadBase64)

        // Compress for AI (1280px - smaller/faster for description)
        const aiBase64 = await compressImage(file, COMPRESSION_PRESETS.ai)

        const originalSize = formatFileSize(file.size)
        const uploadSize = formatFileSize(getBase64Size(uploadBase64))
        const aiSize = formatFileSize(getBase64Size(aiBase64))
        // Compression stats (dev only)
        if (process.env.NODE_ENV === "development") {
          console.log(`Image compressed: ${originalSize} → upload: ${uploadSize}, AI: ${aiSize}`)
        }

        // Call describe endpoint with AI-compressed base64 image (smaller/faster)
        const response = await fetch("/api/describe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: aiBase64 }),
        })

        // Check content type before parsing JSON
        const contentType = response.headers.get("content-type")
        if (!contentType?.includes("application/json")) {
          const text = await response.text()
          console.error("Non-JSON response from describe:", text.substring(0, 200))
          throw new Error("Server returned an invalid response. Please try again.")
        }

        if (response.ok) {
          const data = await response.json()
          setDishName(data.dishName || "")
          setDescriptionEn(data.descriptionEn || "")
          setDescriptionCn(data.descriptionCn || "")
          setIngredients(Array.isArray(data.ingredients) ? data.ingredients : [])
        } else {
          const errorData = await response.json()
          console.error("Describe API error:", errorData)

          // Show user-friendly error message
          const errorMessage = errorData.error || "Failed to generate description"

          // Special handling for rate limit
          if (errorData.code === "RATE_LIMIT") {
            showToast(errorMessage, "error")
          } else if (errorData.isRetryable) {
            showToast(`${errorMessage} Try again in a moment.`, "error")
          } else {
            showToast(errorMessage, "error")
          }

          setDishName("")
          setDescriptionEn("")
          setDescriptionCn("")
          setIngredients([])
        }
      } catch (error) {
        console.error("Preview generation error:", error)
        const errorMessage = error instanceof Error ? error.message : "Failed to process image"
        showToast(errorMessage, "error")
        setDishName("")
        setDescriptionEn("")
        setDescriptionCn("")
        setIngredients([])
      } finally {
        setRegenerating(false)
      }
    },
    [showToast]
  )

  const handleRegenerateDescription = useCallback(async () => {
    if (!selectedFile) return

    try {
      setRegenerating(true)

      // Compress image before sending - use smaller size for API
      const compressedBase64 = await compressImage(selectedFile, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8,
        format: "image/jpeg",
      })

      const response = await fetch("/api/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: compressedBase64 }),
      })

      // Check content type before parsing JSON
      const contentType = response.headers.get("content-type")
      if (!contentType?.includes("application/json")) {
        const text = await response.text()
        console.error("Non-JSON response from describe:", text.substring(0, 200))
        throw new Error("Server returned an invalid response. Please try again.")
      }

      if (response.ok) {
        const data = await response.json()
        setDishName(data.dishName || "")
        setDescriptionEn(data.descriptionEn || "")
        setDescriptionCn(data.descriptionCn || "")
        setIngredients(Array.isArray(data.ingredients) ? data.ingredients : [])
        showToast("Descriptions regenerated!", "success")
      } else {
        const errorData = await response.json()
        console.error("Regenerate API error:", errorData)
        const errorMessage = errorData.error || "Failed to regenerate description"
        showToast(errorMessage, "error")
      }
    } catch (error) {
      console.error("Regenerate error:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Failed to regenerate description"
      showToast(errorMessage, "error")
    } finally {
      setRegenerating(false)
    }
  }, [selectedFile, showToast])

  const handleRegenerateDescriptionsOnly = useCallback(async () => {
    if (!selectedFile || !dishName.trim()) return

    try {
      setRegeneratingDescOnly(true)

      // Compress image for AI analysis
      const aiBase64 = await compressImage(selectedFile, COMPRESSION_PRESETS.ai)

      const response = await fetch("/api/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: aiBase64, dishName: dishName.trim() }),
      })

      const contentType = response.headers.get("content-type")
      if (!contentType?.includes("application/json")) {
        const text = await response.text()
        console.error("Non-JSON response from describe:", text.substring(0, 200))
        throw new Error("Server returned an invalid response. Please try again.")
      }

      if (response.ok) {
        const data = await response.json()
        // Keep the user's dish name, only update descriptions and ingredients
        setDescriptionEn(data.descriptionEn || "")
        setDescriptionCn(data.descriptionCn || "")
        setIngredients(Array.isArray(data.ingredients) ? data.ingredients : [])
        showToast(`Descriptions regenerated for "${dishName.trim()}"!`, "success")
      } else {
        const errorData = await response.json()
        console.error("Regenerate descriptions API error:", errorData)
        const errorMessage = errorData.error || "Failed to regenerate descriptions"
        showToast(errorMessage, "error")
      }
    } catch (error) {
      console.error("Regenerate descriptions error:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Failed to regenerate descriptions"
      showToast(errorMessage, "error")
    } finally {
      setRegeneratingDescOnly(false)
    }
  }, [selectedFile, dishName, showToast])

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !compressedForUpload) return

    try {
      setUploading(true)

      // Convert compressed base64 to File for upload
      const blob = base64ToBlob(compressedForUpload, "image/jpeg")
      const compressedFile = new File([blob], selectedFile.name.replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
      })

      if (process.env.NODE_ENV === "development") {
        console.log(`Uploading compressed file: ${formatFileSize(compressedFile.size)}`)
      }

      const formData = new FormData()
      formData.append("file", compressedFile)
      if (takenDate) {
        formData.append("takenAt", takenDate)
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      // Check content type before parsing JSON
      const contentType = response.headers.get("content-type")
      if (!contentType?.includes("application/json")) {
        const text = await response.text()
        console.error("Non-JSON response from upload:", text.substring(0, 200))

        // Check for common HTTP errors
        if (response.status === 413) {
          throw new Error("Image file is too large. Please try a smaller image.")
        } else if (response.status === 401) {
          throw new Error("Session expired. Please sign in again.")
        } else if (response.status === 403) {
          throw new Error("You do not have permission to upload photos.")
        } else {
          throw new Error("Upload failed. Please check your connection and try again.")
        }
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Upload failed")
      }

      const photo: PhotoWithUrls = await response.json()

      // Show warning if AI description was skipped
      if ("warning" in photo && photo.warning) {
        showToast(photo.warning as string, "info")
      }

      // If user edited descriptions or ingredients, update them
      const needsUpdate =
        (dishName && dishName !== photo.dish_name) ||
        (descriptionEn && descriptionEn !== photo.description_en) ||
        (descriptionCn && descriptionCn !== photo.description_cn) ||
        (ingredients.length > 0 &&
          JSON.stringify(ingredients) !== JSON.stringify(photo.ingredients))

      if (needsUpdate) {
        try {
          const patchResponse = await fetch("/api/photos", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              photoId: photo.id,
              dishName,
              descriptionEn,
              descriptionCn,
              ingredients,
            }),
          })

          if (patchResponse.ok) {
            photo.dish_name = dishName
            photo.description_en = descriptionEn
            photo.description_cn = descriptionCn
            photo.ingredients = ingredients
          } else {
            console.error("Failed to update descriptions")
            // Don't fail the whole upload, just log it
          }
        } catch (patchError) {
          console.error("Description update error:", patchError)
          // Don't fail the whole upload, just log it
        }
      }

      // Add to recent photos
      setRecentPhotos((prev) => [photo, ...prev].slice(0, 5))

      // Reset form
      setSelectedFile(null)
      setTakenDate(null)
      setCompressedForUpload(null)
      setDishName("")
      setDescriptionEn("")
      setDescriptionCn("")
      setIngredients([])

      // Show success toast with heartbeat
      showToast("Photo uploaded with love!", "success")

      // Flag gallery to force-refresh on next load (skip cache, reset pagination)
      sessionStorage.setItem("lotp-v1:needs-refresh", "1")

      // Redirect to main gallery after successful upload
      router.push("/")
    } catch (error) {
      console.error("Upload error:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed. Please try again."
      showToast(errorMessage, "error")
    } finally {
      setUploading(false)
    }
  }, [
    selectedFile,
    compressedForUpload,
    takenDate,
    dishName,
    descriptionEn,
    descriptionCn,
    ingredients,
    router,
    showToast,
  ])

  const handleCancel = useCallback(() => {
    setSelectedFile(null)
    setTakenDate(null)
    setCompressedForUpload(null)
    setDishName("")
    setDescriptionEn("")
    setDescriptionCn("")
    setIngredients([])
  }, [])

  const handleAddIngredient = useCallback((ingredient: string) => {
    setIngredients((prev) => {
      if (prev.includes(ingredient)) return prev
      return [...prev, ingredient]
    })
  }, [])

  const handleRemoveIngredient = useCallback((ingredient: string) => {
    setIngredients((prev) => prev.filter((i) => i !== ingredient))
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/admin/login")
  }

  const handleDeleteClick = useCallback((photo: PhotoWithUrls) => {
    setPhotoToDelete(photo)
    setDeleteModalOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!photoToDelete) return

    try {
      setDeletingPhotoId(photoToDelete.id)

      const response = await fetch(`/api/photos?id=${photoToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Delete failed")
      }

      // Remove from recent photos list
      setRecentPhotos((prev) => prev.filter((photo) => photo.id !== photoToDelete.id))
      setDeleteModalOpen(false)
      setPhotoToDelete(null)
      showToast("Photo deleted", "info")
    } catch (error) {
      console.error("Delete error:", error)
      showToast(error instanceof Error ? error.message : "Delete failed", "error")
    } finally {
      setDeletingPhotoId(null)
    }
  }, [photoToDelete, showToast])

  const handleDeleteCancel = useCallback(() => {
    setDeleteModalOpen(false)
    setPhotoToDelete(null)
  }, [])

  // Backfill handlers
  const fetchBackfillStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/backfill")
      if (response.ok) {
        const data = await response.json()
        setBackfillStatus(data)
      }
    } catch (error) {
      console.error("Failed to fetch backfill status:", error)
    }
  }, [])

  const handleBackfill = useCallback(async () => {
    try {
      setBackfilling(true)
      const response = await fetch("/api/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Backfill failed")
      }

      const result = await response.json()
      showToast(
        `Backfill complete: ${result.success} succeeded, ${result.failed} failed`,
        "success"
      )
      fetchBackfillStatus()
    } catch (error) {
      console.error("Backfill error:", error)
      showToast(error instanceof Error ? error.message : "Backfill failed", "error")
    } finally {
      setBackfilling(false)
    }
  }, [showToast, fetchBackfillStatus])

  // Fetch backfill status when admin loads
  useEffect(() => {
    if (isAdmin) {
      void fetchBackfillStatus()
    }
  }, [isAdmin, fetchBackfillStatus])

  // Loading state
  if (isAdmin === null) {
    return (
      <>
        <Header showAdminLink={false} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  // Pending approval state for non-admin users
  if (!isAdmin) {
    return (
      <>
        <Header showAdminLink={false} />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center py-16">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning-soft flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-warning"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h1 className="font-display text-display font-semibold text-ink mb-2">
                Pending Approval
              </h1>
              <p className="text-ink-secondary">
                Your account is awaiting admin approval before you can upload images.
              </p>
              {userEmail && (
                <p className="text-sm text-ink-secondary mt-2">
                  Signed in as <span className="font-medium text-ink">{userEmail}</span>
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
    )
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
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                  />
                </svg>
                View Gallery
              </Button>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-display font-semibold text-ink">Upload Photo</h1>
            <p className="text-ink-secondary mt-1">Share your culinary creations</p>
          </div>

          {/* Upload Area */}
          {selectedFile ? (
            <ImagePreview
              file={selectedFile}
              dishName={dishName}
              descriptionEn={descriptionEn}
              descriptionCn={descriptionCn}
              ingredients={ingredients}
              takenDate={takenDate ?? ""}
              onDishNameChange={setDishName}
              onDescriptionEnChange={setDescriptionEn}
              onDescriptionCnChange={setDescriptionCn}
              onTakenDateChange={setTakenDate}
              onAddIngredient={handleAddIngredient}
              onRemoveIngredient={handleRemoveIngredient}
              onRegenerateDescription={handleRegenerateDescription}
              onRegenerateDescriptionsOnly={handleRegenerateDescriptionsOnly}
              onUpload={handleUpload}
              onCancel={handleCancel}
              uploading={uploading}
              regenerating={regenerating}
              regeneratingDescOnly={regeneratingDescOnly}
            />
          ) : (
            <UploadZone onFileSelect={handleFileSelect} disabled={uploading} />
          )}

          {/* Recent Uploads */}
          {recentPhotos.length > 0 && (
            <div className="mt-12">
              <h2 className="font-display text-heading font-semibold text-ink mb-4">
                Recently Uploaded
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {recentPhotos.map((photo) => (
                  <div key={photo.id} className="space-y-2">
                    <div className="aspect-square relative rounded-xl overflow-hidden bg-canvas-elevated border border-stroke group">
                      <Image
                        src={photo.thumbnailUrl}
                        alt={photo.description_en || photo.description_cn || "Recent upload"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 33vw, 200px"
                      />
                      {/* Delete button — always visible on mobile (top-right badge), hover overlay on desktop */}
                      {/* Desktop: centered overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors hidden md:flex items-center justify-center">
                        <button
                          onClick={() => handleDeleteClick(photo)}
                          disabled={deletingPhotoId === photo.id}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity bg-danger hover:bg-danger-intense text-white min-w-[44px] min-h-[44px] p-2.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                          aria-label="Delete photo"
                        >
                          {deletingPhotoId === photo.id ? (
                            <svg
                              className="w-5 h-5 animate-spin"
                              fill="none"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      {/* Mobile: always-visible badge in top-right corner */}
                      <button
                        onClick={() => handleDeleteClick(photo)}
                        disabled={deletingPhotoId === photo.id}
                        className="absolute top-1.5 right-1.5 md:hidden bg-danger/90 backdrop-blur-sm text-white min-w-[36px] min-h-[36px] p-2 rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer active:scale-95 transition-transform"
                        aria-label="Delete photo"
                      >
                        {deletingPhotoId === photo.id ? (
                          <svg
                            className="w-4 h-4 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    {photo.dish_name && (
                      <p className="text-sm text-ink-secondary text-center truncate px-1">
                        {photo.dish_name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backfill Section */}
          {backfillStatus &&
            (backfillStatus.withoutDishName > 0 || backfillStatus.withoutIngredients > 0) && (
              <div className="mt-12 p-6 bg-warning-soft border border-warning/20 rounded-xl">
                <h2 className="font-display text-heading font-semibold text-ink mb-2">
                  Backfill Missing Data
                </h2>
                <p className="text-ink-secondary mb-4 space-y-1">
                  {backfillStatus.withoutDishName > 0 && (
                    <span className="block">
                      {backfillStatus.withoutDishName} photo
                      {backfillStatus.withoutDishName > 1 ? "s" : ""} missing dish name or
                      descriptions
                    </span>
                  )}
                  {backfillStatus.withoutIngredients > 0 && (
                    <span className="block">
                      {backfillStatus.withoutIngredients} photo
                      {backfillStatus.withoutIngredients > 1 ? "s" : ""} missing ingredient tags
                    </span>
                  )}
                  <span className="block text-ink-tertiary">
                    out of {backfillStatus.total} total
                  </span>
                </p>
                <Button
                  onClick={handleBackfill}
                  loading={backfilling}
                  disabled={backfilling}
                  aria-busy={backfilling}
                >
                  {backfilling ? "Generating with AI…" : "Generate Missing Data with AI"}
                </Button>
                {backfilling && (
                  <p className="text-sm text-ink-secondary mt-2" role="status" aria-live="polite">
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
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-danger-soft">
            <svg
              className="w-6 h-6 text-danger"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-ink text-center mb-2">Delete Photo</h3>
          <p className="text-ink-secondary text-center mb-6">
            Are you sure you want to delete this photo? This action cannot be undone.
          </p>
          {photoToDelete && (
            <div className="mb-6 rounded-lg overflow-hidden border border-stroke">
              <div className="aspect-video relative">
                <Image
                  src={photoToDelete.thumbnailUrl}
                  alt={
                    photoToDelete.description_cn ||
                    photoToDelete.description_en ||
                    "Photo to delete"
                  }
                  fill
                  className="object-cover"
                />
              </div>
              {photoToDelete.dish_name && (
                <p className="text-sm text-ink-secondary text-center py-2 px-3">
                  {photoToDelete.dish_name}
                </p>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={handleDeleteCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={deletingPhotoId !== null}
              loading={deletingPhotoId !== null}
              className="flex-1"
            >
              {deletingPhotoId ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Footer />
    </>
  )
}
