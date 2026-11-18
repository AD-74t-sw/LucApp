import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button, cn } from "@/shared/ui";
import { signOutAction } from "./actions";
import { getCurrentUser } from "./session";

/** Up to two initials: "Lucía Prueba" -> "LP". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words.at(-1)] : [words[0]];
  return letters.map((word) => word?.slice(0, 1).toUpperCase() ?? "").join("") || "?";
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-accent-soft text-accent flex shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/** The user's avatar, linking to settings (phone header). Render inside <Suspense>. */
export async function UserAvatarLink() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <Link
      href="/settings"
      aria-label={`Ajustes de ${user.name}`}
      title="Ajustes"
      className="hover:ring-accent/40 rounded-full transition hover:ring-2"
    >
      <Avatar name={user.name} className="size-9 text-sm" />
    </Link>
  );
}

/** Name linking to settings, plus sign out (desktop sidebar). Render inside <Suspense>. */
export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/settings"
        className="hover:bg-surface-muted flex min-w-0 flex-1 items-center gap-2 rounded-xs px-2 py-1.5 text-sm"
      >
        <Avatar name={user.name} className="size-7" />
        <span className="truncate">{user.name}</span>
      </Link>
      <form action={signOutAction}>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  );
}

/** Sign out as a full-width list row (last option of "Más" on phones). */
export function SignOutRow() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="text-danger hover:bg-surface-muted flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <LogOut className="size-5" aria-hidden />
        Cerrar sesión
      </button>
    </form>
  );
}
