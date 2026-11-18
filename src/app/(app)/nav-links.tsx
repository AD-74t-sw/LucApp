"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState, useSyncExternalStore } from "react";
import { ChevronRight, Ellipsis, LayoutGrid, Plus } from "lucide-react";
import { Badge, ButtonLink, Dialog, cn } from "@/shared/ui";
import { APP_CONFIG, APP_IDS, type AppId, resolveApp } from "../apps";
import { APPS, MEALS_ITEMS, NAV_ITEMS, type NavHref, SETTINGS_ITEM } from "./nav-items";

/** Extra content next to a section's name, such as the count of notices to review. */
type Badges = Partial<Record<NavHref, ReactNode>>;

/** "Hoy" is the meals home: the other meals sections live under it, so it matches exactly. */
const EXACT = new Set<string>([APPS.meals.home]);

function activeMatcher(pathname: string | null) {
  return (href: string) =>
    pathname !== null &&
    (pathname === href || (!EXACT.has(href) && pathname.startsWith(`${href}/`)));
}

const noSubscription = () => () => {};

function readLastApp(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${APP_CONFIG.cookie}=([^;]*)`));
  return match ? decodeURIComponent(match[1] ?? "") : null;
}

/**
 * App of the current page. Shared pages (settings) belong to the last app
 * used, which only the browser knows (the server renders them as finance).
 */
function useCurrentApp(pathname: string | null): AppId {
  const lastApp = useSyncExternalStore(noSubscription, readLastApp, () => null);
  return (pathname && resolveApp(pathname, lastApp, APP_CONFIG)) || "finance";
}

/**
 * The current URL is request data, so the navigation that highlights it streams
 * inside <Suspense>; the fallback is the same navigation with nothing highlighted.
 */
export function SidebarNav({ badges }: { badges?: Badges }) {
  return <SidebarNavView pathname={usePathname()} badges={badges} />;
}

export function BottomNav({ badges }: { badges?: Badges }) {
  return <BottomNavView pathname={usePathname()} badges={badges} />;
}

/** Desktop: the two apps as tabs, then the current app's sections. */
export function SidebarNavView({ pathname, badges }: { pathname: string | null; badges?: Badges }) {
  const app = useCurrentApp(pathname);
  const isActive = activeMatcher(pathname);
  const items = app === "finance" ? NAV_ITEMS : MEALS_ITEMS;
  return (
    <>
      <nav
        aria-label="Apps"
        className="border-border mx-4 grid grid-cols-2 rounded-xs border p-0.5"
      >
        {APP_IDS.map((id) => (
          <Link
            key={id}
            href={APPS[id].home}
            aria-current={id === app ? "page" : undefined}
            className={cn(
              "text-muted hover:text-foreground flex items-center justify-center gap-1.5 rounded-xs py-1.5 text-sm transition",
              id === app && "bg-primary text-primary-foreground hover:text-primary-foreground",
            )}
          >
            {APPS[id].label}
          </Link>
        ))}
      </nav>
      {app === "finance" ? (
        <div className="px-4">
          <ButtonLink href="/transactions/new" className="w-full justify-between">
            Nuevo movimiento <ChevronRight className="size-4" />
          </ButtonLink>
        </div>
      ) : null}
      <nav aria-label="Principal" className="flex flex-col">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "text-muted hover:text-foreground hover:bg-surface-muted flex items-center gap-3 border-l-2 border-transparent px-3 py-2 pr-4 text-sm transition",
              isActive(href) && "border-accent bg-surface-muted text-foreground font-medium",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
            {badges?.[href]}
          </Link>
        ))}
      </nav>
    </>
  );
}

/** Finance sections reached through "Más" on phones. */
const MORE = [
  "/accounts",
  "/installments",
  "/debts",
  "/reimbursements",
  "/categories",
  SETTINGS_ITEM.href,
  "/menu",
];

/** The middle button of the phone bar: moves between apps. */
function AppSwitcher({ current }: { current: AppId }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Cambiar de app"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center"
      >
        <span className="bg-primary text-primary-foreground -mt-5 flex size-12 items-center justify-center rounded-xs">
          <LayoutGrid className="size-6" aria-hidden />
        </span>
      </button>
      {open ? (
        <Dialog title="Cambiar de app" onClose={() => setOpen(false)}>
          <ul className="flex flex-col gap-2">
            {APP_IDS.map((id) => {
              const { label, description, icon: Icon, home } = APPS[id];
              const isCurrent = id === current;
              return (
                <li key={id}>
                  <Link
                    href={home}
                    onClick={() => setOpen(false)}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cn(
                      "border-border hover:bg-surface-muted flex items-center gap-3 rounded-xs border px-4 py-3 transition",
                      isCurrent && "border-accent",
                    )}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted text-sm">{description}</span>
                    </span>
                    {isCurrent ? (
                      <Badge tone="accent">Actual</Badge>
                    ) : (
                      <ChevronRight className="text-muted size-4" aria-hidden />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Dialog>
      ) : null}
    </>
  );
}

/**
 * Bottom bar on phones: the current app's main sections around the app
 * switcher. Finance also gets a floating "Nuevo movimiento" button.
 */
export function BottomNavView({ pathname, badges }: { pathname: string | null; badges?: Badges }) {
  const app = useCurrentApp(pathname);
  const isActive = activeMatcher(pathname);
  const item = (
    href: string,
    label: string,
    Icon: typeof Plus,
    active: boolean,
    badge?: ReactNode,
  ) => (
    <Link
      key={href}
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "text-muted relative flex flex-col items-center gap-0.5 py-2 text-[11px]",
        active && "text-foreground font-medium",
      )}
    >
      <Icon className="size-5" aria-hidden />
      {label}
      {badge ? <span className="absolute top-1 left-1/2 ml-2">{badge}</span> : null}
    </Link>
  );
  const tab = ({ href, label, icon }: { href: NavHref; label: string; icon: typeof Plus }) =>
    item(href, label, icon, isActive(href), badges?.[href]);

  let left: ReactNode;
  let right: ReactNode;
  if (app === "finance") {
    const [dashboard, transactions, inbox] = NAV_ITEMS;
    left = [tab(dashboard), tab(transactions)];
    right = [
      tab({ ...inbox, label: "Revisar" }),
      item(
        "/menu",
        "Más",
        Ellipsis,
        MORE.some((href) => isActive(href)),
      ),
    ];
  } else {
    const [today, pantry, foods, blocks] = MEALS_ITEMS;
    left = [tab(today), tab(pantry)];
    right = [tab(foods), tab(blocks)];
  }

  return (
    <>
      <nav
        aria-label="Principal"
        className="border-border bg-surface fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {left}
        <AppSwitcher current={app} />
        {right}
      </nav>
      {app === "finance" && !isActive("/transactions/new") ? (
        <Link
          href="/transactions/new"
          aria-label="Nuevo movimiento"
          className="bg-primary text-primary-foreground fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex size-12 items-center justify-center rounded-xs shadow-sm lg:hidden"
        >
          <Plus className="size-6" aria-hidden />
        </Link>
      ) : null}
    </>
  );
}
