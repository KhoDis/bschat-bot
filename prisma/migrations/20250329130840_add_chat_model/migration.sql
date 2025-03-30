/*
  Warnings:

  - You are about to drop the column `status` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `chatId` on the `GameRound` table. All the data in the column will be lost.
  - You are about to drop the column `hintShown` on the `GameRound` table. All the data in the column will be lost.
  - You are about to drop the column `index` on the `GameRound` table. All the data in the column will be lost.
  - You are about to drop the column `submissionId` on the `GameRound` table. All the data in the column will be lost.
  - You are about to drop the column `isCorrect` on the `Guess` table. All the data in the column will be lost.
  - You are about to drop the column `isLateGuess` on the `Guess` table. All the data in the column will be lost.
  - The primary key for the `MusicSubmission` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `gameId` on the `MusicSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `MusicSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `mediaHintChatId` on the `MusicSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `mediaHintMessageId` on the `MusicSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `MusicSubmission` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[gameId,roundIndex]` on the table `GameRound` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `chatId` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `musicFileId` to the `GameRound` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roundIndex` to the `GameRound` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `GameRound` table without a default value. This is not possible if the table is not empty.
  - Added the required column `memberChatId` to the `MusicSubmission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `memberUserId` to the `MusicSubmission` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GameRound" DROP CONSTRAINT "GameRound_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "MusicSubmission" DROP CONSTRAINT "MusicSubmission_gameId_fkey";

-- DropForeignKey
ALTER TABLE "MusicSubmission" DROP CONSTRAINT "MusicSubmission_userId_fkey";

-- DropIndex
DROP INDEX "GameRound_gameId_index_key";

-- DropIndex
DROP INDEX "MusicSubmission_userId_key";

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "status",
ADD COLUMN     "chatId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "GameRound" DROP COLUMN "chatId",
DROP COLUMN "hintShown",
DROP COLUMN "index",
DROP COLUMN "submissionId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "hintChatId" BIGINT,
ADD COLUMN     "hintMessageId" BIGINT,
ADD COLUMN     "musicFileId" TEXT NOT NULL,
ADD COLUMN     "roundIndex" INTEGER NOT NULL,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "userId" BIGINT NOT NULL,
ALTER COLUMN "infoMessageId" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "Guess" DROP COLUMN "isCorrect",
DROP COLUMN "isLateGuess";

-- AlterTable
ALTER TABLE "MusicSubmission" DROP CONSTRAINT "MusicSubmission_pkey",
DROP COLUMN "gameId",
DROP COLUMN "id",
DROP COLUMN "mediaHintChatId",
DROP COLUMN "mediaHintMessageId",
DROP COLUMN "userId",
ADD COLUMN     "hintChatId" BIGINT,
ADD COLUMN     "hintMessageId" BIGINT,
ADD COLUMN     "memberChatId" BIGINT NOT NULL,
ADD COLUMN     "memberUserId" BIGINT NOT NULL,
ADD CONSTRAINT "MusicSubmission_pkey" PRIMARY KEY ("memberUserId", "memberChatId");

-- DropEnum
DROP TYPE "GameStatus";

-- CreateTable
CREATE TABLE "Member" (
    "userId" BIGINT NOT NULL,
    "chatId" BIGINT NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("userId","chatId")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "activeGameId" INTEGER,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Chat_activeGameId_key" ON "Chat"("activeGameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_gameId_roundIndex_key" ON "GameRound"("gameId", "roundIndex");

-- AddForeignKey
ALTER TABLE "MusicSubmission" ADD CONSTRAINT "MusicSubmission_memberUserId_memberChatId_fkey" FOREIGN KEY ("memberUserId", "memberChatId") REFERENCES "Member"("userId", "chatId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_activeGameId_fkey" FOREIGN KEY ("activeGameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
