/*
  Warnings:

  - A unique constraint covering the columns `[query]` on the table `FoodCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('LOBBY', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('PENDING', 'PLAYING', 'HINT_SHOWN', 'COMPLETED');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "config" JSONB,
ADD COLUMN     "status" "GameStatus" NOT NULL DEFAULT 'LOBBY';

-- AlterTable
ALTER TABLE "GameRound" ADD COLUMN     "status" "RoundStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "FoodCategory_query_key" ON "FoodCategory"("query");
