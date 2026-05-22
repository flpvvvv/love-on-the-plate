"use client"

import { Gallery } from "@/components/gallery"
import { DesktopSidebar } from "@/components/layout"
import { useGalleryContext } from "@/components/layout/app-shell"

export default function HomePage() {
  const { isDesktop } = useGalleryContext()

  return (
    <>
      {/* SEO H1 - visually hidden but accessible */}
      <h1 className="sr-only">Love on the Plate - Personal Food Gallery</h1>

      <div className="flex flex-1 min-h-screen">
        {/* Desktop sidebar */}
        {isDesktop && <DesktopSidebar />}

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0" id="main-content">
          <Gallery />
        </main>
      </div>
    </>
  )
}
