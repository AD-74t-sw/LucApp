import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { env } from "@/shared/infrastructure";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Supabase is only used for authentication; data goes through Prisma.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(env().SUPABASE_URL, env().SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: CookieToSet[]) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** Supabase client bound to a proxy request/response pair (session refresh). */
export function createSupabaseProxyClient(request: NextRequest, getResponse: () => NextResponse) {
  return createServerClient(env().SUPABASE_URL, env().SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: CookieToSet[]) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        const response = getResponse();
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
}
