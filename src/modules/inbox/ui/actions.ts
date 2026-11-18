"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/modules/identity";
import { expenseSchema, incomeSchema, transferSchema } from "@/modules/transactions";
import type { ActionState } from "@/shared/ui/action-state";
import { errorState, parseForm, successState } from "@/shared/ui/server/form";
import { ingestSchema, tokenNameSchema } from "../application/inbox-schemas";
import { type IngestOutcome, ingestNotice } from "../application/ingest-notice";
import { createIngestToken, revokeIngestToken } from "../application/ingest-tokens";
import {
  dismissNotice,
  recordNoticeAsExpense,
  recordNoticeAsIncome,
  recordNoticeAsTransfer,
  restoreNotice,
} from "../application/review-notices";

const uuid = z.uuid();

function refresh() {
  revalidatePath("/", "layout");
}

export async function recordNoticeExpenseAction(
  noticeId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(expenseSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await recordNoticeAsExpense(user.id, uuid.parse(noticeId), parsed.value);
  if (!result.ok) return errorState(result.error);
  refresh();
  return successState("Gasto registrado.");
}

export async function recordNoticeIncomeAction(
  noticeId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(incomeSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await recordNoticeAsIncome(user.id, uuid.parse(noticeId), parsed.value);
  if (!result.ok) return errorState(result.error);
  refresh();
  return successState("Ingreso registrado.");
}

export async function recordNoticeTransferAction(
  noticeId: string,
  pairedNoticeId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(transferSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await recordNoticeAsTransfer(
    user.id,
    uuid.parse(noticeId),
    parsed.value,
    pairedNoticeId ? uuid.parse(pairedNoticeId) : null,
    user.timezone,
  );
  if (!result.ok) return errorState(result.error);
  refresh();
  return successState(
    result.value.recorded > 1
      ? "Transferencia registrada; también se cerró el aviso de la otra cuenta."
      : "Transferencia registrada.",
  );
}

export async function dismissNoticeAction(id: string, _prev: ActionState): Promise<ActionState> {
  const user = await requireUser();
  const result = await dismissNotice(user.id, uuid.parse(id));
  if (!result.ok) return errorState(result.error);
  refresh();
  return successState("Aviso descartado.");
}

export async function restoreNoticeAction(id: string, _prev: ActionState): Promise<ActionState> {
  const user = await requireUser();
  const result = await restoreNotice(user.id, uuid.parse(id));
  if (!result.ok) return errorState(result.error);
  refresh();
  return successState("El aviso volvió a la bandeja.");
}

const OUTCOME_MESSAGES: Record<IngestOutcome, string> = {
  CREATED: "Aviso agregado a la bandeja.",
  DUPLICATE: "Ese movimiento ya había llegado por otro canal; quedó unido al anterior.",
  ALREADY_RECORDED: "Es la otra parte de una transferencia que ya registraste.",
  RESENT: "Ese aviso ya estaba en la bandeja.",
  IGNORED: "No se pudo leer ese aviso.",
};

/** A notice pasted by hand (for example, the text of a push notification). */
export async function pasteNoticeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(ingestSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  // Pasted by hand: kept even when it does not read as a movement.
  const { outcome } = await ingestNotice(user.id, parsed.value, { keepAll: true });
  refresh();
  return successState(OUTCOME_MESSAGES[outcome]);
}

export type TokenState =
  | { status: "idle" }
  | { status: "created"; token: string; name: string }
  | {
      status: "error";
      message: string;
    };

export async function createTokenAction(
  _prev: TokenState,
  formData: FormData,
): Promise<TokenState> {
  const parsed = tokenNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Nombre inválido." };
  }
  const user = await requireUser();
  const { token, summary } = await createIngestToken(user.id, parsed.data.name);
  revalidatePath("/inbox/connect");
  return { status: "created", token, name: summary.name };
}

export async function revokeTokenAction(id: string, _prev: ActionState): Promise<ActionState> {
  const user = await requireUser();
  const result = await revokeIngestToken(user.id, uuid.parse(id));
  if (!result.ok) return errorState(result.error);
  revalidatePath("/inbox/connect");
  return successState("Token eliminado: los atajos que lo usaban dejarán de funcionar.");
}
