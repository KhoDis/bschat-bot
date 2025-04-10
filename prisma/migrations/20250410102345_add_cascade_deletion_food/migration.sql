-- DropForeignKey
ALTER TABLE "FoodTrigger" DROP CONSTRAINT "FoodTrigger_categoryId_fkey";

-- AddForeignKey
ALTER TABLE "FoodTrigger" ADD CONSTRAINT "FoodTrigger_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FoodCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
