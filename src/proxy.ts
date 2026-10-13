import { updateSession } from "@/lib/supabase/middleware"

// Next.js 16 proxy convention (renamed from middleware). `updateSession`
// already has the required (request: NextRequest) => Promise<NextResponse>
// signature, so alias it rather than wrapping it in a pass-through.
export const proxy = updateSession

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - they handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
