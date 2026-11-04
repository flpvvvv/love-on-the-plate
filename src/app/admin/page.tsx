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
} from "@/lib/client-image-compression"
import { DEFAULT_IMAGE_EDITS, type ImageEdits, renderEditedImage } from "@/lib/image-editing"
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
  const [imageEdits, setImageEdits] = useState<ImageEdits>(DEFAULT_IMAGE_EDITS)
  const [dishName, setDishName] = useState("")
  const [descriptionEn, setDescriptionEn] = useState("")
  const [descriptionCn, setDescriptionCn] = useState("")
  const [descriptionsReady, setDescriptionsReady] = useState(false)
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
      setImageEdits({ ...DEFAULT_IMAGE_EDITS })
      setDishName("")
      setDescriptionEn("")
      setDescriptionCn("")
      setDescriptionsReady(false)
      setIngredients([])
      // Keep Upload disabled until the original-image description settles.
      setRegenerating(true)

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

      // Generate initial descriptions from the original image
      try {
        setDishName("识别菜名中…")
        setDescriptionEn("Generating English description…")
        setDescriptionCn("正在生成中文描述…")

        // AI description uses the untouched original, before any user edits.
        // Compress for AI (1280px - smaller/faster for description)
        const aiBase64 = await compressImage(file, COMPRESSION_PRESETS.ai)

        if (process.env.NODE_ENV === "development") {
          console.log(
            `AI input compressed: ${formatFileSize(file.size)} → ${COMPRESSION_PRESETS.ai.maxWidth}px`
          )
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
          setDescriptionsReady(true)
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
          setDescriptionsReady(false)
        }
      } catch (error) {
        console.error("Preview generation error:", error)
        const errorMessage = error instanceof Error ? error.message : "Failed to process image"
        showToast(errorMessage, "error")
        setDishName("")
        setDescriptionEn("")
        setDescriptionCn("")
        setIngredients([])
        setDescriptionsReady(false)
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
      setDescriptionsReady(false)

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
        setDescriptionsReady(true)
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
      setDescriptionsReady(false)

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
        setDescriptionsReady(true)
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
    if (!selectedFile) return

    try {
      setUploading(true)

      // Bake filters, crop, flips and rotation into the stored image.
      const edited = await renderEditedImage(selectedFile, imageEdits, COMPRESSION_PRESETS.upload)
      const thumbnail = await renderEditedImage(
        selectedFile,
        imageEdits,
        COMPRESSION_PRESETS.thumbnail
      )

      const blob = base64ToBlob(edited.base64, "image/jpeg")
      const compressedFile = new File([blob], selectedFile.name.replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
      })

      if (process.env.NODE_ENV === "development") {
        console.log(
          `Uploading edited file: ${formatFileSize(compressedFile.size)} (${edited.width}×${edited.height})`
        )
      }

      const formData = new FormData()
      formData.append("file", compressedFile)
      const thumbBlob = base64ToBlob(thumbnail.base64, "image/jpeg")
      formData.append(
        "thumbnail",
        new File([thumbBlob], `thumb-${selectedFile.name.replace(/\.[^.]+$/, ".jpg")}`, {
          type: "image/jpeg",
        })
      )
      if (takenDate) {
        formData.append("takenAt", takenDate)
      }

      // These were generated from the original image before any edits.
      if (descriptionsReady) {
        formData.append("descriptionsProvided", "true")
        formData.append("dishName", dishName)
        formData.append("descriptionEn", descriptionEn)
        formData.append("descriptionCn", descriptionCn)
        formData.append("ingredients", JSON.stringify(ingredients))
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

      // Add to recent photos
      setRecentPhotos((prev) => [photo, ...prev].slice(0, 5))

      // Reset form
      setSelectedFile(null)
      setTakenDate(null)
      setImageEdits({ ...DEFAULT_IMAGE_EDITS })
      setDishName("")
      setDescriptionEn("")
      setDescriptionCn("")
      setDescriptionsReady(false)
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
    imageEdits,
    takenDate,
    dishName,
    descriptionEn,
    descriptionCn,
    descriptionsReady,
    ingredients,
    router,
    showToast,
  ])

  const handleCancel = useCallback(() => {
    setSelectedFile(null)
    setTakenDate(null)
    setImageEdits({ ...DEFAULT_IMAGE_EDITS })
    setDishName("")
    setDescriptionEn("")
    setDescriptionCn("")
    setDescriptionsReady(false)
    setIngredients([])
  }, [])

  const handleDishNameChange = useCallback((value: string) => {
    setDishName(value)
    setDescriptionsReady(true)
  }, [])

  const handleDescriptionEnChange = useCallback((value: string) => {
    setDescriptionEn(value)
    setDescriptionsReady(true)
  }, [])

  const handleDescriptionCnChange = useCallback((value: string) => {
    setDescriptionCn(value)
    setDescriptionsReady(true)
  }, [])

  const handleAddIngredient = useCallback((ingredient: string) => {
    setDescriptionsReady(true)
    setIngredients((prev) => {
      if (prev.includes(ingredient)) return prev
      return [...prev, ingredient]
    })
  }, [])

  const handleRemoveIngredient = useCallback((ingredient: string) => {
    setDescriptionsReady(true)
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
              <span className="nb nb-butter w-16 h-16 mx-auto mb-4 grid place-items-center">
                <svg
                  className="ic"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </span>
              <h1 className="text-display mb-2">Pending Approval</h1>
              <p className="muted">
                Your account is awaiting admin approval before you can upload images.
              </p>
              {userEmail && (
                <p className="text-caption muted mt-2">
                  Signed in as <span className="font-bold text-ink">{userEmail}</span>
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
          {/* Panel head with navigation and title */}
          <div className="panel-head mb-8">
            <div>
              <h1 className="panel-title display">Upload Photo</h1>
              <p className="panel-sub">Share your culinary creations</p>
            </div>
            <Link href="/">
              <Button variant="secondary" size="sm">
                <svg
                  className="ic ic-sm"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                  />
                </svg>
                View Gallery
              </Button>
            </Link>
          </div>

          {/* Upload Area */}
          {selectedFile ? (
            <ImagePreview
              file={selectedFile}
              edits={imageEdits}
              onEditsChange={setImageEdits}
              dishName={dishName}
              descriptionEn={descriptionEn}
              descriptionCn={descriptionCn}
              ingredients={ingredients}
              takenDate={takenDate ?? ""}
              onDishNameChange={handleDishNameChange}
              onDescriptionEnChange={handleDescriptionEnChange}
              onDescriptionCnChange={handleDescriptionCnChange}
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
            <div className="nb-block mt-8">
              <div className="block-head">
                <h2 className="label">Recently Uploaded</h2>
              </div>
              <ul className="recent">
                {recentPhotos.map((photo) => (
                  <li key={photo.id}>
                    <span className="nb nb-flat relative w-12 h-12 flex-none bg-wash">
                      <Image
                        src={photo.thumbnailUrl}
                        alt={photo.description_en || photo.description_cn || "Recent upload"}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold truncate">
                        {photo.dish_name || photo.original_filename || ""}
                      </span>
                      <span className="mono muted text-micro block truncate">
                        {[
                          photo.original_filename,
                          photo.display_date,
                          photo.file_size ? formatFileSize(photo.file_size) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>

                    {/* Delete — full button on desktop */}
                    <button
                      onClick={() => handleDeleteClick(photo)}
                      disabled={deletingPhotoId === photo.id}
                      className="btn btn-sm btn-danger hide-mobile"
                      aria-label="Delete photo"
                    >
                      {deletingPhotoId === photo.id ? (
                        <svg
                          className="ic ic-sm animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="ic ic-sm"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                      Delete
                    </button>

                    {/* Delete — tomato bubble on mobile */}
                    <button
                      onClick={() => handleDeleteClick(photo)}
                      disabled={deletingPhotoId === photo.id}
                      className="icon-btn bg-tomato text-on-fill hide-desktop disabled:opacity-45 disabled:cursor-not-allowed"
                      aria-label="Delete photo"
                    >
                      {deletingPhotoId === photo.id ? (
                        <svg
                          className="ic ic-sm animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="ic ic-sm"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="square"
                            strokeLinejoin="miter"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Backfill Section */}
          {backfillStatus &&
            (backfillStatus.withoutDishName > 0 || backfillStatus.withoutIngredients > 0) && (
              <div className="nb nb-butter mt-8 p-4">
                <div className="block-head">
                  <h2 className="label">Backfill Missing Data</h2>
                </div>
                {backfillStatus.withoutDishName > 0 && (
                  <div className="backfill-stat">
                    <span>
                      {backfillStatus.withoutDishName} photo
                      {backfillStatus.withoutDishName > 1 ? "s" : ""} missing dish name or
                      descriptions
                    </span>
                    <b>{backfillStatus.withoutDishName}</b>
                  </div>
                )}
                {backfillStatus.withoutIngredients > 0 && (
                  <div className="backfill-stat">
                    <span>
                      {backfillStatus.withoutIngredients} photo
                      {backfillStatus.withoutIngredients > 1 ? "s" : ""} missing ingredient tags
                    </span>
                    <b>{backfillStatus.withoutIngredients}</b>
                  </div>
                )}
                <div className="backfill-stat">
                  <span>out of {backfillStatus.total} total</span>
                  <b>{backfillStatus.total}</b>
                </div>
                <button
                  type="button"
                  onClick={handleBackfill}
                  disabled={backfilling}
                  aria-busy={backfilling}
                  className="btn mt-4"
                >
                  {backfilling && (
                    <span
                      className="spin-ring h-4 w-4 shrink-0 animate-spin border-2 border-current border-t-transparent"
                      aria-hidden="true"
                    />
                  )}
                  {backfilling ? "Generating with AI…" : "Generate Missing Data with AI"}
                </button>
                {backfilling && (
                  <p className="text-caption mt-2" role="status" aria-live="polite">
                    This may take a while. Please don&apos;t close this page.
                  </p>
                )}
              </div>
            )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onClose={handleDeleteCancel} className="max-w-md w-full mx-4">
        <div className="p-5">
          <span className="nb nb-tomato w-12 h-12 mx-auto mb-4 grid place-items-center">
            <svg
              className="ic"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </span>
          <h3 className="text-heading text-center mb-2">Delete Photo</h3>
          <p className="muted text-center mb-6">
            Are you sure you want to delete this photo? This action cannot be undone.
          </p>
          {photoToDelete && (
            <div className="nb nb-flat overflow-hidden mb-6">
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
                <p className="muted text-caption text-center py-2 px-3">
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
