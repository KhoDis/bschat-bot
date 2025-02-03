-- CreateTable
CREATE TABLE "User" (
    "id" BIGINT NOT NULL,
    "tag" TEXT,
    "name" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicSubmission" (
    "id" SERIAL NOT NULL,
    "fileId" TEXT NOT NULL,
    "hint" TEXT,
    "userId" BIGINT NOT NULL,

    CONSTRAINT "MusicSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentRound" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" SERIAL NOT NULL,
    "index" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "hintShown" BOOLEAN NOT NULL DEFAULT false,
    "hintShownAt" TIMESTAMP(3),

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guess" (
    "id" SERIAL NOT NULL,
    "roundId" INTEGER NOT NULL,
    "userId" BIGINT NOT NULL,
    "guessedId" BIGINT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLateGuess" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Guess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MusicSubmission_userId_key" ON "MusicSubmission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_gameId_index_key" ON "GameRound"("gameId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "Guess_roundId_userId_key" ON "Guess"("roundId", "userId");

-- AddForeignKey
ALTER TABLE "MusicSubmission" ADD CONSTRAINT "MusicSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "MusicSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guess" ADD CONSTRAINT "Guess_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guess" ADD CONSTRAINT "Guess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
