import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { completeEmailConfirmation } from "@/modules/access";

/** Target of the email confirmation link sent by Supabase Auth. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const result = code
    ? await completeEmailConfirmation({ code })
    : tokenHash && type
      ? await completeEmailConfirmation({ tokenHash, type })
      : null;

  return NextResponse.redirect(
    new URL(result?.ok ? "/dashboard" : "/login?error=confirmation", origin),
  );
}
