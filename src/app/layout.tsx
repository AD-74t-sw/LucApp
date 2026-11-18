import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { THEME_SCRIPT } from "./apps";
import { ThemeSync } from "./theme-sync";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "LucApp", template: "%s · LucApp" },
  description:
    "Tus finanzas y tus comidas: gastos, cuentas y deudas; bloques, despensa y lo que comes.",
  applicationName: "LucApp",
  // Installed from Safari ("Agregar a pantalla de inicio"), open full screen without browser bars.
  appleWebApp: { capable: true, title: "LucApp", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // Draw under the iPhone's rounded corners and home bar; layouts pad with env(safe-area-inset-*).
  viewportFit: "cover",
  // Each app has a fixed theme (see apps.ts); the theme script adjusts this per page.
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script sets data-theme/data-app on <html> before React hydrates.
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        {children}
        <Suspense fallback={null}>
          <ThemeSync />
        </Suspense>
      </body>
    </html>
  );
}
