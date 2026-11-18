// Public server API of the inbox module: bank notices received from app
// notifications, Apple Pay, SMS or email.
export {
  NOTICE_CHANNELS,
  type BankNotice,
  type NoticeChannel,
  type NoticeKind,
  type NoticeStatus,
} from "./domain/notice";
export { BANK_PROFILES } from "./domain/bank-profiles";
export { ingestSchema, type IngestInput } from "./application/inbox-schemas";
export { ingestNotice, type IngestOutcome } from "./application/ingest-notice";
export {
  authenticateIngestToken,
  ingestEndpoint,
  listIngestTokens,
} from "./application/ingest-tokens";
export {
  countPendingNotices,
  listPendingNotices,
  listReviewedNotices,
  type InboxItem,
} from "./application/inbox-queries";
export type { ReviewSuggestion, TransferReason } from "./application/suggestions";
export type { IngestTokenSummary } from "./infrastructure/token-repository";
export type { NoticeWithCopies } from "./infrastructure/notice-repository";
