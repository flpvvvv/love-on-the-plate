"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { Button, Skeleton } from "@/components/ui"
import { createClient } from "@/lib/supabase/client"

function LoginForm() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(
    error === "auth" ? "Authentication failed. Please try again." : null
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setErrorMessage("Please enter your email")
      return
    }

    setLoading(true)
    setErrorMessage(null)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        throw error
      }

      setSent(true)
    } catch (error) {
      console.error("Login error:", error)
      setErrorMessage("Failed to send login link. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.2 }}
      className="bg-canvas-elevated border border-stroke rounded-2xl p-6 shadow-md"
    >
      {sent ? (
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 text-love">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <h2 className="text-subheading font-semibold text-ink mb-2">Check your email</h2>
          <p className="text-ink-secondary text-caption">
            We sent a magic link to <strong className="text-ink">{email}</strong>
          </p>
          <p className="text-ink-tertiary text-caption mt-2">
            Click the link in the email to sign in.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false)
              setEmail("")
            }}
            className="mt-4 text-love hover:text-love-intense text-caption focus:outline-none focus-ring rounded-md px-2 py-1"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-caption font-medium text-ink mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              spellCheck={false}
              className="w-full px-4 py-3 bg-canvas border border-stroke rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-love text-ink placeholder:text-ink-tertiary"
              disabled={loading}
            />
          </div>

          {errorMessage && (
            <p className="text-red-500 dark:text-red-400 text-caption">{errorMessage}</p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Send Magic Link
          </Button>
        </form>
      )}
    </motion.div>
  )
}

function LoginFormSkeleton() {
  return (
    <div className="bg-canvas-elevated border border-stroke rounded-2xl p-6 space-y-4">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-canvas relative overflow-hidden">
      {/* Warm atmospheric background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Soft radial glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-love/[0.04] blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-warmth/[0.05] blur-3xl" />
        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wMyIvPjwvc3ZnPg==')] opacity-50 dark:opacity-30" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo + branding */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 mx-auto mb-4">
            <Image
              src="/logo.svg"
              alt="Love on the Plate"
              width={80}
              height={80}
              className="w-full h-full"
              style={{ filter: "var(--logo-filter, none)" }}
            />
          </div>
          <h1 className="font-display text-display font-semibold text-ink">Love on the Plate</h1>
          <p className="font-accent text-lg text-ink-secondary mt-1">Admin Login</p>
        </motion.div>

        {/* Login Form */}
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-caption text-ink-tertiary mt-6"
        >
          No password needed &mdash; we&apos;ll email you a login link.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-4"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-caption text-ink-tertiary hover:text-ink transition-colors"
          >
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
            Back to Gallery
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
