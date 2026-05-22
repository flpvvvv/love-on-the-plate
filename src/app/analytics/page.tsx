"use client"

import Link from "next/link"
import { AnalyticsContent } from "@/components/analytics"
import { Footer, Header } from "@/components/layout"
import { Button } from "@/components/ui"

export default function AnalyticsPage() {
  return (
    <>
      <Header />

      <main id="main-content" className="flex-1 container mx-auto px-4 py-6 md:py-10">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-display font-semibold text-ink">Analytics</h1>
              <p className="text-ink-secondary mt-1">A quick look at how the gallery is growing</p>
            </div>
            <Link href="/">
              <Button variant="secondary" size="sm">
                Back to Gallery
              </Button>
            </Link>
          </div>

          <AnalyticsContent />
        </div>
      </main>

      <Footer />
    </>
  )
}
