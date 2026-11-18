import {
  Apple,
  ArrowLeftRight,
  CalendarClock,
  Clock,
  HandCoins,
  Inbox,
  LayoutDashboard,
  ReceiptText,
  Refrigerator,
  Settings,
  Tags,
  Utensils,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import type { AppId } from "../apps";

/** Finance sections, shared by the sidebar, the phone bar and the "Más" page. */
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/transactions", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/inbox", label: "Por revisar", icon: Inbox },
  { href: "/accounts", label: "Cuentas", icon: Wallet },
  { href: "/installments", label: "Cuotas", icon: CalendarClock },
  { href: "/debts", label: "Deudas", icon: HandCoins },
  { href: "/reimbursements", label: "Devoluciones", icon: ReceiptText },
  { href: "/categories", label: "Categorías", icon: Tags },
] as const;

/** Meals sections: all four fit in the phone bar, so this app has no "Más". */
export const MEALS_ITEMS = [
  { href: "/meals", label: "Hoy", icon: Utensils },
  { href: "/meals/pantry", label: "Despensa", icon: Refrigerator },
  { href: "/meals/foods", label: "Catálogo", icon: Apple },
  { href: "/meals/blocks", label: "Bloques", icon: Clock },
] as const;

export const SETTINGS_ITEM = { href: "/settings", label: "Ajustes", icon: Settings } as const;

export type NavHref = (typeof NAV_ITEMS)[number]["href"] | (typeof MEALS_ITEMS)[number]["href"];

/** The apps the switcher in the bottom bar (and the sidebar) moves between. */
export const APPS: Record<
  AppId,
  { label: string; description: string; icon: typeof Wallet; home: string }
> = {
  finance: {
    label: "Finanzas",
    description: "Gastos, cuentas, cuotas y deudas.",
    icon: Wallet,
    home: "/dashboard",
  },
  meals: {
    label: "Comidas",
    description: "Bloques del día, despensa y lo que comes.",
    icon: UtensilsCrossed,
    home: "/meals",
  },
};

/** Back link of the sections that phones open from "Más" (desktops have them in the sidebar). */
export const MORE_BACK = { href: "/menu", label: "Más", phoneOnly: true } as const;

/** Back link of shared pages (settings) when they are opened from the meals app. */
export const MEALS_BACK = { href: "/meals", label: "Comidas", phoneOnly: true } as const;

/**
 * Sections that are also in the phone's bottom bar get this query when opened
 * from "Más", so they know to show the back button.
 */
export const FROM_MORE = { param: "from", value: "menu" } as const;
