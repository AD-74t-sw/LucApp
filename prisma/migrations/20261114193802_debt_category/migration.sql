-- AlterTable
ALTER TABLE "app"."debts" ADD COLUMN     "categoryId" UUID,
ADD COLUMN     "costType" "app"."CostType",
ADD COLUMN     "necessity" "app"."Necessity";

-- CreateIndex
CREATE INDEX "debts_userId_date_idx" ON "app"."debts"("userId", "date");

-- AddForeignKey
ALTER TABLE "app"."debts" ADD CONSTRAINT "debts_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "app"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
