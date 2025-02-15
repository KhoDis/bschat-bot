import { IBotContext } from "@/context/context.interface";
import { Composer, NarrowedContext } from "telegraf";
import { UserService } from "../services/UserService";
import { BotTemplates, getRandomResponse } from "@/config/botTemplates";
import { RoundService } from "../services/RoundService";
import { GuessService } from "../services/GuessService";
import { MusicGameService } from "../services/MusicGameService";
import { LeaderboardService } from "../services/LeaderboardService";
import { Update } from "telegraf/types";
import { ADMIN_USERNAME } from "@/config/config";

type CallbackQueryContext = NarrowedContext<
  IBotContext,
  Update.CallbackQueryUpdate
> & {
  match: RegExpExecArray;
};

export class MusicGameComposer extends Composer<IBotContext> {
  constructor(
    private userService: UserService,
    private roundService: RoundService,
    private musicGuessService: MusicGameService,
    private guessService: GuessService,
    private leaderboardService: LeaderboardService,
    private botResponses: BotTemplates,
  ) {
    super();

    this.setupHandlers();
  }

  private isAdmin(username: string): boolean {
    return username === ADMIN_USERNAME;
  }

  private async handleAdminCheck(ctx: IBotContext): Promise<boolean> {
    if (!this.isAdmin(ctx.from?.username || "")) {
      await ctx.reply(getRandomResponse(this.botResponses.user.notAdmin));
      return false;
    }
    return true;
  }

  private setupHandlers() {
    this.command("music_guess", this.handleMusicGuess.bind(this));
    this.command("next_round", this.handleNextRound.bind(this));
    this.command("show_hint", this.handleShowHint.bind(this));
    this.command("clear_game", this.handleClearGame.bind(this));

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
    await ctx.replyWithMarkdown(this.userService.formatPingNames(users));
  }

  private async handleClearGame(ctx: IBotContext): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;
    await this.musicGuessService.clearGame(ctx);
  }

  private async handleNextRound(ctx: IBotContext): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;
    await this.roundService.nextRound(ctx, () => this.handleGameEnd(ctx));
  }

  private async handleGameEnd(ctx: IBotContext): Promise<void> {
    await ctx.reply(getRandomResponse(this.botResponses.rounds.noMoreRounds));
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
        async () => await this.roundService.sendRoundInfo(ctx),
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
