-- CreateEnum
CREATE TYPE "ScoringPreset" AS ENUM ('classic', 'aggressive', 'gentle');

-- AlterTable
ALTER TABLE "Game" 
  DROP COLUMN "config",
  ADD COLUMN "hintDelaySec" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "autoAdvance" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "advanceDelaySec" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "allowSelfGuess" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "shuffle" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "scoringPreset" "ScoringPreset" NOT NULL DEFAULT 'classic';

