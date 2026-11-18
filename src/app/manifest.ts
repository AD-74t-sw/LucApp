import type { MetadataRoute } from "next";

/**
 * Lets the app be installed on a phone's home screen. iOS reads the icon and
 * title from the Apple tags in the root layout; Android and desktop read this.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LucApp",
    short_name: "LucApp",
    description:
      "Tus finanzas y tus comidas: gastos, cuentas y deudas; bloques, despensa y lo que comes.",
    lang: "es",
    // "/" opens the last app used (finance or meals), see src/proxy.ts.
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
