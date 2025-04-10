-- CreateTable
CREATE TABLE "FoodCategory" (
    "id" SERIAL NOT NULL,
    "query" TEXT NOT NULL,

    CONSTRAINT "FoodCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodTrigger" (
    "id" SERIAL NOT NULL,
    "trigger" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "FoodTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FoodTrigger_trigger_key" ON "FoodTrigger"("trigger");

-- AddForeignKey
ALTER TABLE "FoodTrigger" ADD CONSTRAINT "FoodTrigger_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FoodCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
