/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `MusicSubmission` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "MusicSubmission_userId_gameId_key";

-- CreateIndex
CREATE UNIQUE INDEX "MusicSubmission_userId_key" ON "MusicSubmission"("userId");
