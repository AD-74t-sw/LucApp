import { type NextRequest, NextResponse } from "next/server";
import { authenticateIngestToken, ingestNotice, ingestSchema } from "@/modules/inbox";

const MAX_BODY_BYTES = 256 * 1024;

const MESSAGES = {
  CREATED: "Aviso guardado en LucApp.",
  DUPLICATE: "Ya había llegado por otro canal: quedó unido al anterior.",
  ALREADY_RECORDED: "Es la otra parte de una transferencia ya registrada.",
  RESENT: "Ese aviso ya estaba guardado.",
  IGNORED: "No parece un movimiento: no se guardó.",
} as const;

/**
 * Receives a bank notice from an iOS Shortcut (or an email forwarder).
 *
 *   POST /api/inbox
 *   Authorization: Bearer lucapp_…
 *
 *   Notification of the bank's app:
 *     { "channel": "PUSH", "text": "…", "sender": "Santander" }   (or title + body + app)
 *   Apple Pay payment:
 *     { "channel": "WALLET", "amount": "$12.990", "merchant": "JUMBO", "card": "Visa …" }
 *   SMS or email:
 *     { "channel": "SMS" | "EMAIL", "text": "…", "sender": "…", "subject": "…" }
 *
 * JSON, form fields or plain text (with ?channel=SMS) are accepted, because
 * that is what Shortcuts can send. Notifications that are not movements
 * (offers, codes, logins) answer IGNORED and are not stored.
 */
export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;
  const userId = await authenticateIngestToken(token);
  if (!userId) {
    return NextResponse.json({ error: "Token inválido o ausente." }, { status: 401 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "El aviso es demasiado grande." }, { status: 413 });
  }

  const body = await readBody(request);
  if (body === null) {
    return NextResponse.json({ error: "No se pudo leer el cuerpo del aviso." }, { status: 400 });
  }
  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Aviso inválido." },
      { status: 400 },
    );
  }

  const { notice, outcome } = await ingestNotice(userId, parsed.data);
  return NextResponse.json(
    {
      outcome,
      message: MESSAGES[outcome],
      notice: notice && {
        id: notice.id,
        kind: notice.kind,
        institution: notice.institution,
        amount: notice.amount,
        currency: notice.currency,
        merchant: notice.merchant,
      },
    },
    { status: outcome === "CREATED" ? 201 : 200 },
  );
}

async function readBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  const query = Object.fromEntries(request.nextUrl.searchParams);
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      const json: unknown = await request.json();
      return typeof json === "object" && json !== null ? { ...query, ...json } : null;
    }
    if (type.includes("form")) {
      const form = await request.formData();
      const fields = Object.fromEntries(
        [...form.entries()].filter(([, value]) => typeof value === "string"),
      );
      return { ...query, ...fields };
    }
    return { ...query, text: await request.text() };
  } catch {
    return null;
  }
}
