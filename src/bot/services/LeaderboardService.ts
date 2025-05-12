import { GameRepository } from "../repositories/GameRepository";
import { User } from "@prisma/client";
import { inject, injectable } from "inversify";
import { TYPES } from "@/types";
import { TextService } from "@/bot/services/TextService";

@injectable()
export class LeaderboardService {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: GameRepository,
    @inject(TYPES.TextService) private text: TextService,
  ) {}

  async showLeaderboard(chatId: number): Promise<string | null> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) {
      return null;
    }

    const userStats = await this.calculateUserStats(game.id);

    const getUserByIdMap = new Map<number, User>();
    for (const round of game.rounds) {
      getUserByIdMap.set(Number(round.userId), round.user);
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

    return [
      this.text.get("leaderboard.mostPoints"),
      mostPoints,
      this.text.get("leaderboard.leastGuessed"),
      sortedTrackDifficulty.join("\n"),
    ].join("\n\n");
  }

  async calculateUserStats(gameId: number) {
    const game = await this.gameRepository.getGameById(gameId);
    // TODO: handle game not found properly
    if (!game) throw new Error("Game not found");

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
        const stats = userStats.get(Number(guess.userId)) || {
          correct: 0,
          incorrect: 0,
          totalPoints: 0,
        };
        if (round.userId === guess.guessedId) {
          stats.correct++;
          stats.totalPoints += guess.points;
        } else {
          stats.incorrect++;
        }
        userStats.set(Number(guess.userId), stats);
      }
    }

    return userStats;
  }

  async calculateTrackDifficulty(gameId: number) {
    const game = await this.gameRepository.getGameById(gameId);
    // TODO: handle game not found properly
    if (!game) throw new Error("Game not found");

    // Logic for calculating track difficulty
    return game.rounds.map((round) => {
      const correctGuesses = round.guesses.filter(
        (g) => g.guessedId === round.userId,
      ).length;
      return {
        player: round.user.name || "Unknown",
        correctGuesses,
        index: round.roundIndex,
      };
    });
  }
}
