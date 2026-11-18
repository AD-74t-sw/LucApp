-- Accounts are identified by their institution (logo); they no longer have a color.
ALTER TABLE "app"."financial_accounts" DROP COLUMN "color";
