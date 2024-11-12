// services/MusicGuessService.ts

import { Context } from "telegraf";
import { MusicEntry } from "@prisma/client";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { shuffleArray } from "../../utils/arrayUtils";
import prisma from "../../prisma/client";
import { IMusicGuessService } from "./musicGuess.interface";

export class MusicGuessService implements IMusicGuessService {
  private currentRound: MusicEntry | null = null;
  private leaderboard: Map<number, number> = new Map();

  async addTrack(userId: number, fileId: string) {
    await prisma.musicEntry.create({
      data: { userId, fileId, timestamp: new Date() },
    });
  }

  async getTracks() {
    return await prisma.musicEntry.findMany();
  }

  async startGame(ctx: Context) {
    const tracks = shuffleArray(await this.getTracks());
    if (!tracks.length) {
      await ctx.reply("No music files collected");
      return Promise.resolve();
    }

    for (const track of tracks) {
      await this.startRound(ctx, track);
    }
    return Promise.resolve();
  }

  async startRound(ctx: Context, track: MusicEntry) {
    this.currentRound = track;
    const participants = await prisma.user.findMany();
    const options = shuffleArray(participants);

    const buttons = options.map((user) => ({
      text: user.username,
      callback_data: `guess_${user.id}`,
    }));

    ctx.replyWithAudio(track.fileId, {
      caption: "Guess the user!",
      reply_markup: { inline_keyboard: this.chunkButtons(buttons, 2) },
    });
  }

  async processGuess(ctx: Context, guessedUserId: number) {
    if (!this.currentRound) return;

    const correctUserId = this.currentRound.userId;
    const isCorrect = guessedUserId === correctUserId;
    const userId = ctx.from?.id;

    if (!userId) return;
    this.updateLeaderboard(userId, isCorrect);

    await ctx.answerCbQuery(isCorrect ? "🎉 Correct!" : "❌ Wrong!");
    await this.updateStatus(ctx);
  }

  updateLeaderboard(userId: number, isCorrect: boolean) {
    if (isCorrect) {
      this.leaderboard.set(userId, (this.leaderboard.get(userId) || 0) + 1);
    }
  }

  showLeaderboard(ctx: Context) {
    const sortedLeaderboard = Array.from(this.leaderboard.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    const leaderboardText = sortedLeaderboard
      .map(([userId, score]) => `${userId}: ${score}`)
      .join("\n");
    ctx.reply(`Leaderboard:\n${leaderboardText}`);
  }

  private chunkButtons(buttons: InlineKeyboardButton[], size: number) {
    return Array.from({ length: Math.ceil(buttons.length / size) }, (_, i) =>
      buttons.slice(i * size, i * size + size)
    );
  }

  async updateStatus(ctx: Context) {
    const status = `Leaderboard:\n${[...this.leaderboard.entries()]
      .map(([userId, score]) => `${userId}: ${score}`)
      .join("\n")}`;
    await ctx.editMessageCaption(status);
  }
}
