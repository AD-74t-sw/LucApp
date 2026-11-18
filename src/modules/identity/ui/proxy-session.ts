import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseProxyClient } from "../infrastructure/supabase";

// /api/inbox authenticates with its own token (iOS Shortcuts have no session),
// and /api/jobs with CRON_SECRET (an external cron has none either).
const PUBLIC_PATHS = ["/login", "/register", "/auth", "/api/inbox", "/api/jobs"];

function isPublic(pathname: string): boolean {
  return (
    pathname === "/" || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  );
}

/**
 * Runs on every request: refreshes the Supabase session cookies and sends
 * signed-out visitors of private pages to the login. This is only an
 * optimistic check; pages and actions still call `requireUser()`.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const supabase = createSupabaseProxyClient(request, () => {
    response = NextResponse.next({ request });
    return response;
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims.sub);

  if (!signedIn && !isPublic(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
