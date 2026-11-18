import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_CONFIG, THEME_SCRIPT, resolveApp } from "./apps";

describe("resolveApp", () => {
  it("follows the URL, and shared pages follow the last app", () => {
    expect(resolveApp("/meals", null, APP_CONFIG)).toBe("meals");
    expect(resolveApp("/meals/pantry", "finance", APP_CONFIG)).toBe("meals");
    expect(resolveApp("/mealsx", null, APP_CONFIG)).toBe("finance");
    expect(resolveApp("/dashboard", "meals", APP_CONFIG)).toBe("finance");
    expect(resolveApp("/settings", "meals", APP_CONFIG)).toBe("meals");
    expect(resolveApp("/settings", null, APP_CONFIG)).toBe("finance");
    expect(resolveApp("/login", "meals", APP_CONFIG)).toBeNull();
    expect(resolveApp("/", "meals", APP_CONFIG)).toBeNull();
  });
});

/** Runs the inline <head> script against a fake page and returns what it set. */
function runScript(pathname: string, cookie: string, prefersDark = false) {
  const dataset: Record<string, string> = {};
  const meta = { content: "", setAttribute: (_: string, value: string) => (meta.content = value) };
  const document = {
    cookie,
    documentElement: { dataset },
    querySelectorAll: () => [meta],
  };
  vi.stubGlobal("document", document);
  vi.stubGlobal("location", { pathname });
  vi.stubGlobal("window", { matchMedia: () => ({ matches: prefersDark }) });
  new Function(THEME_SCRIPT)();
  return { dataset, themeColor: meta.content, cookie: document.cookie };
}

describe("theme script", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is self-contained and gives each app its fixed theme", () => {
    expect(runScript("/meals", "")).toMatchObject({
      dataset: { theme: "light", app: "meals" },
      themeColor: "#ffffff",
    });
    expect(runScript("/dashboard", "", false)).toMatchObject({
      dataset: { theme: "dark", app: "finance" },
      themeColor: "#0d0d0d",
    });
  });

  it("remembers the app, and shared pages keep it", () => {
    expect(runScript("/meals/blocks", "").cookie).toContain("lucapp-app=meals");
    expect(runScript("/settings", "lucapp-app=meals").dataset).toMatchObject({ theme: "light" });
  });

  it("follows the system outside the apps", () => {
    expect(runScript("/login", "lucapp-app=meals", true).dataset).toEqual({ theme: "dark" });
    expect(runScript("/login", "lucapp-app=meals", false).dataset).toEqual({ theme: "light" });
  });
});
