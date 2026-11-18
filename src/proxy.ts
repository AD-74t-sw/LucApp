import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/modules/identity";
import { APP_COOKIE, APP_HOME, isAppId } from "./app/apps";

/**
 * Refreshes the Supabase session on every request and guards private pages.
 * "/" (also where the installed app starts) opens the last app used.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    const last = request.cookies.get(APP_COOKIE)?.value;
    const url = request.nextUrl.clone();
    url.pathname = APP_HOME[isAppId(last) ? last : "finance"];
    return NextResponse.redirect(url);
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, image files and the service worker.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon/|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
