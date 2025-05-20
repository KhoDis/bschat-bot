import {
  GameRepository,
  GameWithData,
} from "@/bot/repositories/GameRepository";
import { inject, injectable } from "inversify";
import { CallbackQueryContext, CommandContext, TYPES } from "@/types";
import { TextService } from "@/modules/common/text.service";

@injectable()
export class MusicGameService {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: GameRepository,
    @inject(TYPES.TextService) private text: TextService,
  ) {}

  async getCurrentGameByChatId(chatId: number): Promise<GameWithData | null> {
    return this.gameRepository.getCurrentGameByChatId(chatId);
  }

  async isGameStarted(chatId: number): Promise<boolean> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    return !!game;
  }

  async startGame(ctx: CallbackQueryContext) {
    if (!ctx.chat) return;
    // Check if there's already an active game
    const activeGame = await this.gameRepository.getCurrentGameByChatId(
      ctx.chat.id,
    );
    if (activeGame) {
      await ctx.reply(
        "Уже есть активная игра. Завершите её перед началом новой.",
      );
      return;
    }

    // Create a new game with the new tracks
    const game = await this.gameRepository.transferSubmissions(ctx.chat.id);

    await ctx.reply(this.text.get("musicGame.gameStarted"));
    return game;
  }

  async listGames(ctx: CommandContext) {
    const games = await this.gameRepository.getGamesOfChat(ctx.chat.id);

    if (!games.length) {
      await ctx.reply("Нет сохранённых игр.");
      return;
    }

    const gamesList = games
      .map((game) => {
        const status = game.activeInChat ? "Активная" : "Завершена";
        return `ID: ${game.id} | Создана: ${game.createdAt.toLocaleDateString()} | Статус: ${status}`;
      })
      .join("\n");

    await ctx.reply(`Список игр:\n${gamesList}`);
  }
}
