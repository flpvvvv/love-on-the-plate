import type { NextConfig } from "next"

// Required for next/image remotePatterns and the Content-Security-Policy below.
// Fail loudly at build time instead of throwing an opaque error from `new URL()`.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is required: it configures next/image remotePatterns and the Content-Security-Policy. Set it in .env.local (or the Vercel project environment) before building."
  )
}

const supabaseHostname = new URL(supabaseUrl).hostname
const supabaseOrigin = `https://${supabaseHostname}`

// Note: 'unsafe-inline' is required for script/style because next-themes and
// Next.js itself emit inline bootstrap scripts without a nonce. Everything
// else is locked to self + the Supabase project + Google Fonts.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  `img-src 'self' data: blob: ${supabaseOrigin}`,
  `connect-src 'self' ${supabaseOrigin}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ")

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            // camera is allowed for self: the mobile upload flow uses
            // <input type="file" capture="environment"> to open the camera.
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
}

export default nextConfig
