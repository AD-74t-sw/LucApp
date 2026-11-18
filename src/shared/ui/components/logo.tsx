import { cn } from "../cn";
import { LOGO_COIN, LOGO_L_PATH, LOGO_VIEWBOX } from "../logo-geometry";

/** The mark alone. The "L" follows the text color; the coin is the brand purple. */
export function LogoMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      width={size}
      height={size}
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <path d={LOGO_L_PATH} fill="currentColor" />
      <circle {...LOGO_COIN} fill="var(--accent)" />
    </svg>
  );
}

/** Mark + wordmark, as used in headers. */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn("flex items-center gap-2 text-lg font-semibold tracking-[-0.03em]", className)}
    >
      <LogoMark size={22} />
      LucApp
    </span>
  );
}
