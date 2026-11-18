import type { ParsedNotice } from "./notice";
import { plain } from "./text";

/**
 * Bank apps notify about much more than movements: offers, login alerts,
 * one-time codes, statements ready… Notifications are forwarded wholesale by
 * the Shortcut, so the ones that are not a movement are dropped on arrival.
 */
const PROMOTION =
  /\bdescuentos?\b|\bdctos?\b|\b\d{1,2} ?% ?(?:de )?(?:dcto|descuento|off)\b|\bofertas?\b|\bpromo(?:cion|ciones)?\b|\baprovecha\b|\bpre-?aprobad[oa]\b|\bsorteo\b|\bconcurso\b|\bparticipa\b|\bcuotas sin interes\b|\bbeneficios?\b|\bcashback\b|\bsolicita(?:lo|la)?\b|\bcontrata\b|\bsimula\b|\bte ofrecemos\b|\bhasta (?:el )?\d{1,2} de\b/;

const SECURITY =
  /\bclave (?:dinamica|de seguridad|temporal|de acceso)\b|\btu clave\b|\bcodigo de (?:verificacion|seguridad|autorizacion|confirmacion|acceso)\b|\bcontrasena\b|\binicio de sesion\b|\biniciaste sesion\b|\bnuevo dispositivo\b|\bautoriza(?:r)? (?:la |tu |esta )?(?:compra|transaccion|operacion|transferencia)\b|\bintento de\b|\brechazad[oa]\b|\bno (?:fue|pudo ser) (?:aprobad[oa]|realizad[oa]|procesad[oa])\b/;

/**
 * True when a notification describes a movement that already happened: it
 * says what it was (purchase, transfer…) and for how much, and it is neither
 * an offer nor a security or declined-payment alert.
 */
export function isMovement(parsed: Pick<ParsedNotice, "kind" | "amount">, text: string): boolean {
  if (parsed.amount === null || parsed.kind === "UNKNOWN") return false;
  const lower = plain(text).toLowerCase();
  return !PROMOTION.test(lower) && !SECURITY.test(lower);
}
