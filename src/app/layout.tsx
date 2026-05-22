import type { Metadata, Viewport } from "next"
import { AppShell } from "@/components/layout"
import { ThemeProvider, ToastProvider } from "@/components/ui"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL("https://plates.mathis.day"),
  title: "Love on the Plate | A Personal Food Gallery",
  description:
    "A personal collection of homemade meals, celebrating the joy of cooking and sharing food with love. Browse through delicious dishes and culinary memories.",
  alternates: {
    canonical: "https://plates.mathis.day",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Love on Plate",
  },
  openGraph: {
    title: "Love on the Plate | A Personal Food Gallery",
    description:
      "A personal collection of homemade meals, celebrating the joy of cooking and sharing food with love.",
    type: "website",
    siteName: "Love on the Plate",
    url: "https://plates.mathis.day",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Love on the Plate - Personal Food Gallery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Love on the Plate | A Personal Food Gallery",
    description:
      "A personal collection of homemade meals, celebrating the joy of cooking and sharing food with love.",
    images: ["/og-image.png"],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFBF8" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0C0A" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-love focus:text-white focus:rounded-lg focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-love"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
