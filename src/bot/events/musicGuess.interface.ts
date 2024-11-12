import { MusicEntry } from "@prisma/client";
import { Context } from "vm";

export interface IMusicGuessService {
  addTrack(userId: number, fileId: string): Promise<void>;
  getTracks(): Promise<MusicEntry[]>;
  startGame(ctx: Context): Promise<void>;
  startRound(ctx: Context, track: MusicEntry): Promise<void>;
  processGuess(ctx: Context, guessedUserId: number): Promise<void>;
  showLeaderboard(ctx: Context): void;
}
