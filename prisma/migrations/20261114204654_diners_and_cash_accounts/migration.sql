-- AlterEnum
ALTER TYPE "app"."CardNetwork" ADD VALUE 'DINERS';


-- Every user has a cash account ("Efectivo") in their base currency.
-- New users get it when they sign up; this creates it for existing ones.
INSERT INTO "app"."financial_accounts" ("id", "userId", "type", "name", "currency", "updatedAt")
SELECT gen_random_uuid(), s."userId", 'CASH', 'Efectivo', s."baseCurrency", CURRENT_TIMESTAMP
FROM "app"."user_settings" s
WHERE NOT EXISTS (
  SELECT 1 FROM "app"."financial_accounts" a
  WHERE a."userId" = s."userId" AND a."type" = 'CASH'
)
ON CONFLICT ("userId", "name") DO NOTHING;
