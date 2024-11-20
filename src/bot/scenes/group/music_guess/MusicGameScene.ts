import { Context, Scenes } from "telegraf";
import { IBotContext } from "../../../../context/context.interface";
import { MusicGuessService } from "../../../services/musicGuess.service";
import { UserService } from "../../../services/UserService";
import Timer from "../../../../utils/Timer";
import { formatTime } from "../../../../utils/timeUtils";

interface TimerState {
  timer: Timer | null;
  messageId: number | null;
  interval: NodeJS.Timeout | null;
}

class MusicGameScene extends Scenes.BaseScene<IBotContext> {
  static readonly SCENE_NAME = "MUSIC_GAME_SCENE";
  private static readonly TIMER_UPDATE_INTERVAL = 5000;
  private static readonly INITIAL_WAIT_TIME = 2 * 60 * 1000; // 2 minutes
  private static readonly ADMIN_USERNAME = "khodis";

  private readonly timerState: TimerState = {
    timer: null,
    messageId: null,
    interval: null,
  };

  private musicGuessService: MusicGuessService;
  private userService: UserService;

  constructor(musicGuessService: MusicGuessService, userService: UserService) {
    super(MusicGameScene.SCENE_NAME);

    this.musicGuessService = musicGuessService;
    this.userService = userService;

    this.setupHandlers();
  }

  private setupHandlers() {
    this.enter(async (ctx) => {
      await ctx.reply("Это игра Угадай Музыку! Пингуем и ждём 2 минуты.");

      const participants = await this.pingParticipants(ctx);
      if (!participants) return;

      // Start game after 2 minutes with timer
      const duration = 2 * 60 * 1000; // 2 minutes in milliseconds

      await this.initializeGameTimer(ctx);

      // Add keyboard with two buttons: "next_round" and "add_30s"
      await ctx.reply("Что хотите сделать?", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Начать Раунд", callback_data: "service:next_round" }],
            [{ text: "Добавить 30 секунд", callback_data: "service:add_30s" }],
          ],
        },
      });
    });

    this.command("add_30s", async (ctx) => {
      const response = await this.addExtraTime();
      await ctx.reply(response);
    });

    this.command("next_round", async (ctx) => {
      // Check if user sending this command is @khodis
      if (ctx.from.username !== "khodis") {
        await ctx.reply(
          "Только @khodis может насильно начинать следующий раунд :)"
        );
        return;
      }

      // Stop timer and start next round
      await this.handleTimerComplete(ctx);
    });

    this.action(/^service:(.+)$/, async (ctx) => {
      const serviceName = ctx.match[1];

      switch (serviceName) {
        case "next_round":
          // Check if user sending this command is @khodis
          if (ctx.from.username !== "khodis") {
            await ctx.answerCbQuery(
              "Только @khodis может насильно начинать следующий раунд :)"
            );
            return;
          }

          // Stop timer and start next round
          await this.handleTimerComplete(ctx);
          break;
        case "add_30s":
          const response = await this.addExtraTime();
          await ctx.answerCbQuery(response);
          break;
      }
    });
  }

  private async pingParticipants(ctx: Context): Promise<boolean> {
    const participants = await this.musicGuessService.getTracks();

    if (!participants.length) {
      await ctx.reply("Никто не решился учавствовать :(");
      return false;
    }

    const formattedNames = await Promise.all(
      participants.map(async (p) =>
        this.formatParticipantName(Number(p.userId))
      )
    );

    await ctx.replyWithMarkdown(formattedNames.join("\n"));
    return true;
  }

  private async formatParticipantName(userId: number): Promise<string> {
    const formattedUser = await this.userService.getFormattedUser(userId);
    return `[${formattedUser}](tg://user?id=${userId})`;
  }

  private async initializeGameTimer(ctx: Context): Promise<void> {
    const timer = new Timer(
      () => this.handleTimerComplete(ctx),
      MusicGameScene.INITIAL_WAIT_TIME
    );

    this.timerState.timer = timer;
    timer.start();

    const timerMessage = await ctx.reply(`Осталось: ...`);
    this.timerState.messageId = timerMessage.message_id;

    this.startTimerUpdates(ctx);
  }

  private async handleTimerComplete(ctx: Context): Promise<void> {
    this.clearTimerInterval();
    this.clearTimer();

    await this.updateTimerMessage(ctx, 0);
    await this.startNextRound(ctx);
  }

  private clearTimerInterval(): void {
    if (this.timerState.interval) {
      clearInterval(this.timerState.interval);
      this.timerState.interval = null;
    }
  }

  private async startNextRound(ctx: Context): Promise<void> {
    if (!this.musicGuessService.isGameStarted()) {
      await this.musicGuessService.startGame(ctx);
      return;
    }
    await this.musicGuessService.nextRound(ctx);
  }

  private async updateTimerMessage(
    ctx: Context,
    remainingTime: number
  ): Promise<void> {
    await ctx.telegram.editMessageText(
      ctx.chat!.id,
      this.timerState.messageId!,
      undefined,
      `Осталось: ${formatTime(remainingTime)}`
    );
  }

  private clearTimer(): void {
    this.timerState.timer?.clear();
    this.timerState.timer = null;
  }

  private isAdminUser(ctx: Context): boolean {
    return ctx.from?.username === MusicGameScene.ADMIN_USERNAME;
  }

  private startTimerUpdates(ctx: Context): void {
    this.timerState.interval = setInterval(async () => {
      const remainingTime = this.timerState.timer?.getRemainingTime() ?? 0;

      if (remainingTime <= 0) {
        this.clearTimerInterval();
        return;
      }

      await this.updateTimerMessage(ctx, remainingTime).catch((error) => {
        console.error("Failed to update timer message:", error);
        this.clearTimerInterval();
      });
    }, MusicGameScene.TIMER_UPDATE_INTERVAL);
  }

  private addExtraTime(): string {
    if (!this.timerState.timer) {
      return "Ещё ничего не играется.";
    }

    const added = this.timerState.timer.addTime(30 * 1000);
    return added ? "Добавлено 30 секунд." : "Уже поздно :(";
  }
}

export default MusicGameScene;
