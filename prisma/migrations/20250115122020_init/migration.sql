/*
  Warnings:

  - You are about to drop the column `trackId` on the `GameRound` table. All the data in the column will be lost.
  - The primary key for the `MusicSubmission` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `submissionId` to the `GameRound` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id` to the `MusicSubmission` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GameRound" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "index" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "submissionId" INTEGER NOT NULL,
    CONSTRAINT "GameRound_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GameRound_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "MusicSubmission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GameRound" ("gameId", "id", "index") SELECT "gameId", "id", "index" FROM "GameRound";
DROP TABLE "GameRound";
ALTER TABLE "new_GameRound" RENAME TO "GameRound";
CREATE UNIQUE INDEX "GameRound_gameId_index_key" ON "GameRound"("gameId", "index");
CREATE TABLE "new_MusicSubmission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    CONSTRAINT "MusicSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MusicSubmission" ("fileId", "userId") SELECT "fileId", "userId" FROM "MusicSubmission";
DROP TABLE "MusicSubmission";
ALTER TABLE "new_MusicSubmission" RENAME TO "MusicSubmission";
CREATE UNIQUE INDEX "MusicSubmission_userId_key" ON "MusicSubmission"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
