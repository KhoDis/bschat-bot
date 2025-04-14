import { IBotContext } from "@/context/context.interface";
import { Composer, Markup } from "telegraf";
import { MemberService } from "../services/MemberService";
import { RoundService } from "../services/RoundService";
import { GuessService } from "../services/GuessService";
import { MusicGameService } from "../services/MusicGameService";
import { LeaderboardService } from "../services/LeaderboardService";
import { inject, injectable } from "inversify";
import { CallbackQueryContext, CommandContext, TYPES } from "@/types";
import { TextService } from "@/bot/services/TextService";
import { RoleService } from "@/bot/services/RoleService";
import { callbackData } from "@/utils/filters";

@injectable()
export class MusicGameComposer extends Composer<IBotContext> {
  constructor(
    @inject(TYPES.MemberService) private memberService: MemberService,
    @inject(TYPES.RoundService) private roundService: RoundService,
    @inject(TYPES.MusicGameService) private musicGuessService: MusicGameService,
    @inject(TYPES.GuessService) private guessService: GuessService,
    @inject(TYPES.LeaderboardService)
    private leaderboardService: LeaderboardService,
    @inject(TYPES.TextService) private text: TextService,
    @inject(TYPES.RoleService) private roleService: RoleService,
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

    // New handlers for multiple games
    this.command("active_game", this.handleActiveGameCommand.bind(this));

    this.on(callbackData(/^guess:(.+)$/), this.handleGuessAction.bind(this));
    this.on(
      callbackData(/^service:(.+)$/),
      this.handleServiceAction.bind(this),
    );
  }

  private async handleMusicGuessCommand(ctx: CommandContext): Promise<void> {
    await this.checkPermissions(ctx, async () => {
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
    });
  }

  private async handleListGames(ctx: IBotContext): Promise<void> {
    await this.checkPermissions(ctx, async () => {
      await this.musicGuessService.listGames(ctx);
    });
  }

  private async handleSendTrack(ctx: CommandContext): Promise<void> {
    // Extract file id from arguments
    const parts = ctx.message.text.split(" ");
    const fileId = parts[1];
    if (!fileId) {
      await ctx.reply("Пожалуйста, укажите ID трека: /send_track [id]");
      return;
    }
    await ctx.replyWithAudio(fileId);
  }

  // New method to show specific game details
  private async handleActiveGameCommand(ctx: IBotContext): Promise<void> {
    await this.checkPermissions(ctx, async () => {
      const message =
        ctx.message && "text" in ctx.message ? ctx.message.text : "";
      const parts = message.split(" ");

      if (parts.length < 2) {
        await ctx.reply("Пожалуйста, укажите ID игры: /show_game [id]");
        return;
      }

      const gameId = parseInt(parts[1]!);
      const game = await this.musicGuessService.getCurrentGame(gameId);

      if (!game) {
        await ctx.reply(`Игра с ID ${gameId} не найдена`);
        return;
      }

      await ctx.reply(`Информация об игре:
ID: ${game.id}
Создана: ${game.createdAt.toLocaleDateString()}
Статус: ${game.activeInChat ? "Активная" : "Завершена"}
Текущий раунд: ${game.currentRound}`);
    });
  }

  // // Changed to finish game instead of clearing it
  // private async finishGame(ctx: IBotContext): Promise<void> {
  //   await this.checkPermissions(ctx, async () => {
  //     // Extract gameId from command if provided
  //     const parts = ctx.message.text.split(" ");
  //     const gameId =
  //       parts.length > 1
  //         ? parts[1]
  //           ? parseInt(parts[1])
  //           : undefined
  //         : undefined;
  //
  //     await this.musicGuessService.finishGame(ctx, gameId);
  //   });
  // }

  private async handleNextRound(ctx: CommandContext): Promise<void> {
    await this.checkPermissions(ctx, async () => {
      if (!ctx.chat) return;
      const chatId = ctx.chat.id;
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
        () => this.handleGameEnd(ctx, chatId),
        gameId,
      );
    });
  }

  private async handleGameEnd(
    ctx: CommandContext | CallbackQueryContext,
    chatId: number,
  ): Promise<void> {
    await ctx.reply(this.text.get("rounds.noMoreRounds"));
    await this.leaderboardService.showLeaderboard(chatId);
  }

  private async handleShowHint(ctx: CommandContext): Promise<void> {
    await this.checkPermissions(ctx, async () => {
      await this.roundService.showHint(ctx, ctx.chat.id);
    });
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

  private async handleServiceAction(ctx: CallbackQueryContext): Promise<void> {
    const data = ctx.callbackQuery.data;
    const action = data?.split(":")[1];
    if (action !== "start_game") return;

    await this.checkPermissions(ctx, async () => {
      try {
        if (!ctx.chat) return;
        const existingGame = await this.musicGuessService.isGameStarted(
          ctx.chat.id,
        );

        if (!existingGame) {
          await ctx.reply("Я не нашёл уже существующей игры, начинаю новую");
          await this.musicGuessService.startGame(ctx);
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
    });
  }

  // TODO: make decorator out of this
  private async checkPermissions(ctx: IBotContext, next: () => Promise<void>) {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;

    if (!userId || !chatId) {
      await ctx.reply(this.text.get("permissions.chatOnly"));
      return;
    }

    const hasPermission = await this.roleService.hasPermission(
      BigInt(userId),
      BigInt(chatId),
      "MANAGE_MUSIC_GAME",
    );

    if (hasPermission) {
      await next();
    } else {
      await ctx.reply(this.text.get("permissions.denied"));
    }
  }
}
