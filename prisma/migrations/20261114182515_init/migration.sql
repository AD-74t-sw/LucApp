-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app";

-- CreateEnum
CREATE TYPE "app"."AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'CASH', 'DIGITAL_WALLET', 'CREDIT_CARD');

-- CreateEnum
CREATE TYPE "app"."CardNetwork" AS ENUM ('VISA', 'MASTERCARD', 'AMEX', 'OTHER');

-- CreateEnum
CREATE TYPE "app"."CategoryKind" AS ENUM ('EXPENSE', 'INCOME');

-- CreateEnum
CREATE TYPE "app"."CostType" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "app"."Necessity" AS ENUM ('ESSENTIAL', 'DISCRETIONARY');

-- CreateEnum
CREATE TYPE "app"."TransactionKind" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER', 'DEBT');

-- CreateEnum
CREATE TYPE "app"."DebtDirection" AS ENUM ('I_OWE', 'THEY_OWE');

-- CreateTable
CREATE TABLE "app"."users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."user_settings" (
    "userId" UUID NOT NULL,
    "baseCurrency" CHAR(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "app"."financial_accounts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "app"."AccountType" NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT,
    "currency" CHAR(3) NOT NULL,
    "openingBalance" BIGINT NOT NULL DEFAULT 0,
    "creditLimit" BIGINT,
    "closingDay" INTEGER,
    "dueDay" INTEGER,
    "color" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."cards" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "network" "app"."CardNetwork" NOT NULL,
    "last4" CHAR(4),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."categories" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "parentId" UUID,
    "name" TEXT NOT NULL,
    "kind" "app"."CategoryKind" NOT NULL,
    "color" TEXT NOT NULL,
    "defaultCostType" "app"."CostType",
    "defaultNecessity" "app"."Necessity",
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."transactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "cardId" UUID,
    "kind" "app"."TransactionKind" NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "note" TEXT,
    "categoryId" UUID,
    "costType" "app"."CostType",
    "necessity" "app"."Necessity",
    "transferGroupId" UUID,
    "installmentPlanId" UUID,
    "installmentNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."installment_plans" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "cardId" UUID,
    "categoryId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "totalAmount" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "firstChargeDate" DATE NOT NULL,
    "costType" "app"."CostType",
    "necessity" "app"."Necessity",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."people" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."debts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "direction" "app"."DebtDirection" NOT NULL,
    "principal" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "date" DATE NOT NULL,
    "dueDate" DATE,
    "description" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3),
    "transactionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."debt_payments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "debtId" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "transactionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."exchange_rates" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fromCurrency" CHAR(3) NOT NULL,
    "toCurrency" CHAR(3) NOT NULL,
    "date" DATE NOT NULL,
    "rate" DECIMAL(20,10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "app"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "financial_accounts_userId_name_key" ON "app"."financial_accounts"("userId", "name");

-- CreateIndex
CREATE INDEX "cards_userId_idx" ON "app"."cards"("userId");

-- CreateIndex
CREATE INDEX "cards_accountId_idx" ON "app"."cards"("accountId");

-- CreateIndex
CREATE INDEX "categories_userId_kind_idx" ON "app"."categories"("userId", "kind");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "app"."categories"("parentId");

-- CreateIndex
CREATE INDEX "transactions_userId_date_idx" ON "app"."transactions"("userId", "date");

-- CreateIndex
CREATE INDEX "transactions_userId_categoryId_date_idx" ON "app"."transactions"("userId", "categoryId", "date");

-- CreateIndex
CREATE INDEX "transactions_accountId_date_idx" ON "app"."transactions"("accountId", "date");

-- CreateIndex
CREATE INDEX "transactions_transferGroupId_idx" ON "app"."transactions"("transferGroupId");

-- CreateIndex
CREATE INDEX "transactions_installmentPlanId_idx" ON "app"."transactions"("installmentPlanId");

-- CreateIndex
CREATE INDEX "installment_plans_userId_idx" ON "app"."installment_plans"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "people_userId_name_key" ON "app"."people"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "debts_transactionId_key" ON "app"."debts"("transactionId");

-- CreateIndex
CREATE INDEX "debts_userId_personId_idx" ON "app"."debts"("userId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "debt_payments_transactionId_key" ON "app"."debt_payments"("transactionId");

-- CreateIndex
CREATE INDEX "debt_payments_debtId_idx" ON "app"."debt_payments"("debtId");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_userId_fromCurrency_toCurrency_date_key" ON "app"."exchange_rates"("userId", "fromCurrency", "toCurrency", "date");

-- AddForeignKey
ALTER TABLE "app"."user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."financial_accounts" ADD CONSTRAINT "financial_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."cards" ADD CONSTRAINT "cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."cards" ADD CONSTRAINT "cards_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "app"."financial_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "app"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "app"."financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "app"."cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "app"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_installmentPlanId_fkey" FOREIGN KEY ("installmentPlanId") REFERENCES "app"."installment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."installment_plans" ADD CONSTRAINT "installment_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."installment_plans" ADD CONSTRAINT "installment_plans_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "app"."financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."installment_plans" ADD CONSTRAINT "installment_plans_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "app"."cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."installment_plans" ADD CONSTRAINT "installment_plans_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "app"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."people" ADD CONSTRAINT "people_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."debts" ADD CONSTRAINT "debts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."debts" ADD CONSTRAINT "debts_personId_fkey" FOREIGN KEY ("personId") REFERENCES "app"."people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."debts" ADD CONSTRAINT "debts_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "app"."transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."debt_payments" ADD CONSTRAINT "debt_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."debt_payments" ADD CONSTRAINT "debt_payments_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "app"."debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."debt_payments" ADD CONSTRAINT "debt_payments_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "app"."transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."exchange_rates" ADD CONSTRAINT "exchange_rates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
