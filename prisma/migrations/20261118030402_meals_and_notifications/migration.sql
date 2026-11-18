-- CreateEnum
CREATE TYPE "app"."FoodMeasure" AS ENUM ('MASS', 'VOLUME', 'COUNT');

-- CreateEnum
CREATE TYPE "app"."MealStatus" AS ENUM ('PLANNED', 'EATEN');

-- CreateTable
CREATE TABLE "app"."food_categories" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."foods" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "icon" VARCHAR(40),
    "measure" "app"."FoodMeasure" NOT NULL,
    "unitSize" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."meal_blocks" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "startTime" CHAR(5) NOT NULL,
    "endTime" CHAR(5) NOT NULL,
    "notify" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."meal_block_portions" (
    "userId" UUID NOT NULL,
    "blockId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "servings" INTEGER NOT NULL,

    CONSTRAINT "meal_block_portions_pkey" PRIMARY KEY ("blockId","categoryId")
);

-- CreateTable
CREATE TABLE "app"."meals" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "blockId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "app"."MealStatus" NOT NULL DEFAULT 'PLANNED',
    "eatenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."meal_items" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mealId" UUID NOT NULL,
    "foodId" UUID NOT NULL,
    "servings" INTEGER NOT NULL,

    CONSTRAINT "meal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."meal_settings" (
    "userId" UUID NOT NULL,
    "coverageDays" INTEGER NOT NULL DEFAULT 3,
    "shortageAlertTime" CHAR(5) NOT NULL DEFAULT '10:00',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_settings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "app"."push_subscriptions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."notification_deliveries" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "food_categories_userId_name_key" ON "app"."food_categories"("userId", "name");

-- CreateIndex
CREATE INDEX "foods_userId_categoryId_idx" ON "app"."foods"("userId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "foods_userId_name_key" ON "app"."foods"("userId", "name");

-- CreateIndex
CREATE INDEX "meal_blocks_userId_idx" ON "app"."meal_blocks"("userId");

-- CreateIndex
CREATE INDEX "meal_block_portions_userId_idx" ON "app"."meal_block_portions"("userId");

-- CreateIndex
CREATE INDEX "meals_userId_date_idx" ON "app"."meals"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "meals_blockId_date_key" ON "app"."meals"("blockId", "date");

-- CreateIndex
CREATE INDEX "meal_items_mealId_idx" ON "app"."meal_items"("mealId");

-- CreateIndex
CREATE INDEX "meal_items_foodId_idx" ON "app"."meal_items"("foodId");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "app"."push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "app"."push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_deliveries_userId_key_key" ON "app"."notification_deliveries"("userId", "key");

-- AddForeignKey
ALTER TABLE "app"."food_categories" ADD CONSTRAINT "food_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."foods" ADD CONSTRAINT "foods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."foods" ADD CONSTRAINT "foods_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "app"."food_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."meal_blocks" ADD CONSTRAINT "meal_blocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."meal_block_portions" ADD CONSTRAINT "meal_block_portions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."meal_block_portions" ADD CONSTRAINT "meal_block_portions_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "app"."meal_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."meal_block_portions" ADD CONSTRAINT "meal_block_portions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "app"."food_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."meals" ADD CONSTRAINT "meals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."meals" ADD CONSTRAINT "meals_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "app"."meal_blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."meal_items" ADD CONSTRAINT "meal_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."meal_items" ADD CONSTRAINT "meal_items_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "app"."meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."meal_items" ADD CONSTRAINT "meal_items_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "app"."foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."meal_settings" ADD CONSTRAINT "meal_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."notification_deliveries" ADD CONSTRAINT "notification_deliveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
