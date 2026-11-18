-- DropForeignKey
ALTER TABLE "app"."exchange_rates" DROP CONSTRAINT "exchange_rates_userId_fkey";

-- AlterTable
ALTER TABLE "app"."financial_accounts" ADD COLUMN     "secondaryCreditLimit" BIGINT,
ADD COLUMN     "secondaryCurrency" CHAR(3),
ADD COLUMN     "secondaryOpeningBalance" BIGINT NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "app"."exchange_rates";

-- CreateTable
CREATE TABLE "app"."market_rates" (
    "id" UUID NOT NULL,
    "fromCurrency" CHAR(3) NOT NULL,
    "toCurrency" CHAR(3) NOT NULL,
    "date" DATE NOT NULL,
    "rate" DECIMAL(20,6) NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "market_rates_fromCurrency_toCurrency_date_key" ON "app"."market_rates"("fromCurrency", "toCurrency", "date");


-- Only CLP and USD are supported for now; any other currency must not exist.
-- (Checked here so the migration fails loudly instead of the app crashing later.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "app"."financial_accounts" WHERE "currency" NOT IN ('CLP', 'USD'))
     OR EXISTS (SELECT 1 FROM "app"."debts" WHERE "currency" NOT IN ('CLP', 'USD')) THEN
    RAISE EXCEPTION 'Existen cuentas o deudas en monedas distintas de CLP/USD';
  END IF;
END
$$;
