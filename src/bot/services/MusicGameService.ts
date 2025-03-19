import { Context } from "telegraf";
import { GameRepository } from "../repositories/GameRepository";
import { MusicSubmissionRepository } from "../repositories/MusicSubmissionRepository";
import { inject, injectable } from "inversify";
import { TYPES } from "@/types";
import { TextService } from "@/bot/services/TextService";

@injectable()
export class MusicGameService {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: GameRepository,
    @inject(TYPES.MusicSubmissionRepository)
    private musicSubmissionRepository: MusicSubmissionRepository,
    @inject(TYPES.TextService) private text: TextService,
  ) {}

  async addMediaHint(
    submissionId: number,
    hintChatId: number,
    hintMessageId: number,
  ): Promise<void> {
    await this.musicSubmissionRepository.updateMediaHint(
      submissionId,
      hintChatId,
      hintMessageId,
    );
  }

  async finishGame(ctx: Context, gameId?: number) {
    const game = gameId
      ? await this.gameRepository.getGameById(gameId)
      : await this.gameRepository.getCurrentGame();

    if (!game) {
      await ctx.reply(this.text.get("gameState.noGame"));
      return;
    }

    try {
      await this.gameRepository.updateGameStatus(game.id, "FINISHED");
    } catch (e) {
      await ctx.reply("Брух, что это: " + e);
    }
    await ctx.reply(this.text.get("musicGame.resetGame"));
  }

  async isGameStarted(): Promise<boolean> {
    const game = await this.gameRepository.getCurrentGame();
    return !!game;
  }

  async startGame(ctx: Context) {
    // Check if there's already an active game
    const activeGame = await this.gameRepository.getCurrentGame();
    if (activeGame) {
      await ctx.reply(
        "Уже есть активная игра. Завершите её перед началом новой.",
      );
      return;
    }

    const newTracks =
      await this.musicSubmissionRepository.findUnassignedTracks();

    if (!newTracks.length) {
      await ctx.reply(this.text.get("musicGame.noTracks"));
    }

    // Create a new game with the new tracks
    const game = await this.gameRepository.createGame(newTracks);

    // Assign the tracks to this game
    await this.musicSubmissionRepository.assignTracksToGame(
      newTracks.map((track) => track.id),
      game.id,
    );
    await ctx.reply(this.text.get("gameState.gameStarted"));
    return game;
  }

  async listGames(ctx: Context) {
    const games = await this.gameRepository.getAllGames();

    if (!games.length) {
      await ctx.reply("Нет сохранённых игр.");
      return;
    }

    const gamesList = games
      .map((game) => {
        const status = game.status === "ACTIVE" ? "Активная" : "Завершена";
        return `ID: ${game.id} | Создана: ${game.createdAt.toLocaleDateString()} | Статус: ${status}`;
      })
      .join("\n");

    await ctx.reply(`Список игр:\n${gamesList}`);
  }

  // New method to get a specific game
  async getGame(gameId: number): Promise<any> {
    return await this.gameRepository.getGameById(gameId);
  }
}
