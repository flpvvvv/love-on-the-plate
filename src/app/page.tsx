'use client';

import { DesktopSidebar } from '@/components/layout';
import { Gallery } from '@/components/gallery';
import { useGalleryContext } from '@/components/layout/app-shell';

export default function HomePage() {
  const { isDesktop } = useGalleryContext();

  return (
    <div className="flex flex-1 min-h-screen">
      {/* Desktop sidebar */}
      {isDesktop && <DesktopSidebar />}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Gallery />
      </div>
    </div>
  );
}
