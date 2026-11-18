/**
 * The LucApp mark on a 32×32 grid: a block "L" and a coin resting in its
 * corner. Solid shapes only (no strokes), so it stays crisp from 16 px to 512 px.
 * Shared by the UI logo and the generated app icons.
 */
export const LOGO_VIEWBOX = "0 0 32 32";
export const LOGO_L_PATH = "M5 5h7v15h15v7H5z";
export const LOGO_COIN = { cx: 21.5, cy: 10.5, r: 5.5 } as const;
