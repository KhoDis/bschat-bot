import { Context, Scenes } from "telegraf";
import { IBotContext } from "../../../../context/context.interface";
import { MusicGuessService } from "../../../services/musicGuess.service";
import { UserService } from "../../../services/UserService";
import { formatTime } from "../../../../utils/timeUtils";
import TimerInterval from "../../../../utils/TimerInterval";

interface TimerState {
  messageId: number | null;
  timerInterval: TimerInterval | null;
}

class MusicGameScene extends Scenes.BaseScene<IBotContext> {
  static readonly SCENE_NAME = "MUSIC_GAME_SCENE";
  private static readonly TIMER_UPDATE_INTERVAL = 3000;
  private static readonly INITIAL_WAIT_TIME = 2 * 60 * 1000; // 2 minutes
  private static readonly ADMIN_USERNAME = "khodis";

  private readonly timerState: TimerState = {
    messageId: null,
    timerInterval: null,
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
      await this.musicGuessService.processRound(ctx);

      // Start timer
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
      await this.nextRound(ctx);
    });

    this.action(/^guess:(.+)$/, async (ctx) => {
      const guessData = ctx.match[1]!.split("_");
      const guessRound = guessData[0] ? parseInt(guessData[0]) : null;
      const guessedUserId = guessData[1] ? parseInt(guessData[1]) : null; // User's picked option

      if (guessedUserId === null) {
        await ctx.answerCbQuery("Почему-то id пользователя не нашлось :(");
        return Promise.resolve();
      }

      if (guessRound === null) {
        await ctx.answerCbQuery("Почему-то раунд не нашлось :(");
        return Promise.resolve();
      }
      await this.musicGuessService.processGuess(ctx, guessRound, guessedUserId);
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
          await this.nextRound(ctx);
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
    const timerMessage = await ctx.reply(`Осталось: ...`);

    this.timerState.messageId = timerMessage.chat.id;

    const timerInterval = new TimerInterval(
      async () => await this.nextRound(ctx),
      MusicGameScene.INITIAL_WAIT_TIME,
      async () =>
        await ctx.telegram.editMessageText(
          ctx.chat!.id,
          this.timerState.messageId!,
          undefined,
          `Осталось: ${formatTime(timerInterval.getRemainingTime())}`
        ),
      MusicGameScene.TIMER_UPDATE_INTERVAL
    );

    this.timerState.timerInterval = timerInterval;
  }

  private async nextRound(ctx: Context): Promise<void> {
    if (!this.timerState.timerInterval) {
      return;
    }
    this.timerState.timerInterval.clear();

    this.musicGuessService.nextRound(ctx);
    await ctx.reply("Игра уже идёт!");
  }

  private addExtraTime(): string {
    if (!this.timerState.timerInterval) {
      return "А где таймер? :(";
    }
    this.timerState.timerInterval.addTime(30 * 1000);
    return "30 секунд добавлены!";
  }
}

export default MusicGameScene;
