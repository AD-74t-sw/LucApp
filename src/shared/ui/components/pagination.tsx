import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../cn";

/** Previous/next links that keep the current query string. */
export function Pagination({
  page,
  pageCount,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;
  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") query.set(key, value);
    }
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const linkClass =
    "inline-flex items-center gap-1 rounded-xs px-3 py-1.5 text-sm hover:bg-surface-muted";
  return (
    <nav aria-label="Paginación" className="mt-4 flex items-center justify-between gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClass}>
          <ChevronLeft className="size-4" /> Anterior
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted text-sm">
        Página {page} de {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={href(page + 1)} className={cn(linkClass)}>
          Siguiente <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
