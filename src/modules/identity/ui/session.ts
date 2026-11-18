import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getAuthUser } from "../application/authentication";
import { getProfile } from "../application/profile";
import { type CurrentUser, DEFAULT_SETTINGS } from "../domain/user";

/** Current user for this request (memoized per request), or null when signed out. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // The session is per request: never prerender it (JWT checks read the clock).
  await connection();
  const authUser = await getAuthUser();
  if (!authUser) return null;
  const profile = await getProfile(authUser.id);
  // Profiles are created on every sign-in path (see the access module); a
  // missing one means the session predates it, so the person signs in again.
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    ...(profile.settings ?? DEFAULT_SETTINGS),
  };
});

/**
 * Entry point of every protected page and Server Action.
 * The user id used by all queries comes from here, never from the client.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
