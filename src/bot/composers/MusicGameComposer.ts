import { IBotContext } from "@/context/context.interface";
import { Composer } from "telegraf";
import { UserService } from "../services/UserService";
import { RoundService } from "../services/RoundService";
import { GuessService } from "../services/GuessService";
import { MusicGameService } from "../services/MusicGameService";
import { LeaderboardService } from "../services/LeaderboardService";
import { ADMIN_USERNAME } from "@/config/config";
import { inject, injectable } from "inversify";
import { CallbackQueryContext, CommandContext, TYPES } from "@/types";

@injectable()
export class MusicGameComposer extends Composer<IBotContext> {
  constructor(
    @inject(TYPES.UserService) private userService: UserService,
    @inject(TYPES.RoundService) private roundService: RoundService,
    @inject(TYPES.MusicGameService) private musicGuessService: MusicGameService,
    @inject(TYPES.GuessService) private guessService: GuessService,
    @inject(TYPES.LeaderboardService)
    private leaderboardService: LeaderboardService,
  ) {
    super();

    this.setupHandlers();
  }

  private isAdmin(username: string): boolean {
    return username === ADMIN_USERNAME;
  }

  private async handleAdminCheck(ctx: IBotContext): Promise<boolean> {
    if (!this.isAdmin(ctx.from?.username || "")) {
      await ctx.reply("this.botResponses.user.notAdmin");
      return false;
    }
    return true;
  }

  private setupHandlers() {
    this.command("music_guess", this.handleMusicGuess.bind(this));
    this.command("next_round", this.handleNextRound.bind(this));
    this.command("show_hint", this.handleShowHint.bind(this));
    this.command("finish_game", this.handleFinishGame.bind(this));
    this.command("list_games", this.handleListGames.bind(this));

    // New handlers for multiple games
    this.command("start_collection", this.handleStartCollection.bind(this));
    this.command("show_game", this.handleShowGame.bind(this));

    this.action(/^guess:(.+)$/, this.handleGuessAction.bind(this));
    this.action(/^service:(.+)$/, this.handleServiceAction.bind(this));
  }

  private async handleMusicGuess(ctx: IBotContext): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "Начать мучения",
            callback_data: "service:start_game",
          },
        ],
      ],
    };

    await ctx.reply(
      "Ладно, время для игры 'Угадай Музыку'! Приготовьтесь демонстрировать своё полное невежество в музыке!",
      { reply_markup: keyboard },
    );

    const users = await this.userService.getSubmissionUsers();
    this.userService.formatPingNames(users).forEach((batch) => {
      ctx.reply(batch, {
        parse_mode: "Markdown",
      });
    });
  }

  private async handleListGames(ctx: IBotContext): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;
    await this.musicGuessService.listGames(ctx);
  }

  // New method to show specific game details
  private async handleShowGame(ctx: IBotContext): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;

    const message =
      ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const parts = message.split(" ");

    if (parts.length < 2) {
      await ctx.reply("Пожалуйста, укажите ID игры: /show_game [id]");
      return;
    }

    const gameId = parseInt(parts[1]!);
    const game = await this.musicGuessService.getGame(gameId);

    if (!game) {
      await ctx.reply(`Игра с ID ${gameId} не найдена`);
      return;
    }

    await ctx.reply(`Информация об игре:
ID: ${game.id}
Создана: ${game.createdAt.toLocaleDateString()}
Статус: ${game.status}
Текущий раунд: ${game.currentRound}`);
  }

  private async handleStartCollection(ctx: IBotContext): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;

    await ctx.reply(
      "Начинаем сбор треков для новой игры! Загрузите свои треки.",
    );

    const users = await this.userService.getSubmissionUsers();
    this.userService.formatPingNames(users).forEach((batch) => {
      ctx.reply(batch, {
        parse_mode: "Markdown",
      });
    });
  }

  // Changed to finish game instead of clearing it
  private async handleFinishGame(ctx: CommandContext): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;

    // Extract gameId from command if provided
    const parts = ctx.message.text.split(" ");
    const gameId =
      parts.length > 1
        ? parts[1]
          ? parseInt(parts[1])
          : undefined
        : undefined;

    await this.musicGuessService.finishGame(ctx, gameId);
  }

  private async handleNextRound(ctx: CommandContext): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;

    // Extract gameId from command if provided
    const message = ctx.message.text;
    const parts = message.split(" ");
    const gameId =
      parts.length > 1
        ? parts[1]
          ? parseInt(parts[1])
          : undefined
        : undefined;

    await this.roundService.nextRound(
      ctx,
      () => this.handleGameEnd(ctx),
      gameId,
    );
  }

  private async handleGameEnd(ctx: IBotContext): Promise<void> {
    await ctx.reply("getRandomResponse(this.botResponses.rounds.noMoreRounds)");
    await this.leaderboardService.showLeaderboard();
  }

  private async handleShowHint(ctx: IBotContext): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;
    await this.roundService.showHint(ctx);
  }

  private async handleGuessAction(ctx: CallbackQueryContext): Promise<void> {
    const action = ctx.match[1];
    if (!action) return;

    const [roundId, guessId] = action.split("_").map(Number);
    // NOTE: don't change === undefined to !, because it can be 0!!!
    if (roundId === undefined || guessId === undefined) {
      await ctx.reply(`Не смог запарсить данные: ${action}`);
      return;
    }

    try {
      await this.guessService.processGuess(
        ctx,
        roundId,
        guessId,
        async () => await this.roundService.sendRoundInfo(ctx, roundId),
      );
    } catch (error) {
      console.error("Error processing guess:", error);
      await ctx.answerCbQuery("Что-то пошло не так... Наверное, это карма!");
    }
  }

  private async handleServiceAction(ctx: CallbackQueryContext): Promise<void> {
    const action = ctx.match[1];
    if (action !== "start_game") return;

    if (!(await this.handleAdminCheck(ctx))) return;

    try {
      const existingGame = await this.musicGuessService.isGameStarted();

      if (!existingGame) {
        await ctx.reply("Я не нашёл уже существующей игры, начинаю новую");
        await this.musicGuessService.startGame(ctx);
      } else {
        await ctx.reply("Я нашёл уже существующую игру, продолжаю её");
      }

      await this.roundService.processRound(ctx, () => this.handleGameEnd(ctx));
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error handling service action:", error);
      await ctx.reply("Произошла ошибка при запуске игры");
    }
  }
}
