/*
  Warnings:

  - The `status` column on the `Game` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[userId,gameId]` on the table `MusicSubmission` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('ACTIVE', 'FINISHED');

-- DropIndex
DROP INDEX "MusicSubmission_userId_key";

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "status",
ADD COLUMN     "status" "GameStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "MusicSubmission" ADD COLUMN     "gameId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "MusicSubmission_userId_gameId_key" ON "MusicSubmission"("userId", "gameId");

-- AddForeignKey
ALTER TABLE "MusicSubmission" ADD CONSTRAINT "MusicSubmission_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
