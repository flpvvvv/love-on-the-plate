import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Allowlist of valid redirect paths to prevent open redirect attacks
const ALLOWED_PATHS = ['/', '/admin', '/admin/login'];

function getSafeRedirectPath(next: string | null): string {
  const defaultPath = '/admin';

  if (!next) return defaultPath;

  // Must start with / but not // (which would redirect to external site)
  if (!next.startsWith('/') || next.startsWith('//')) {
    return defaultPath;
  }

  // Check against allowlist (exact match or starts with allowed path + /)
  const isAllowed = ALLOWED_PATHS.some(
    (path) => next === path || next.startsWith(`${path}/`) || next.startsWith(`${path}?`)
  );

  return isAllowed ? next : defaultPath;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = getSafeRedirectPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/admin/login?error=auth`);
}
