"use client"

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { NetworkStatusBanner } from "@/components/ui"
import { useMediaQuery } from "@/lib/hooks"
import type { GalleryView, MobileTab, PhotoWithUrls } from "@/types"

// Read a localStorage key, SSR-safe via useSyncExternalStore
function useLocalStorageValue<T extends string>(key: string, fallback: T, validValues: T[]): T {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener("storage", callback)
    return () => window.removeEventListener("storage", callback)
  }, [])

  const getSnapshot = useCallback(() => {
    const val = localStorage.getItem(key) as T | null
    return val && validValues.includes(val) ? val : fallback
  }, [key, fallback, validValues])

  const getServerSnapshot = useCallback(() => fallback, [fallback])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

const VALID_TABS: MobileTab[] = ["feed", "browse", "analytics", "upload"]
const VALID_VIEWS: GalleryView[] = ["floating", "masonry", "timeline"]

interface AppShellContextValue {
  isDesktop: boolean
  mobileTab: MobileTab
  setMobileTab: (tab: MobileTab) => void
  galleryView: GalleryView
  setGalleryView: (view: GalleryView) => void
  selectedPhoto: PhotoWithUrls | null
  setSelectedPhoto: (photo: PhotoWithUrls | null) => void
  photos: PhotoWithUrls[]
  setPhotos: (photos: PhotoWithUrls[] | ((prev: PhotoWithUrls[]) => PhotoWithUrls[])) => void
  handlePhotoClick: (photo: PhotoWithUrls) => void
  handleNextPhoto: () => void
  handlePrevPhoto: () => void
  hasPrev: boolean
  hasNext: boolean
  loading: boolean
  setLoading: (loading: boolean) => void
  hasMore: boolean
  setHasMore: (hasMore: boolean) => void
  cursor: string | null
  setCursor: (cursor: string | null) => void
  loadingMore: boolean
  setLoadingMore: (loading: boolean) => void
  refreshPhotos: () => Promise<void>
  setRefreshPhotos: (fn: () => Promise<void>) => void
}

// Split into two contexts: one for gallery data (changes rarely), one for selection (changes on nav)
interface GalleryContextValue {
  isDesktop: boolean
  mobileTab: MobileTab
  setMobileTab: (tab: MobileTab) => void
  galleryView: GalleryView
  setGalleryView: (view: GalleryView) => void
  photos: PhotoWithUrls[]
  setPhotos: (photos: PhotoWithUrls[] | ((prev: PhotoWithUrls[]) => PhotoWithUrls[])) => void
  handlePhotoClick: (photo: PhotoWithUrls) => void
  loading: boolean
  setLoading: (loading: boolean) => void
  hasMore: boolean
  setHasMore: (hasMore: boolean) => void
  cursor: string | null
  setCursor: (cursor: string | null) => void
  loadingMore: boolean
  setLoadingMore: (loading: boolean) => void
  refreshPhotos: () => Promise<void>
  setRefreshPhotos: (fn: () => Promise<void>) => void
}

interface SelectionContextValue {
  selectedPhoto: PhotoWithUrls | null
  setSelectedPhoto: (photo: PhotoWithUrls | null) => void
  handleNextPhoto: () => void
  handlePrevPhoto: () => void
  hasPrev: boolean
  hasNext: boolean
}

const GalleryContext = createContext<GalleryContextValue | null>(null)
const SelectionContext = createContext<SelectionContextValue | null>(null)

// Combined hook for backward compat
export function useAppShell(): AppShellContextValue {
  const gallery = useContext(GalleryContext)
  const selection = useContext(SelectionContext)
  if (!gallery || !selection) {
    throw new Error("useAppShell must be used within an AppShell")
  }
  return { ...gallery, ...selection }
}

// Targeted hooks for components that only need one context
export function useGalleryContext() {
  const context = useContext(GalleryContext)
  if (!context) throw new Error("useGalleryContext must be used within an AppShell")
  return context
}

export function useSelectionContext() {
  const context = useContext(SelectionContext)
  if (!context) throw new Error("useSelectionContext must be used within an AppShell")
  return context
}

const VIEW_STORAGE_KEY = "love-on-the-plate-v1:view"
const TAB_STORAGE_KEY = "love-on-the-plate-v1:tab"

export function AppShell({ children }: { children: ReactNode }) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  // Mobile tab -- synced with localStorage via useSyncExternalStore (no hydration mismatch)
  const savedTab = useLocalStorageValue(TAB_STORAGE_KEY, "feed" as MobileTab, VALID_TABS)
  const [mobileTab, setMobileTabState] = useState<MobileTab>(savedTab)
  // Keep in sync when the external store value changes (e.g. on mount)
  useEffect(() => {
    void setMobileTabState(savedTab)
  }, [savedTab])
  const setMobileTab = useCallback((tab: MobileTab) => {
    setMobileTabState(tab)
    localStorage.setItem(TAB_STORAGE_KEY, tab)
  }, [])

  // Gallery view -- synced with localStorage
  const savedView = useLocalStorageValue(VIEW_STORAGE_KEY, "masonry" as GalleryView, VALID_VIEWS)
  const [galleryView, setGalleryViewState] = useState<GalleryView>(savedView)
  useEffect(() => {
    void setGalleryViewState(savedView)
  }, [savedView])
  const setGalleryView = useCallback((view: GalleryView) => {
    setGalleryViewState(view)
    localStorage.setItem(VIEW_STORAGE_KEY, view)
  }, [])

  // Photos state
  const [photos, setPhotos] = useState<PhotoWithUrls[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithUrls | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [refreshPhotos, setRefreshPhotosState] = useState<() => Promise<void>>(() => async () => {})

  const setRefreshPhotos = useCallback((fn: () => Promise<void>) => {
    setRefreshPhotosState(() => fn)
  }, [])

  // Use refs for navigation so callbacks stay stable and don't cause re-renders
  const photosRef = useRef(photos)
  const selectedPhotoRef = useRef(selectedPhoto)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(() => {
    selectedPhotoRef.current = selectedPhoto
  }, [selectedPhoto])

  const handlePhotoClick = useCallback((photo: PhotoWithUrls) => {
    setSelectedPhoto(photo)
  }, [])

  const handlePrevPhoto = useCallback(() => {
    const currentPhotos = photosRef.current
    const current = selectedPhotoRef.current
    if (!current) return
    const idx = currentPhotos.findIndex((p) => p.id === current.id)
    if (idx > 0) {
      setSelectedPhoto(currentPhotos[idx - 1])
    }
  }, [])

  const handleNextPhoto = useCallback(() => {
    const currentPhotos = photosRef.current
    const current = selectedPhotoRef.current
    if (!current) return
    const idx = currentPhotos.findIndex((p) => p.id === current.id)
    if (idx < currentPhotos.length - 1) {
      setSelectedPhoto(currentPhotos[idx + 1])
    }
  }, [])

  // Derived selection state
  const selectedIndex = selectedPhoto ? photos.findIndex((p) => p.id === selectedPhoto.id) : -1
  const hasPrev = selectedIndex > 0
  const hasNext = selectedIndex >= 0 && selectedIndex < photos.length - 1

  // Memoize gallery context (changes only when gallery data / UI state changes)
  const galleryValue = useMemo<GalleryContextValue>(
    () => ({
      isDesktop,
      mobileTab,
      setMobileTab,
      galleryView,
      setGalleryView,
      photos,
      setPhotos,
      handlePhotoClick,
      loading,
      setLoading,
      hasMore,
      setHasMore,
      cursor,
      setCursor,
      loadingMore,
      setLoadingMore,
      refreshPhotos,
      setRefreshPhotos,
    }),
    [
      isDesktop,
      mobileTab,
      setMobileTab,
      galleryView,
      setGalleryView,
      photos,
      handlePhotoClick,
      loading,
      hasMore,
      cursor,
      loadingMore,
      refreshPhotos,
      setRefreshPhotos,
    ]
  )

  // Memoize selection context (changes only when selected photo changes)
  const selectionValue = useMemo<SelectionContextValue>(
    () => ({
      selectedPhoto,
      setSelectedPhoto,
      handleNextPhoto,
      handlePrevPhoto,
      hasPrev,
      hasNext,
    }),
    [selectedPhoto, handleNextPhoto, handlePrevPhoto, hasPrev, hasNext]
  )

  return (
    <GalleryContext.Provider value={galleryValue}>
      <SelectionContext.Provider value={selectionValue}>
        <NetworkStatusBanner />
        {children}
      </SelectionContext.Provider>
    </GalleryContext.Provider>
  )
}
