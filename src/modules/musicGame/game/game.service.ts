import { inject, injectable } from "inversify";
import { TYPES } from "@/types";
import { MusicGameRepository } from "@/modules/musicGame/music-game.repository";
import { TextService } from "@/modules/common/text.service";
import { MemberService } from "@/modules/common/member.service";
import { CommandContext } from "@/types";
import { Markup } from "telegraf";
import { IBotContext } from "@/context/context.interface";

/**
 * GameService - Core game business logic
 *
 * Responsibilities:
 * - Game initialization
 * - Game status management
 * - Game data operations
 */
@injectable()
export class GameService {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: MusicGameRepository,
    @inject(TYPES.TextService) private text: TextService,
    @inject(TYPES.MemberService) private memberService: MemberService,
  ) {}

  /**
   * Sets up a new music guessing game instance
   */
  async initiateGameSetup(ctx: CommandContext): Promise<void> {
    const keyboard = Markup.inlineKeyboard([
      Markup.button.callback("Начать игру", "game:start"),
    ]);

    await ctx.reply(this.text.get("musicGuess.welcome"), {
      reply_markup: keyboard.reply_markup,
    });

    // Notify all participants
    const users = await this.memberService.getSubmissionUsers(ctx.from.id);
    this.memberService.formatPingNames(users).forEach((batch) => {
      ctx.reply(batch, {
        parse_mode: "Markdown",
      });
    });
  }

  /**
   * Starts a new game if none exists or continues the current one
   */
  async startGame(ctx: IBotContext): Promise<void> {
    if (!ctx.chat) return;

    try {
      // Check if there's already an active game
      const activeGame = await this.gameRepository.getCurrentGameByChatId(
        ctx.chat.id,
      );

      if (activeGame) {
        await ctx.reply("Уже есть активная игра. Продолжаем её.");
        return;
      }

      // Create a new game with the submitted tracks
      await this.gameRepository.transferSubmissions(ctx.chat.id);
      await ctx.reply(this.text.get("musicGame.gameStarted"));
      return;
    } catch (error) {
      console.error("Error starting game:", error);
      await ctx.reply("Произошла ошибка при запуске игры");
      return;
    }
  }

  /**
   * Ends the current active game
   */
  async endGame(ctx: IBotContext): Promise<void> {
    if (!ctx.chat) return;

    const game = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
    if (!game) {
      await ctx.reply("Нет активной игры для завершения.");
      return;
    }

    await this.gameRepository.endGame(game.id);
    await ctx.reply("Игра завершена!");
  }

  /**
   * Lists all games for the current chat
   */
  async listGames(ctx: CommandContext): Promise<void> {
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

  /**
   * Pings all participants in the current game
   */
  async pingPlayers(ctx: CommandContext): Promise<void> {
    const users = await this.memberService.getSubmissionUsers(ctx.chat.id);

    if (!users.length) {
      await ctx.reply("musicGame.noPlayers");
      return;
    }

    this.memberService.formatPingNames(users).forEach((batch) => {
      ctx.reply(batch, {
        parse_mode: "Markdown",
        disable_notification: false,
      });
    });
  }

  /**
   * List all players in the current game
   */
  async listPlayers(ctx: CommandContext): Promise<void> {
    const submissionUsers = await this.memberService.getSubmissionUsers(
      ctx.chat.id,
    );

    if (!submissionUsers.length) {
      await ctx.reply("musicGame.noPlayers");
      return;
    }

    const users = this.memberService
      .formatPingNames(submissionUsers)
      .join("\n");

    await ctx.reply(
      this.text.get("musicGame.listPlayers", {
        playersCount: submissionUsers.length,
        playersList: users,
      }),
      {
        parse_mode: "Markdown",
        disable_notification: true,
      },
    );
  }

  /**
   * Shows information about the current active game
   */
  async showActiveGameInfo(ctx: CommandContext): Promise<void> {
    const game = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);

    if (!game) {
      await ctx.reply(`Активная игра для чата ${ctx.chat.id} не найдена`);
      return;
    }

    const gameInfo = [
      `Информация об игре:`,
      `ID: ${game.id}`,
      `Создана: ${game.createdAt.toLocaleDateString()}`,
      `Статус: ${game.activeInChat ? "Активная" : "Завершена"}`,
      `Текущий раунд: ${game.currentRound + 1}`,
      `Всего раундов: ${game.rounds.length}`,
    ];

    await ctx.reply(gameInfo.join("\n"));
  }

  /**
   * Checks if a game is currently active in the chat
   */
  async isGameActive(chatId: number): Promise<boolean> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    return !!game;
  }

  /**
   * Gets the current active game for a chat
   */
  async getCurrentGame(chatId: number) {
    return this.gameRepository.getCurrentGameByChatId(chatId);
  }
}
