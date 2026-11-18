-- CreateEnum
CREATE TYPE "app"."ReimbursementKind" AS ENUM ('HEALTH_PLAN', 'SUPPLEMENTARY_INSURANCE', 'INSURANCE', 'TAX', 'PURCHASE', 'OTHER');

-- CreateEnum
CREATE TYPE "app"."ReimbursementStatus" AS ENUM ('IN_REVIEW', 'APPROVED', 'RECEIVED', 'REJECTED');

-- CreateTable
CREATE TABLE "app"."reimbursements" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "app"."ReimbursementKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "requestedOn" DATE NOT NULL,
    "estimatedAmount" BIGINT,
    "status" "app"."ReimbursementStatus" NOT NULL DEFAULT 'IN_REVIEW',
    "amount" BIGINT,
    "expectedFrom" DATE,
    "expectedTo" DATE,
    "receivedOn" DATE,
    "receivedAmount" BIGINT,
    "note" TEXT,
    "transactionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reimbursements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reimbursements_transactionId_key" ON "app"."reimbursements"("transactionId");

-- CreateIndex
CREATE INDEX "reimbursements_userId_status_idx" ON "app"."reimbursements"("userId", "status");

-- AddForeignKey
ALTER TABLE "app"."reimbursements" ADD CONSTRAINT "reimbursements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."reimbursements" ADD CONSTRAINT "reimbursements_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "app"."transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
