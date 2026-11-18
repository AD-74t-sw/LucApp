import Link from "next/link";
import { cn } from "../cn";

export type TabItem = { href: string; label: string; active: boolean };

/** Underlined link tabs; the state lives in the URL, so they work without JavaScript. */
export function Tabs({
  items,
  label,
  replace = false,
}: {
  items: readonly TabItem[];
  label: string;
  /** Replace the history entry instead of adding one (tabs inside a dialog). */
  replace?: boolean;
}) {
  return (
    <nav aria-label={label} className="border-border mb-6 flex gap-6 overflow-x-auto border-b">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          replace={replace}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 border-transparent pb-3 text-sm whitespace-nowrap transition",
            item.active
              ? "border-foreground text-foreground font-medium"
              : "text-muted hover:text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
