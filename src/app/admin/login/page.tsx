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
      className="nb shadow-lg p-5"
    >
      {sent ? (
        <div className="text-center py-4">
          <span className="sent-icon nb nb-leaf w-13 h-13 mx-auto mb-4 grid place-items-center">
            <svg
              className="ic"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
          </span>
          <h2 className="text-heading mb-2">Check your email</h2>
          <p className="muted text-caption">
            We sent a magic link to <strong className="mono text-ink">{email}</strong>
          </p>
          <p className="muted text-caption mt-2">Click the link in the email to sign in.</p>
          <button
            type="button"
            onClick={() => {
              setSent(false)
              setEmail("")
            }}
            className="btn btn-block mt-4"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="field">
            <label htmlFor="email" className="label">
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
              className="input"
              disabled={loading}
            />
          </div>

          {errorMessage && <p className="text-danger text-caption">{errorMessage}</p>}

          <Button type="submit" variant="primary" loading={loading} className="btn-block">
            Send Magic Link
          </Button>
        </form>
      )}
    </motion.div>
  )
}

function LoginFormSkeleton() {
  return (
    <div className="nb p-5 space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
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
          <h1 className="text-display">Love on the Plate</h1>
          <p className="label muted mt-1">Admin Login</p>
        </motion.div>

        {/* Login Form */}
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-caption muted mt-6"
        >
          No password needed &mdash; we&apos;ll email you a login link.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-4"
        >
          <Link href="/" className="btn btn-ghost btn-sm">
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
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
