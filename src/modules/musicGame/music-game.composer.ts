import { IBotContext } from "@/context/context.interface";
import { Composer, Markup } from "telegraf";
import { MemberService } from "@/bot/services/MemberService";
import { RoundService } from "@/bot/services/RoundService";
import { GuessService } from "@/bot/services/GuessService";
import { MusicGameService } from "./music-game.service";
import { LeaderboardService } from "@/bot/services/LeaderboardService";
import { inject, injectable } from "inversify";
import { CallbackQueryContext, CommandContext, TYPES } from "@/types";
import { TextService } from "@/bot/services/TextService";
import { callbackData } from "@/utils/filters";
import { RequirePermission } from "@/bot/decorators/RequirePermission";

@injectable()
export class MusicGameComposer extends Composer<IBotContext> {
  constructor(
    @inject(TYPES.MemberService) private memberService: MemberService,
    @inject(TYPES.RoundService) private roundService: RoundService,
    @inject(TYPES.MusicGameService) private musicGameService: MusicGameService,
    @inject(TYPES.GuessService) private guessService: GuessService,
    @inject(TYPES.LeaderboardService)
    private leaderboardService: LeaderboardService,
    @inject(TYPES.TextService) private text: TextService,
  ) {
    super();

    this.setupHandlers();
  }

  private setupHandlers() {
    this.command("music_guess", this.handleMusicGuessCommand.bind(this));
    this.command("next_round", this.handleNextRound.bind(this));
    this.command("show_hint", this.handleShowHint.bind(this));
    this.command("list_games", this.handleListGames.bind(this));
    this.command("send_track", this.handleSendTrack.bind(this));
    this.command("get_user_id", this.handleGetUserId.bind(this));

    // New handlers for multiple games
    this.command("active_game", this.handleActiveGameCommand.bind(this));

    this.on(callbackData(/^guess:(.+)$/), this.handleGuessAction.bind(this));
    this.on(
      callbackData(/^service:(.+)$/),
      this.handleServiceAction.bind(this),
    );
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleMusicGuessCommand(ctx: CommandContext): Promise<void> {
    const keyboard = Markup.inlineKeyboard([
      Markup.button.callback("Начать мучения", "service:start_game"),
    ]);

    await ctx.reply(this.text.get("musicGuess.welcome"), {
      reply_markup: keyboard.reply_markup,
    });

    const users = await this.memberService.getSubmissionUsers(ctx.from.id);
    this.memberService.formatPingNames(users).forEach((batch) => {
      ctx.reply(batch, {
        parse_mode: "Markdown",
      });
    });
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleListGames(ctx: IBotContext): Promise<void> {
    await this.musicGameService.listGames(ctx);
  }

  private async handleGetUserId(ctx: CommandContext): Promise<void> {
    // Extract user id from ctx.message.reply_to_message
    const userId = ctx.message.reply_to_message?.from?.id;
    if (!userId) {
      await ctx.reply("Пожалуйста, укажите ID пользователя: /get_user_id");
      return;
    }
    await ctx.reply(`ID пользователя: ${userId}`);
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleSendTrack(ctx: CommandContext): Promise<void> {
    const parts = ctx.message.text.split(" ");
    const fileId = parts[1];
    if (!fileId) {
      await ctx.reply("Пожалуйста, укажите ID трека: /send_track [id]");
      return;
    }
    await ctx.replyWithAudio(fileId);
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleActiveGameCommand(ctx: CommandContext): Promise<void> {
    const message =
      ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const parts = message.split(" ");

    const game = await this.musicGameService.getCurrentGameByChatId(
      ctx.chat.id,
    );

    if (!game) {
      await ctx.reply(`Игра чата ${ctx.chat.id} не найдена`);
      return;
    }

    const gameInfo = [
      `Информация об игре:`,
      `ID: ${game.id}`,
      `Создана: ${game.createdAt.toLocaleDateString()}`,
      `Статус: ${game.activeInChat ? "Активная" : "Завершена"}`,
      `Текущий раунд: ${game.currentRound}`,
    ];

    await ctx.reply(gameInfo.join("\n"));
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleNextRound(ctx: CommandContext): Promise<void> {
    if (!ctx.chat) return;
    const chatId = ctx.chat.id;

    // Extract gameId from command if provided
    const message = ctx.message.text;
    const parts = message.split(" ");
    const gameId =
      parts.length > 1 ? parseInt(parts[1] || "0") || undefined : undefined;

    await this.roundService.nextRound(
      ctx,
      () => this.handleGameEnd(ctx, chatId),
      gameId,
    );
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  public async handleShowHint(ctx: CommandContext): Promise<void> {
    await this.roundService.showHint(ctx, ctx.chat.id);
  }

  private async handleGameEnd(
    ctx: CommandContext | CallbackQueryContext,
    chatId: number,
  ): Promise<void> {
    await ctx.reply(this.text.get("rounds.noMoreRounds"));
    // Using service instead of direct leaderboard service dependency
    await this.leaderboardService.showLeaderboard(chatId);
  }

  private async handleGuessAction(ctx: CallbackQueryContext): Promise<void> {
    if (!ctx.chat) return;
    const action = ctx.callbackQuery.data.split(":")[1];
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
        ctx.chat.id,
        guessId,
        async () => await this.roundService.sendRoundInfo(ctx, roundId),
      );
    } catch (error) {
      console.error("Error processing guess:", error);
      await ctx.answerCbQuery("Что-то пошло не так... Наверное, это карма!");
    }
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleServiceAction(ctx: CallbackQueryContext): Promise<void> {
    const data = ctx.callbackQuery.data;
    const action = data?.split(":")[1];
    if (action !== "start_game") return;

    try {
      if (!ctx.chat) return;
      const existingGame = await this.musicGameService.isGameStarted(
        ctx.chat.id,
      );

      if (!existingGame) {
        await ctx.reply("Я не нашёл уже существующей игры, начинаю новую");
        await this.musicGameService.startGame(ctx);
      } else {
        await ctx.reply("Я нашёл уже существующую игру, продолжаю её");
      }

      await this.roundService.processRound(ctx, ctx.chat.id, () =>
        this.handleGameEnd(ctx, ctx.chat!.id),
      );
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error handling service action:", error);
      await ctx.reply("Произошла ошибка при запуске игры");
    }
  }
}
