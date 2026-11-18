import Image from "next/image";
import { cn } from "@/shared/ui";
import type { CardNetwork } from "../domain/card";
import { CARD_NETWORK_LABELS } from "./labels";

/**
 * Official logos of the card networks (Wikimedia Commons SVGs stored in
 * /public/networks). They are trademarks of their owners, used to identify them.
 */
const NETWORK_LOGOS: Partial<Record<CardNetwork, { src: string; width: number; height: number }>> =
  {
    VISA: { src: "/networks/visa.svg", width: 512, height: 166 },
    MASTERCARD: { src: "/networks/mastercard.svg", width: 1000, height: 618 },
    AMEX: { src: "/networks/amex.svg", width: 1000, height: 998 },
    DINERS: { src: "/networks/diners.svg", width: 1945, height: 504 },
  };

/** Network logo fitted in a small white "chip" (same size for every network). */
export function CardNetworkLogo({
  network,
  height = 20,
  className,
}: {
  network: CardNetwork;
  height?: number;
  className?: string;
}) {
  const logo = NETWORK_LOGOS[network];
  const label = CARD_NETWORK_LABELS[network];
  const width = Math.round(height * 1.6);
  return (
    <span
      className={cn(
        "border-border inline-flex shrink-0 items-center justify-center rounded-xs border bg-white p-0.5",
        className,
      )}
      style={{ width, height }}
      title={label}
    >
      {logo ? (
        <Image
          src={logo.src}
          alt={label}
          width={logo.width}
          height={logo.height}
          className="h-full w-full object-contain"
          unoptimized
        />
      ) : (
        <span className="text-[9px] leading-none text-neutral-500">{label}</span>
      )}
    </span>
  );
}
