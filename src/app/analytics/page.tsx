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
          <div className="panel-head">
            <div>
              <h1 className="panel-title display">Analytics</h1>
              <p className="panel-sub">A quick look at how the gallery is growing</p>
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
