import { inject, injectable } from "inversify";
import { TYPES } from "@/types";
import { MusicGameRepository } from "@/modules/musicGame/music-game.repository";
import { IBotContext } from "@/context/context.interface";
import { CommandContext } from "@/types";
import { MemberService } from "@/modules/common/member.service";
import { TextService } from "@/modules/common/text.service";

/**
 * GameStateService - Handles game state operations without business logic
 *
 * This service breaks the circular dependency between GameService and RoundService
 * by providing a clean interface for game state operations.
 *
 * Responsibilities:
 * - Game state retrieval
 * - Game data queries
 * - Player information
 * - Game listing and information
 */
@injectable()
export class GameStateService {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: MusicGameRepository,
    @inject(TYPES.MemberService) private memberService: MemberService,
    @inject(TYPES.TextService) private text: TextService,
  ) {}

  /**
   * Gets the current active game for a chat
   */
  async getCurrentGame(chatId: number) {
    return this.gameRepository.getCurrentGameByChatId(chatId);
  }

  /**
   * Checks if a game is currently active in the chat
   */
  async isGameActive(chatId: number): Promise<boolean> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    return !!game;
  }

  /**
   * Ends the current active game
   */
  async endGame(chatId: number): Promise<void> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) {
      throw new Error("No active game to end.");
    }
    await this.gameRepository.endGame(game.id);
  }

  /**
   * Gets all games for a specific chat
   */
  async getGamesOfChat(chatId: number) {
    return this.gameRepository.getGamesOfChat(chatId);
  }

  /**
   * Gets submission users for a chat
   */
  async getSubmissionUsers(chatId: number) {
    return this.memberService.getSubmissionUsers(chatId);
  }

  /**
   * Checks if there are submissions available for a game
   */
  async hasSubmissions(chatId: number): Promise<boolean> {
    const users = await this.memberService.getSubmissionUsers(chatId);
    return users.length > 0;
  }

  /**
   * Gets the count of submission users
   */
  async getSubmissionUserCount(chatId: number): Promise<number> {
    const users = await this.memberService.getSubmissionUsers(chatId);
    return users.length;
  }

  /**
   * Formats player names for display
   */
  formatPlayerNames(chatId: number): string[] {
    return this.memberService.formatPingNames([]); // Will be populated when called
  }

  /**
   * Gets formatted player names for a specific chat
   */
  async getFormattedPlayerNames(chatId: number): Promise<string[]> {
    const users = await this.memberService.getSubmissionUsers(chatId);
    return this.memberService.formatPingNames(users);
  }

  /**
   * Gets game statistics for a specific chat
   */
  async getGameStats(chatId: number) {
    const games = await this.gameRepository.getGamesOfChat(chatId);
    const activeGames = games.filter((g) => g.activeInChat);
    const completedGames = games.filter((g) => !g.activeInChat);

    return {
      totalGames: games.length,
      activeGames: activeGames.length,
      completedGames: completedGames.length,
      lastGameDate:
        games.length > 0 ? games[games.length - 1]?.createdAt : null,
    };
  }

  /**
   * Checks if a specific user has submissions in a chat
   */
  async hasUserSubmissions(chatId: number, userId: bigint): Promise<boolean> {
    const users = await this.memberService.getSubmissionUsers(chatId);
    return users.some((user) => user.id === userId);
  }

  /**
   * Gets the most recent game for a chat
   */
  async getMostRecentGame(chatId: number) {
    const games = await this.gameRepository.getGamesOfChat(chatId);
    return games.length > 0 ? games[games.length - 1] : null;
  }
}
