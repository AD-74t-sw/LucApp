import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/shared/ui";
import { findInstitution } from "../domain/institutions";

/**
 * Logo of a known institution in a square frame, or `fallback` (e.g. the
 * account type icon) when the name is not in the catalog.
 */
export function InstitutionLogo({
  name,
  size = 36,
  fallback = null,
  className,
}: {
  name: string | null | undefined;
  size?: number;
  fallback?: ReactNode;
  className?: string;
}) {
  const institution = findInstitution(name);
  if (!institution) return <>{fallback}</>;
  const inner = Math.round(size * 0.72);
  return (
    <span
      className={cn(
        "border-border flex shrink-0 items-center justify-center rounded-xs border bg-white",
        className,
      )}
      style={{ width: size, height: size }}
      title={institution.name}
    >
      <Image src={institution.logo} alt={institution.name} width={inner} height={inner} />
    </span>
  );
}
