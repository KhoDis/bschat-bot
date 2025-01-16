import { Context } from "telegraf";
import {
  InlineKeyboardButton,
  Message,
} from "telegraf/typings/core/types/typegram";
import { shuffleArray } from "../../utils/arrayUtils";
import prisma from "../../prisma/client";
import { Game, GameRound, Guess, MusicSubmission } from "@prisma/client";
import { GameRepository } from "../repositories/GameRepository";
import {
  AppGameRound,
  AppMusicSubmission,
  AppUser,
  schemas,
} from "../../schemas";
import { MusicSubmissionRepository } from "../repositories/MusicSubmissionRepository";

export class MusicGuessService {
  constructor(
    private gameRepository: GameRepository,
    private musicSubmissionRepository: MusicSubmissionRepository,
  ) {}

  async startGame(ctx: Context) {
    const tracks: AppMusicSubmission[] = shuffleArray(
      await this.musicSubmissionRepository.findAll(),
    );
    if (!tracks.length) {
      await ctx.reply("Никто не решился учавствовать :(");
      return;
    }

    const game = await this.gameRepository.createGame(tracks);

    await ctx.reply("Игра началась! Для следующего раунда нажми /next_round");
    return game;
  }

  async processRound(ctx: Context) {
    const game = await this.gameRepository.getCurrentGame();
    if (!game) {
      await ctx.reply("Нету игры");
      return;
    }

    const currentRound = await this.gameRepository.getCurrentRound();
    if (!currentRound) {
      await ctx.reply("Больше нет раундов");
      await this.showLeaderboard(ctx);
      await this.gameRepository.finishGame(game.id);
      return;
    }

    const participants = await this.gameRepository.getParticipants();

    await this.playRound(ctx, participants, currentRound);
  }

  private async playRound(
    ctx: Context,
    participants: AppUser[],
    currentRound: AppGameRound,
  ) {
    const buttons = participants.map((user) => ({
      text: user.name,
      callback_data: `guess:${currentRound.index}_${user.id}`,
    }));

    await ctx.replyWithAudio(currentRound.submission.fileId, {
      caption: "Угадываем!",
      reply_markup: { inline_keyboard: this.chunkButtons(buttons, 3) },
    });

    await this.sendRoundInfo(ctx);
  }

  async processGuess(
    ctx: Context,
    roundIndex: number,
    guessedUserId: number,
  ): Promise<void> {
    try {
      const game = await this.gameRepository.getCurrentGame();
      if (!game) {
        await ctx.answerCbQuery("Игра еще не началась :(");
        return;
      }

      const round = game.rounds.find((r) => r.index === roundIndex);
      if (!round) {
        await ctx.answerCbQuery("Нет такого раунда :(");
        return;
      }

      const guessingUserId = ctx.from?.id;
      if (!guessingUserId) {
        await ctx.answerCbQuery("У вас почему-то id нету, попробуйте ещё раз");
        return;
      }

      // Check if user already guessed
      const existingGuess = await this.gameRepository.findGuess(
        round.id,
        guessingUserId,
      );
      if (existingGuess) {
        await ctx.answerCbQuery("Вы уже сделали голос :(");
        return;
      }

      // Create guess
      const isCorrect = round.submission.userId === guessedUserId;
      await this.gameRepository.createGuess({
        roundId: round.id,
        userId: guessingUserId,
        guessedId: guessedUserId,
        isCorrect,
      });

      await ctx.answerCbQuery(
        isCorrect
          ? "🎉 Правильно! Никому пока не говори ответ :)"
          : "Эх, мимо...",
      );

      await this.sendRoundInfo(ctx);
    } catch (e) {
      console.error(e);
    }
  }

  async nextRound(ctx: Context) {
    const game = await this.gameRepository.getCurrentGame();
    if (!game) {
      await ctx.reply("Игра еще не началась");
      return;
    }

    await this.gameRepository.updateGameRound(game.id, game.currentRound + 1);
    await this.processRound(ctx);
  }

  async showLeaderboard(ctx: Context) {
    const game = await this.gameRepository.getCurrentGame();
    if (!game) {
      await ctx.reply("Игра еще не началась.");
      return;
    }

    // Calculate user stats
    const userStats = new Map<number, { correct: number; incorrect: number }>();
    for (const round of game.rounds) {
      for (const guess of round.guesses) {
        const stats = userStats.get(guess.userId) || {
          correct: 0,
          incorrect: 0,
        };
        if (guess.isCorrect) {
          stats.correct++;
        } else {
          stats.incorrect++;
        }
        userStats.set(guess.userId, stats);
      }
    }

    // Use game.rounds to form a map
    const getUserByIdMap = new Map<number, AppUser>();
    for (const round of game.rounds) {
      getUserByIdMap.set(round.submission.userId, round.submission.user);
    }

    const sortedLeaderboard = [...userStats.entries()]
      .sort(([, a], [, b]) => b.correct - a.correct)
      .map(
        ([userId, stats], index) =>
          `${index + 1}. ${getUserByIdMap.get(userId)?.name || "Unknown"} — 🎯 ${
            stats.correct
          } угадано, ❌ ${stats.incorrect} не угадано`,
      );

    // Calculate track difficulty
    const trackDifficulty = game.rounds.map((round) => {
      const correctGuesses = round.guesses.filter((g) => g.isCorrect).length;
      return {
        player: round.submission.user.name || "Unknown",
        correctGuesses,
        index: round.index,
      };
    });

    const sortedTracks = trackDifficulty
      .sort((a, b) => a.correctGuesses - b.correctGuesses)
      .map(
        (track, index) =>
          `${index + 1}. "${track.player}" — ${track.correctGuesses} угадали`,
      )
      .join("\n");

    const leaderboardText = (await Promise.all(sortedLeaderboard)).join("\n");
    await ctx.reply(
      `🏆 Итоги игры 🏆\n\nИгроки:\n${leaderboardText}\n\nСамые сложные треки:\n${sortedTracks}`,
    );
  }

  private chunkButtons(buttons: InlineKeyboardButton[], size: number) {
    return Array.from({ length: Math.ceil(buttons.length / size) }, (_, i) =>
      buttons.slice(i * size, i * size + size),
    );
  }

  async formatRoundInfo(round: AppGameRound) {
    const notYetGuessed = await this.gameRepository.getUsersNotGuessed(
      round.id,
    );

    return `
      Раунд ${round.index + 1}
      Ещё думают: ${notYetGuessed.map((u) => u.name).join(", ")}
      Угадали: ${round.guesses
        .filter((g) => g.isCorrect)
        .map((g) => g.user.name)
        .join(", ")}
      Не угадали: ${round.guesses
        .filter((g) => !g.isCorrect)
        .map((g) => g.user.name)
        .join(", ")}
    `;
  }

  async sendRoundInfo(ctx: Context) {
    const round = await this.gameRepository.getCurrentRound();
    if (!round) {
      await ctx.reply("Больше нет раундов");
      return;
    }

    const info = await this.formatRoundInfo(round);
    await ctx.reply(info);
  }
}
