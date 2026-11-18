import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SignOutRow } from "@/modules/identity/ui";
import { Card, PageHeader } from "@/shared/ui";
import { FROM_MORE, NAV_ITEMS, SETTINGS_ITEM } from "../nav-items";

export const metadata: Metadata = { title: "Más" };

/** Every section, for phones (the bottom bar only fits the main ones), and sign out last. */
export default function MenuPage() {
  const items = [...NAV_ITEMS.filter((i) => i.href !== "/dashboard"), SETTINGS_ITEM];
  return (
    <>
      <PageHeader title="Más" />
      <Card className="p-0">
        <ul className="divide-border divide-y">
          {items.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href === "/inbox" ? `${href}?${FROM_MORE.param}=${FROM_MORE.value}` : href}
                className="hover:bg-surface-muted flex items-center gap-3 px-4 py-3.5"
              >
                <Icon className="text-muted size-5" aria-hidden />
                <span className="flex-1">{label}</span>
                <ChevronRight className="text-muted size-4" aria-hidden />
              </Link>
            </li>
          ))}
          <li>
            <SignOutRow />
          </li>
        </ul>
      </Card>
    </>
  );
}
