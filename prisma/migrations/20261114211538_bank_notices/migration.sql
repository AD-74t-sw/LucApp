-- CreateEnum
CREATE TYPE "app"."NoticeChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'MANUAL');

-- CreateEnum
CREATE TYPE "app"."NoticeKind" AS ENUM ('PURCHASE', 'TRANSFER_OUT', 'TRANSFER_IN', 'CARD_PAYMENT', 'WITHDRAWAL', 'DEPOSIT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "app"."NoticeInstrument" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "app"."NoticeStatus" AS ENUM ('PENDING', 'RECORDED', 'DISMISSED', 'DUPLICATE');

-- CreateTable
CREATE TABLE "app"."bank_notices" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "channel" "app"."NoticeChannel" NOT NULL,
    "sender" TEXT,
    "subject" TEXT,
    "text" TEXT NOT NULL,
    "textHash" CHAR(64) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "institution" TEXT,
    "kind" "app"."NoticeKind" NOT NULL,
    "instrument" "app"."NoticeInstrument",
    "amount" BIGINT,
    "currency" CHAR(3),
    "merchant" TEXT,
    "counterpartyInstitution" TEXT,
    "last4" CHAR(4),
    "occurredOn" DATE,
    "occurredTime" CHAR(5),
    "status" "app"."NoticeStatus" NOT NULL DEFAULT 'PENDING',
    "duplicateOfId" UUID,
    "transactionId" UUID,
    "transferGroupId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."ingest_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingest_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."notice_rules" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "merchantKey" TEXT NOT NULL,
    "kind" "app"."TransactionKind" NOT NULL,
    "categoryId" UUID,
    "accountId" UUID,
    "cardId" UUID,
    "toAccountId" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notice_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_notices_userId_status_receivedAt_idx" ON "app"."bank_notices"("userId", "status", "receivedAt");

-- CreateIndex
CREATE INDEX "bank_notices_userId_textHash_idx" ON "app"."bank_notices"("userId", "textHash");

-- CreateIndex
CREATE INDEX "bank_notices_duplicateOfId_idx" ON "app"."bank_notices"("duplicateOfId");

-- CreateIndex
CREATE UNIQUE INDEX "ingest_tokens_tokenHash_key" ON "app"."ingest_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "ingest_tokens_userId_idx" ON "app"."ingest_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notice_rules_userId_merchantKey_key" ON "app"."notice_rules"("userId", "merchantKey");

-- AddForeignKey
ALTER TABLE "app"."bank_notices" ADD CONSTRAINT "bank_notices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."bank_notices" ADD CONSTRAINT "bank_notices_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "app"."bank_notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."bank_notices" ADD CONSTRAINT "bank_notices_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "app"."transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."ingest_tokens" ADD CONSTRAINT "ingest_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."notice_rules" ADD CONSTRAINT "notice_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
