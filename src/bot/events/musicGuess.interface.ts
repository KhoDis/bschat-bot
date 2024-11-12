import { MusicSubmission } from "@prisma/client";
import { Context } from "vm";

export interface IMusicGuessService {
    getTracks(): Promise<MusicSubmission[]>;
    startGame(ctx: Context): Promise<void>;
    processRound(ctx: Context, track: MusicSubmission): Promise<void>;
    nextRound(ctx: Context): Promise<void>;
    processGuess(ctx: Context, guessedUserId: number): Promise<void>;
    showLeaderboard(ctx: Context): void;
}
