import type { SupabaseClient, User } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

interface AdminError {
  status: number
  message: string
  code: string
}

// Discriminated union: when error is null, user is guaranteed to be User
type RequireAdminSuccess = {
  user: User
  error: null
  response: undefined
}

type RequireAdminFailure = {
  user: User | null
  error: AdminError
  response: NextResponse
}

type RequireAdminResult = RequireAdminSuccess | RequireAdminFailure

/**
 * Check if the current user is authenticated and has admin role.
 * Returns the user if successful, or an error response if not.
 *
 * @param supabase - Supabase client instance
 * @returns Discriminated union - check `error` to determine success
 */
export async function requireAdmin(supabase: SupabaseClient): Promise<RequireAdminResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      user: null,
      error: { status: 401, message: "Please sign in to continue.", code: "UNAUTHORIZED" },
      response: NextResponse.json(
        { error: "Please sign in to continue.", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    }
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return {
      user,
      error: { status: 403, message: "Admin access required.", code: "FORBIDDEN" },
      response: NextResponse.json(
        { error: "Admin access required.", code: "FORBIDDEN" },
        { status: 403 }
      ),
    }
  }

  return { user, error: null } as RequireAdminSuccess
}
