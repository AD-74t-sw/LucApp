import { ImageResponse } from "next/og";
import { LOGO_COIN, LOGO_L_PATH, LOGO_VIEWBOX } from "@/shared/ui/logo-geometry";

/**
 * App icon drawn from the same geometry as the UI logo: the white "L" and the
 * purple coin on black. The mark fills the central 58%, so Android can crop
 * the icon to a circle ("maskable") and iOS can round its corners safely.
 */
export function appIcon(size: number) {
  const mark = Math.round(size * 0.58);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0d0d0d",
      }}
    >
      <svg viewBox={LOGO_VIEWBOX} width={mark} height={mark}>
        <path d={LOGO_L_PATH} fill="#ffffff" />
        <circle cx={LOGO_COIN.cx} cy={LOGO_COIN.cy} r={LOGO_COIN.r} fill="#8466f5" />
      </svg>
    </div>,
    { width: size, height: size },
  );
}
