import { GameRepository } from "../repositories/GameRepository";
import { Context } from "telegraf";
import { BotResponses, getRandomResponse } from "../../config/botResponses";
import { AppUser } from "../../schemas";

export class LeaderboardService {
  constructor(
    private gameRepository: GameRepository,
    private botResponses: BotResponses,
  ) {}

  async showLeaderboard(ctx: Context) {
    const game = await this.gameRepository.getCurrentGame();
    if (!game) {
      await ctx.reply(getRandomResponse(this.botResponses.gameState.noGame));
      return;
    }

    const userStats = await this.calculateUserStats(game.id);

    const getUserByIdMap = new Map<number, AppUser>();
    for (const round of game.rounds) {
      getUserByIdMap.set(round.submission.userId, round.submission.user);
    }

    const sortedLeaderboard = [...userStats.entries()]
      .sort(([, a], [, b]) => b.totalPoints - a.totalPoints)
      .map(
        ([userId, stats], index) =>
          `${index + 1}. ${getUserByIdMap.get(userId)?.name || "Unknown"} — 🏆 ${
            stats.totalPoints
          } очков (🎯 ${stats.correct} угадано, ❌ ${stats.incorrect} не угадано)`,
      );

    const trackDifficulty = await this.calculateTrackDifficulty(game.id);
    const sortedTrackDifficulty = trackDifficulty
      .sort((a, b) => b.correctGuesses - a.correctGuesses)
      .map(
        (item) =>
          `${item.index + 1}. ${item.player} — 🎯 ${item.correctGuesses}`,
      );

    const mostPoints = (await Promise.all(sortedLeaderboard)).join("\n");

    await ctx.reply(
      getRandomResponse(this.botResponses.leaderboard.mostPoints) +
        "\n\n" +
        mostPoints +
        "\n\n" +
        getRandomResponse(this.botResponses.leaderboard.leastGuessed) +
        "\n\n" +
        sortedTrackDifficulty.join("\n"),
    );
  }

  async calculateUserStats(gameId: number) {
    const game = await this.gameRepository.getGameById(gameId);
    const userStats = new Map<
      number,
      {
        correct: number;
        incorrect: number;
        totalPoints: number;
      }
    >();

    // Logic for calculating user stats
    for (const round of game.rounds) {
      for (const guess of round.guesses) {
        const stats = userStats.get(guess.userId) || {
          correct: 0,
          incorrect: 0,
          totalPoints: 0,
        };
        if (guess.isCorrect) {
          stats.correct++;
          stats.totalPoints += guess.points;
        } else {
          stats.incorrect++;
        }
        userStats.set(guess.userId, stats);
      }
    }

    return userStats;
  }

  async calculateTrackDifficulty(gameId: number) {
    const game = await this.gameRepository.getGameById(gameId);

    // Logic for calculating track difficulty
    const trackDifficulty = game.rounds.map((round) => {
      const correctGuesses = round.guesses.filter((g) => g.isCorrect).length;
      return {
        player: round.submission.user.name || "Unknown",
        correctGuesses,
        index: round.index,
      };
    });

    return trackDifficulty;
  }
}
