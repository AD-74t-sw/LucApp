import type { Arrival, ReimbursementKind, ReimbursementStatus } from "../domain/reimbursement";

export const KIND_LABELS: Record<ReimbursementKind, string> = {
  HEALTH_PLAN: "Isapre o Fonasa",
  SUPPLEMENTARY_INSURANCE: "Seguro complementario",
  INSURANCE: "Otro seguro",
  TAX: "Devolución de impuestos",
  PURCHASE: "Compra o servicio",
  OTHER: "Otra",
};

export const STATUS_LABELS: Record<ReimbursementStatus, string> = {
  IN_REVIEW: "En revisión",
  APPROVED: "Por recibir",
  RECEIVED: "Devuelta",
  REJECTED: "Rechazada",
};

export const ARRIVAL_LABELS: Record<Arrival, string> = {
  UPCOMING: "Próxima",
  IN_WINDOW: "Llega en estos días",
  LATE: "Atrasada",
};
