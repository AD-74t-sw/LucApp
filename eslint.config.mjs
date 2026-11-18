import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Architecture rules, enforced by `pnpm lint`.
 *
 * 1. Modules form a DAG. A module may only import the modules listed here.
 * 2. Across modules, only the public entry points are importable:
 *    `@/modules/<name>` (server API) and `@/modules/<name>/ui` (components).
 * 3. Layers inside a module: ui -> application -> infrastructure -> domain.
 *    The domain is pure TypeScript (no Prisma, Next, React or Supabase).
 * 4. `src/shared` never depends on modules; `src/app` only does routing and
 *    reaches data through modules, never Prisma directly.
 */
const MODULE_DEPENDENCIES = {
  identity: [],
  categories: ["identity"],
  accounts: ["identity"],
  currencies: ["identity"],
  transactions: ["identity", "accounts", "categories", "currencies"],
  debts: ["identity", "accounts", "categories", "transactions"],
  metrics: ["identity", "accounts", "categories", "currencies", "debts", "transactions"],
  access: ["identity", "categories", "accounts"],
  inbox: ["identity", "accounts", "categories", "transactions"],
  reimbursements: ["identity", "accounts", "categories", "transactions"],
  notifications: ["identity"],
  meals: ["identity", "notifications"],
};

const MODULES = Object.keys(MODULE_DEPENDENCIES);

const deepImport = {
  group: ["@/modules/*/*", "!@/modules/*/ui"],
  message:
    "Import other modules only through their public API: @/modules/<name> or @/modules/<name>/ui.",
};

const frameworkInDomain = {
  group: [
    "next",
    "next/*",
    "react",
    "react-dom",
    "@prisma/*",
    "@/generated/*",
    "@supabase/*",
    "zod",
  ],
  message: "The domain layer is plain TypeScript: no framework, database or validation libraries.",
};

const LAYER_RULES = {
  domain: [
    frameworkInDomain,
    {
      group: [
        "../application/*",
        "../infrastructure/*",
        "../ui/*",
        "@/shared/infrastructure*",
        "@/shared/ui*",
        "@/shared/application*",
      ],
      message: "The domain cannot depend on outer layers.",
    },
  ],
  infrastructure: [
    {
      group: ["../application/*", "../ui/*", "@/shared/ui*"],
      message: "Infrastructure cannot depend on application or ui.",
    },
  ],
  application: [
    {
      group: ["../ui/*", "@/shared/ui*", "react", "react-dom"],
      message: "Application cannot depend on the ui layer.",
    },
  ],
  ui: [
    {
      regex: `^@/modules/(${MODULES.join("|")})$`,
      allowTypeImports: true,
      message:
        "UI files may only import types from another module's server API. Use @/modules/<name>/ui for components and constants, so server code never reaches the browser bundle.",
    },
  ],
};

function forbiddenModules(name) {
  const allowed = new Set([name, ...MODULE_DEPENDENCIES[name]]);
  const forbidden = MODULES.filter((m) => !allowed.has(m));
  return forbidden.length === 0
    ? []
    : [
        {
          group: forbidden.flatMap((m) => [`@/modules/${m}`, `@/modules/${m}/*`]),
          message: `Module "${name}" may only depend on: ${MODULE_DEPENDENCIES[name].join(", ") || "nothing"}.`,
        },
      ];
}

/** One config object per (module, layer): flat config does not merge rule options. */
const moduleBoundaries = MODULES.flatMap((name) => {
  const layerConfigs = Object.entries(LAYER_RULES).map(([layer, patterns]) => ({
    files: [`src/modules/${name}/${layer}/**/*.{ts,tsx}`],
    // Server Actions run only on the server, so they may call other modules (e.g. requireUser).
    ignores: layer === "ui" ? [`src/modules/${name}/ui/actions.ts`] : [],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            deepImport,
            ...forbiddenModules(name),
            // The domain may reference other modules' types, never their code.
            ...(layer === "domain"
              ? patterns
                  .map((p) => p)
                  .concat([
                    {
                      group: MODULES.map((m) => `@/modules/${m}`),
                      allowTypeImports: true,
                      message: "The domain may only import types from other modules.",
                    },
                  ])
              : patterns),
          ],
        },
      ],
    },
  }));
  return [
    ...layerConfigs,
    {
      files: [`src/modules/${name}/ui/actions.ts`],
      rules: {
        "no-restricted-imports": ["error", { patterns: [deepImport, ...forbiddenModules(name)] }],
      },
    },
    {
      files: [`src/modules/${name}/*.{ts,tsx}`],
      rules: {
        "no-restricted-imports": ["error", { patterns: [deepImport, ...forbiddenModules(name)] }],
      },
    },
  ];
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    ".agents/**",
    ".claude/**",
    ".windsurf/**",
  ]),
  {
    // The service worker runs in the browser's worker scope, not in a module.
    files: ["public/sw.js"],
    languageOptions: {
      globals: { self: "readonly", clients: "readonly", URL: "readonly", console: "readonly" },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    },
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*", "@/modules/*/*"],
              message: "Shared code cannot depend on modules.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/proxy.ts", "src/instrumentation.ts", "src/scheduler.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            deepImport,
            {
              group: ["@/generated/*", "@/shared/infrastructure*", "@prisma/*"],
              message: "Routes reach data through modules, never through Prisma directly.",
            },
          ],
        },
      ],
    },
  },
  ...moduleBoundaries,
]);

export default eslintConfig;
