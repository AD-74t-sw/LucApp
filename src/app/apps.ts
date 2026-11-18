/**
 * LucApp hosts several apps (finance, meals) on one account. The current app
 * follows the URL. Shared pages (settings) keep the last app, which a cookie
 * remembers; the same cookie decides where "/" (and the installed app) opens.
 *
 * Each app has a fixed color theme, so a glance tells which one is open:
 * finance is always dark and meals always light. Pages outside both apps
 * (login, register) follow the system.
 */

export const APP_IDS = ["finance", "meals"] as const;
export type AppId = (typeof APP_IDS)[number];
export type Theme = "light" | "dark";

export const APP_COOKIE = "lucapp-app";

export const APP_HOME: Record<AppId, string> = { finance: "/dashboard", meals: "/meals" };

export function isAppId(value: unknown): value is AppId {
  return typeof value === "string" && (APP_IDS as readonly string[]).includes(value);
}

export type AppConfig = {
  cookie: string;
  /** Prefix of the meals app; everything else in the private area is finance. */
  meals: string;
  /** Pages that belong to whichever app was used last. */
  shared: readonly string[];
  /** Pages outside both apps. */
  outside: readonly string[];
  themes: Record<AppId, Theme>;
  colors: Record<Theme, string>;
};

export const APP_CONFIG: AppConfig = {
  cookie: APP_COOKIE,
  meals: "/meals",
  shared: ["/settings"],
  outside: ["/", "/login", "/register", "/auth"],
  themes: { finance: "dark", meals: "light" },
  colors: { light: "#ffffff", dark: "#0d0d0d" },
};

/**
 * App of a page, or null outside the private area.
 *
 * Self-contained on purpose (no outer references, plain ES2017): it is also
 * serialized into the inline script that sets the theme before first paint.
 */
export function resolveApp(
  pathname: string,
  lastApp: string | null,
  config: AppConfig,
): AppId | null {
  const under = (base: string) =>
    pathname === base || (base !== "/" && pathname.indexOf(base + "/") === 0);
  if (under(config.meals)) return "meals";
  if (config.outside.some(under)) return null;
  if (config.shared.some(under)) return lastApp === "meals" ? "meals" : "finance";
  return "finance";
}

/**
 * Sets `data-theme` and `data-app` on <html>, the browser's theme color, and
 * remembers the app. Self-contained like `resolveApp`, which it receives.
 */
export function applyTheme(config: AppConfig, resolve: typeof resolveApp): void {
  const match = document.cookie.match(new RegExp("(?:^|; )" + config.cookie + "=([^;]*)"));
  const last = match ? decodeURIComponent(match[1] ?? "") : null;
  const app = resolve(location.pathname, last, config);
  const theme: Theme = app
    ? config.themes[app]
    : window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  const root = document.documentElement;
  root.dataset["theme"] = theme;
  if (app) root.dataset["app"] = app;
  else delete root.dataset["app"];
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", config.colors[theme]);
  });
  if (app && app !== last) {
    document.cookie = `${config.cookie}=${app}; path=/; max-age=31536000; samesite=lax`;
  }
}

/** Runs before the first paint (in <head>), so a page never flashes the other theme. */
export const THEME_SCRIPT = `try{(${applyTheme.toString()})(${JSON.stringify(APP_CONFIG)},${resolveApp.toString()})}catch(e){}`;
