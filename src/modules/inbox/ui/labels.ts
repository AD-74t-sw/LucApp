import type { NoticeChannel, NoticeKind, NoticeStatus } from "../domain/notice";
import type { TransferReason } from "../application/suggestions";

export const NOTICE_KIND_LABELS: Record<NoticeKind, string> = {
  PURCHASE: "Compra",
  TRANSFER_OUT: "Transferencia enviada",
  TRANSFER_IN: "Transferencia recibida",
  CARD_PAYMENT: "Pago de tarjeta",
  WITHDRAWAL: "Giro",
  DEPOSIT: "Abono",
  UNKNOWN: "Movimiento",
};

export const CHANNEL_LABELS: Record<NoticeChannel, string> = {
  EMAIL: "Correo",
  SMS: "SMS",
  PUSH: "Notificación",
  MANUAL: "Pegado",
  WALLET: "Apple Pay",
};

export const STATUS_LABELS: Record<NoticeStatus, string> = {
  PENDING: "Por revisar",
  RECORDED: "Registrado",
  DISMISSED: "Descartado",
  DUPLICATE: "Repetido",
};

export const TRANSFER_REASON_LABELS: Record<TransferReason, string> = {
  LEARNED: "Así lo registraste la última vez",
  OWN_NAME: "El destinatario tiene tu nombre",
  PAIRED: "Llegó el mismo monto a otra de tus cuentas",
  CARD_PAYMENT: "Es un pago de tarjeta",
  WITHDRAWAL: "Es un giro: pasa a tu efectivo",
};
