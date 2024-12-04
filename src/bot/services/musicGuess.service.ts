import { Context } from "telegraf";
import {
  InlineKeyboardButton,
  Message,
} from "telegraf/typings/core/types/typegram";
import { shuffleArray } from "../../utils/arrayUtils";
import prisma from "../../prisma/client";
import { IMusicGuessService } from "../events/musicGuess.interface";
import { MusicSubmission, User } from "@prisma/client";
import { AppUser } from "./UserService";

class MusicRoundState {
  public notYetGuessed: Set<number>;
  public rightGuesses: Set<number>;
  public wrongGuesses: Set<number>;
  public message: Message.TextMessage | undefined;

  constructor(
    users: Set<number>,
    public track: MusicSubmission,
    public index: number
  ) {
    this.notYetGuessed = new Set(users);
    this.rightGuesses = new Set();
    this.wrongGuesses = new Set();
    this.message;
  }
}

class MusicGameState {
  rounds: Map<number, MusicRoundState>;
  currentRound: number;
  users: Map<number, AppUser>;

  constructor(submissions: MusicSubmission[], users: Map<number, AppUser>) {
    const rounds: [number, MusicRoundState][] = submissions.map(
      (track, index) => [
        index,
        new MusicRoundState(new Set(users.keys()), track, index),
      ]
    );

    this.rounds = new Map(rounds);
    this.currentRound = 0;
    this.users = users;
  }
}

export class MusicGuessService {
  private gameState: MusicGameState | null = null;

  async getTracks() {
    return await prisma.musicSubmission.findMany();
  }

  async startGame(ctx: Context, participants: AppUser[]) {
    const tracks = shuffleArray(await this.getTracks());
    if (!tracks.length) {
      await ctx.reply("Никто не решился учавствовать :(");
      return Promise.resolve();
    }
    this.gameState = new MusicGameState(
      tracks,
      new Map(participants.map((p) => [p.id, p]))
    );

    ctx.reply("Игра началась! Для следующего раунда нажми /next_round");
  }

  async processRound(ctx: Context) {
    if (!this.gameState) {
      await ctx.reply("Не могу начать раунд, так как игра еще не началась");
      return Promise.resolve();
    }

    const gameState = this.gameState;

    const round = gameState.rounds.get(gameState.currentRound);
    if (!round) {
      await ctx.reply("Больше нет раундов");
      // Show leaderboard
      await this.showLeaderboard(ctx);
      return Promise.resolve();
    }

    this.playRound(ctx, [...gameState.users.values()], round);
  }

  /**
   * Send audiofile
   * Show buttons to guess
   * Send round state info
   */
  private playRound(
    ctx: Context,
    participants: AppUser[],
    currentRound: MusicRoundState
  ) {
    const buttons = participants.map((user) => {
      return {
        text: user.name,
        callback_data: `guess:${currentRound.index}_${user.id}`,
      } as InlineKeyboardButton;
    });

    ctx.replyWithAudio(currentRound.track.fileId, {
      caption: "Угадываем!",
      reply_markup: { inline_keyboard: this.chunkButtons(buttons, 3) },
    });

    this.sendRoundInfo(ctx);
  }

  async processGuess(
    ctx: Context,
    roundId: number,
    guessedUserId: number
  ): Promise<void> {
    if (!this.gameState) {
      await ctx.answerCbQuery("Игра еще не началась :(");
      return Promise.resolve();
    }

    const round = this.gameState.rounds.get(roundId);
    if (!round) {
      await ctx.answerCbQuery("Нет такого раунда :(");
      return Promise.resolve();
    }

    const guessingUserId = ctx.from?.id;

    if (!guessingUserId) {
      await ctx.answerCbQuery("У вас почему-то id нету, попробуйте ещё раз");
      return Promise.resolve();
    }

    if (!round.notYetGuessed.has(guessingUserId)) {
      await ctx.answerCbQuery("Вы уже сделали голос :(");
      return Promise.resolve();
    }

    round.notYetGuessed.delete(guessingUserId);
    if (Number(round.track.userId) === guessedUserId) {
      await ctx.answerCbQuery("🎉 Правильно! Никому пока не говори ответ :)");
      round.rightGuesses.add(guessingUserId);
    } else {
      await ctx.answerCbQuery("Эх, мимо...");
      round.wrongGuesses.add(guessingUserId);
    }

    await this.updateRoundInfo(ctx, round);
  }

  isGameStarted() {
    return !!this.gameState;
  }

  async nextRound(ctx: Context) {
    if (!this.gameState) {
      await ctx.reply("Игра еще не началась");
      return Promise.resolve();
    }
    this.gameState.currentRound += 1;
    await this.processRound(ctx);
  }

  formatRoundInfo(gameState: MusicGameState, round: MusicRoundState) {
    return `
            Раунд ${round.index + 1}/${gameState.rounds.size}
            Ещё думают: ${[...round.notYetGuessed]
              .map((u) => gameState.users.get(u)?.name)
              .join(", ")}
            Угадали: ${[...round.rightGuesses]
              .map((u) => gameState.users.get(u)?.name)
              .join(", ")}
            Не угадали: ${[...round.wrongGuesses]
              .map((u) => gameState.users.get(u)?.name)
              .join(", ")}
        `;
  }

  async sendRoundInfo(ctx: Context) {
    const gameState = this.gameState;
    if (!gameState) {
      return;
    }
    const round = gameState.rounds.get(gameState.currentRound);
    if (!round) {
      return;
    }

    round.message = await ctx.reply(this.formatRoundInfo(gameState, round));
  }

  async updateRoundInfo(ctx: Context, round: MusicRoundState) {
    const gameState = this.gameState;
    if (!gameState) {
      return;
    }
    const chatId = round.message?.chat.id;
    if (!chatId) {
      this.sendRoundInfo(ctx);
      return;
    }
    const msg = round.message;
    if (!msg) {
      this.sendRoundInfo(ctx);
      return;
    }
    await ctx.telegram.editMessageText(
      chatId,
      msg.message_id,
      undefined,
      this.formatRoundInfo(gameState, round)
    );
  }

  async showLeaderboard(ctx: Context) {
    if (!this.gameState) {
      await ctx.reply("Игра еще не началась.");
      return;
    }

    const guessLeaderboard = new Map<
      number,
      { correct: number; incorrect: number }
    >();

    // Collect user stats
    for (const round of this.gameState.rounds.values()) {
      for (const userId of round.rightGuesses) {
        const stats = guessLeaderboard.get(userId) || {
          correct: 0,
          incorrect: 0,
        };
        stats.correct++;
        guessLeaderboard.set(userId, stats);
      }

      for (const userId of round.wrongGuesses) {
        const stats = guessLeaderboard.get(userId) || {
          correct: 0,
          incorrect: 0,
        };
        stats.incorrect++;
        guessLeaderboard.set(userId, stats);
      }
    }

    const sortedLeaderboard = [...guessLeaderboard.entries()]
      .sort(([, a], [, b]) => b.correct - a.correct)
      .map(([userId, stats], index) => {
        const userName = this.gameState?.users.get(userId)?.name || "Unknown";
        return `${index + 1}. ${userName} — 🎯 ${stats.correct} угадано, ❌ ${
          stats.incorrect
        } не угадано`;
      })
      .join("\n");

    // Sort tracks by difficulty
    const trackDifficulty = [...this.gameState.rounds.entries()]
      .map(([index, round]) => ({
        player:
          this.gameState?.users.get(Number(round.track.userId))?.name ||
          "Unknown",
        correctGuesses: round.rightGuesses.size,
      }))
      .sort((a, b) => a.correctGuesses - b.correctGuesses) // Ascending order
      .map(
        (track, index) =>
          `${index + 1}. "${track.player}" — ${track.correctGuesses} угадали`
      )
      .join("\n");

    await ctx.reply(
      `🏆 Итоги игры 🏆\n\nИгроки:\n${sortedLeaderboard}\n\nСамые сложные треки:\n${trackDifficulty}`
    );
  }

  private chunkButtons(buttons: InlineKeyboardButton[], size: number) {
    return Array.from({ length: Math.ceil(buttons.length / size) }, (_, i) =>
      buttons.slice(i * size, i * size + size)
    );
  }
}
