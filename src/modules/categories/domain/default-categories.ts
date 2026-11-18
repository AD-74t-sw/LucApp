import type { CategoryKind, CostType, Necessity } from "./category";

export type CategorySeed = Readonly<{
  name: string;
  kind: CategoryKind;
  color: string;
  costType?: CostType;
  necessity?: Necessity;
  children?: readonly { name: string; costType?: CostType; necessity?: Necessity }[];
}>;

/** Categories created for every new user. Users can rename, archive or delete them. */
export const DEFAULT_CATEGORIES: readonly CategorySeed[] = [
  {
    name: "Vivienda",
    kind: "EXPENSE",
    color: "#2f5bd3",
    costType: "FIXED",
    necessity: "ESSENTIAL",
    children: [
      { name: "Arriendo o dividendo" },
      { name: "Gastos comunes" },
      { name: "Mantención", costType: "VARIABLE" },
    ],
  },
  {
    name: "Servicios básicos",
    kind: "EXPENSE",
    color: "#0f7d9c",
    costType: "FIXED",
    necessity: "ESSENTIAL",
    children: [{ name: "Luz" }, { name: "Agua" }, { name: "Gas" }, { name: "Internet y teléfono" }],
  },
  {
    name: "Alimentación",
    kind: "EXPENSE",
    color: "#0f8a6a",
    costType: "VARIABLE",
    necessity: "ESSENTIAL",
    children: [
      { name: "Supermercado" },
      { name: "Restaurantes", necessity: "DISCRETIONARY" },
      { name: "Delivery", necessity: "DISCRETIONARY" },
    ],
  },
  {
    name: "Transporte",
    kind: "EXPENSE",
    color: "#b26a00",
    costType: "VARIABLE",
    necessity: "ESSENTIAL",
    children: [
      { name: "Combustible" },
      { name: "Transporte público" },
      { name: "Taxi y apps" },
      { name: "Estacionamiento y peajes" },
    ],
  },
  {
    name: "Salud",
    kind: "EXPENSE",
    color: "#c2372d",
    costType: "VARIABLE",
    necessity: "ESSENTIAL",
    children: [
      { name: "Plan de salud", costType: "FIXED" },
      { name: "Farmacia" },
      { name: "Consultas y exámenes" },
    ],
  },
  {
    name: "Educación",
    kind: "EXPENSE",
    color: "#7a4fd1",
    costType: "FIXED",
    necessity: "ESSENTIAL",
  },
  {
    name: "Entretención",
    kind: "EXPENSE",
    color: "#c2457a",
    costType: "VARIABLE",
    necessity: "DISCRETIONARY",
    children: [
      { name: "Suscripciones", costType: "FIXED" },
      { name: "Salidas" },
      { name: "Viajes" },
    ],
  },
  {
    name: "Compras",
    kind: "EXPENSE",
    color: "#8a5a3c",
    costType: "VARIABLE",
    necessity: "DISCRETIONARY",
    children: [{ name: "Ropa" }, { name: "Tecnología" }, { name: "Hogar" }],
  },
  {
    name: "Cuidado personal",
    kind: "EXPENSE",
    color: "#5c7a1f",
    costType: "VARIABLE",
    necessity: "DISCRETIONARY",
  },
  { name: "Seguros", kind: "EXPENSE", color: "#0f7d9c", costType: "FIXED", necessity: "ESSENTIAL" },
  {
    name: "Impuestos y comisiones",
    kind: "EXPENSE",
    color: "#4b5563",
    costType: "VARIABLE",
    necessity: "ESSENTIAL",
  },
  {
    name: "Regalos y donaciones",
    kind: "EXPENSE",
    color: "#c2457a",
    costType: "VARIABLE",
    necessity: "DISCRETIONARY",
  },
  { name: "Otros gastos", kind: "EXPENSE", color: "#4b5563", costType: "VARIABLE" },
  { name: "Sueldo", kind: "INCOME", color: "#0f8a6a" },
  { name: "Honorarios", kind: "INCOME", color: "#2f5bd3" },
  { name: "Inversiones", kind: "INCOME", color: "#7a4fd1" },
  { name: "Reembolsos", kind: "INCOME", color: "#b26a00" },
  { name: "Otros ingresos", kind: "INCOME", color: "#4b5563" },
];
