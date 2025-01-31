/*
  Warnings:

  - Added the required column `points` to the `Guess` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MusicSubmission" ADD COLUMN "hint" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GameRound" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "index" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "hintShown" BOOLEAN NOT NULL DEFAULT false,
    "hintShownAt" DATETIME,
    CONSTRAINT "GameRound_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GameRound_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "MusicSubmission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GameRound" ("gameId", "id", "index", "submissionId") SELECT "gameId", "id", "index", "submissionId" FROM "GameRound";
DROP TABLE "GameRound";
ALTER TABLE "new_GameRound" RENAME TO "GameRound";
CREATE UNIQUE INDEX "GameRound_gameId_index_key" ON "GameRound"("gameId", "index");
CREATE TABLE "new_Guess" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roundId" INTEGER NOT NULL,
    "userId" BIGINT NOT NULL,
    "guessedId" BIGINT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLateGuess" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Guess_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Guess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Guess" ("createdAt", "guessedId", "id", "isCorrect", "roundId", "userId") SELECT "createdAt", "guessedId", "id", "isCorrect", "roundId", "userId" FROM "Guess";
DROP TABLE "Guess";
ALTER TABLE "new_Guess" RENAME TO "Guess";
CREATE UNIQUE INDEX "Guess_roundId_userId_key" ON "Guess"("roundId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
