"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { APP_CONFIG, applyTheme, resolveApp } from "./apps";

/**
 * Keeps the theme in sync on client navigations (the inline script in the
 * root layout only runs on the first load) and when the system theme changes
 * on pages outside the apps (login, register).
 */
export function ThemeSync() {
  const pathname = usePathname();
  useEffect(() => {
    applyTheme(APP_CONFIG, resolveApp);
  }, [pathname]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme(APP_CONFIG, resolveApp);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return null;
}
