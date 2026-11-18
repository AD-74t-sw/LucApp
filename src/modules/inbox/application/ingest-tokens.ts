import { createHash, randomBytes } from "node:crypto";
import { type Result, notFound, ok } from "@/shared/domain";
import { env } from "@/shared/infrastructure";
import { type IngestTokenSummary, tokenRepository } from "../infrastructure/token-repository";

const PREFIX = "lucapp_";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates the secret a Shortcut sends with each notice. It is shown once:
 * only its hash is stored, so a lost token is replaced, not recovered.
 */
export async function createIngestToken(
  userId: string,
  name: string,
): Promise<{ token: string; summary: IngestTokenSummary }> {
  const token = `${PREFIX}${randomBytes(24).toString("base64url")}`;
  const summary = await tokenRepository.create(userId, name, hashToken(token));
  return { token, summary };
}

export function listIngestTokens(userId: string): Promise<IngestTokenSummary[]> {
  return tokenRepository.list(userId);
}

export async function revokeIngestToken(userId: string, id: string): Promise<Result<void>> {
  return (await tokenRepository.delete(userId, id)) ? ok() : notFound("El token");
}

/** The user a token belongs to, or null for unknown or malformed tokens. */
export async function authenticateIngestToken(token: string | null): Promise<string | null> {
  if (!token?.startsWith(PREFIX) || token.length > 100) return null;
  return tokenRepository.use(hashToken(token));
}

/** Public URL Shortcuts send notices to. */
export function ingestEndpoint(): string {
  return new URL("/api/inbox", env().APP_URL).toString();
}
