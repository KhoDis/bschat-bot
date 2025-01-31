-- CreateTable
CREATE TABLE "User" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "tag" TEXT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "MusicSubmission" (
    "fileId" TEXT NOT NULL,
    "userId" BIGINT NOT NULL PRIMARY KEY,
    CONSTRAINT "MusicSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentRound" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "index" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "trackId" BIGINT NOT NULL,
    CONSTRAINT "GameRound_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GameRound_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "MusicSubmission" ("userId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Guess" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roundId" INTEGER NOT NULL,
    "userId" BIGINT NOT NULL,
    "guessedId" BIGINT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Guess_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Guess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_gameId_index_key" ON "GameRound"("gameId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "Guess_roundId_userId_key" ON "Guess"("roundId", "userId");
