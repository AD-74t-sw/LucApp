import Link from "next/link";
import { Suspense } from "react";
import { UserAvatarLink, UserMenu } from "@/modules/identity/ui";
import { Logo } from "@/shared/ui";
import { BottomNav, BottomNavView, SidebarNav, SidebarNavView } from "./nav-links";
import { PendingNoticeCount } from "./pending-notice-count";
import { ShortageCount } from "./shortage-count";

/**
 * Counts next to a section (stream in; nothing while loading): notices waiting
 * for review, and food categories that will not last at home.
 */
const badges = {
  "/inbox": (
    <Suspense fallback={null}>
      <PendingNoticeCount />
    </Suspense>
  ),
  "/meals/pantry": (
    <Suspense fallback={null}>
      <ShortageCount />
    </Suspense>
  ),
};

function Brand() {
  return (
    <Link href="/dashboard" aria-label="LucApp, ir al resumen">
      <Logo />
    </Link>
  );
}

/**
 * Static shell of the private area. It does not read the session itself (so it
 * can be prerendered); every page calls requireUser() and the user menu streams in.
 */
export default function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  /** Dialogs for intercepted "new …" routes (see the @modal folder). */
  modal: React.ReactNode;
}) {
  return (
    <div className="bg-grid min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="border-border bg-surface sticky top-0 hidden h-dvh flex-col gap-6 border-r py-5 lg:flex">
        <div className="px-5">
          <Brand />
        </div>
        <Suspense fallback={<SidebarNavView pathname={null} badges={badges} />}>
          <SidebarNav badges={badges} />
        </Suspense>
        <div className="border-border mt-auto border-t px-4 pt-3">
          <Suspense fallback={<div className="h-10" />}>
            <UserMenu />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Phone bar: each page's PageHeader puts its title and back button over it. */}
        <header className="border-border bg-surface sticky top-0 z-10 flex items-center justify-end border-b px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 lg:hidden">
          <Suspense fallback={<div className="size-9" />}>
            <UserAvatarLink />
          </Suspense>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-8 lg:pt-12 lg:pb-12">
          {children}
        </main>
      </div>
      {modal}
      <Suspense fallback={<BottomNavView pathname={null} badges={badges} />}>
        <BottomNav badges={badges} />
      </Suspense>
    </div>
  );
}
