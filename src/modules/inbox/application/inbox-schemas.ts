import { z } from "zod";
import { CURRENCY_CODES } from "@/shared/domain";
import { NOTICE_CHANNELS, type NoticeChannel } from "../domain/notice";

const CHANNEL_ALIASES: Record<string, NoticeChannel> = {
  email: "EMAIL",
  correo: "EMAIL",
  mail: "EMAIL",
  sms: "SMS",
  mensaje: "SMS",
  mensajes: "SMS",
  push: "PUSH",
  notificacion: "PUSH",
  notificaciones: "PUSH",
  notification: "PUSH",
  manual: "MANUAL",
  wallet: "WALLET",
  applepay: "WALLET",
  "apple pay": "WALLET",
  transaccion: "WALLET",
};

const channel = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const key = value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return CHANNEL_ALIASES[key] ?? value.trim().toUpperCase();
  },
  z.enum(NOTICE_CHANNELS, {
    error: "Canal desconocido: usa PUSH, WALLET, SMS, EMAIL o MANUAL.",
  }),
);

const optionalString = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? value.trim() : undefined),
    z.string().max(max).optional(),
  );

/** When the notice arrived. Shortcuts send dates in many formats: unreadable ones are ignored. */
const receivedAt = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}, z.date().optional());

const filled = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

/**
 * Shortcuts hand over different pieces depending on the trigger: a notification
 * has `title`, `body` and the `app` it came from; a message or an email has
 * `text`, `sender` and `subject`. Both shapes end up as text + sender + subject.
 */
function normalize(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const fields = raw as Record<string, unknown>;
  const text = filled(fields.text);
  const title = filled(fields.title);
  const body = filled(fields.body);
  return {
    ...fields,
    text: text ?? ([title, body].filter(Boolean).join("\n") || undefined),
    sender: filled(fields.sender) ?? filled(fields.app),
    // Shortcuts may send the amount of a payment as a number.
    amount: typeof fields.amount === "number" ? String(fields.amount) : fields.amount,
    // A title sent next to the text works like an email subject.
    subject: filled(fields.subject) ?? (text ? title : undefined),
  };
}

const MISSING_TEXT = "Falta el texto del aviso (text).";

/**
 * Body of POST /api/inbox (and of the "paste a notice" form).
 * Apple Pay payments (channel WALLET) come as `amount`, `merchant` and `card`
 * instead of a text.
 */
export const ingestSchema = z.preprocess(
  normalize,
  z
    .object({
      text: z.preprocess(
        (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
        z.string().trim().max(200_000, "El aviso es demasiado largo.").optional(),
      ),
      channel,
      sender: optionalString(320),
      subject: optionalString(500),
      receivedAt,
      amount: optionalString(60),
      merchant: optionalString(200),
      card: optionalString(120),
      currency: z.preprocess(
        (value) => (typeof value === "string" ? value.trim().toUpperCase() || undefined : value),
        z.enum(CURRENCY_CODES).optional().catch(undefined),
      ),
    })
    .superRefine((value, context) => {
      if (value.channel !== "WALLET" && !value.text) {
        context.addIssue({ code: "custom", path: ["text"], message: MISSING_TEXT });
      }
      if (value.channel === "WALLET" && !value.amount && !value.text) {
        context.addIssue({
          code: "custom",
          path: ["amount"],
          message: "Falta el monto del pago (amount).",
        });
      }
    }),
);
export type IngestInput = z.infer<typeof ingestSchema>;

export const tokenNameSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre, por ejemplo «iPhone».").max(60),
});
