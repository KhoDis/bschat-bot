import { Context, Scenes } from "telegraf";
import { IBotContext } from "../../../../context/context.interface";
import { MusicGuessService } from "../../../services/musicGuess.service";
import { UserService } from "../../../services/UserService";
import Timer from "../../../../utils/Timer";
import { formatTime } from "../../../../utils/timeUtils";
import TimerInterval from "../../../../utils/TimerInterval";

interface TimerState {
  messageId: number | null;
  timerInterval: TimerInterval | null;
}

class MusicWaitingScene extends Scenes.BaseScene<IBotContext> {
  static readonly SCENE_NAME = "MUSIC_WAITING_SCENE";
  private static readonly TIMER_UPDATE_INTERVAL = 5000;
  private static readonly INITIAL_WAIT_TIME = 2 * 60 * 1000; // 2 minutes
  private static readonly ADMIN_USERNAME = "khodis";

  private readonly timerState: TimerState = {
    messageId: null,
    timerInterval: null,
  };

  private musicGuessService: MusicGuessService;
  private userService: UserService;

  constructor(musicGuessService: MusicGuessService, userService: UserService) {
    super(MusicWaitingScene.SCENE_NAME);

    this.musicGuessService = musicGuessService;
    this.userService = userService;

    this.setupHandlers();
  }

  private setupHandlers() {
    this.enter(async (ctx) => {
      await ctx.reply("Это игра Угадай Музыку! Пингуем и ждём 2 минуты.");

      const participants = await this.pingParticipants(ctx);
      if (!participants) return;

      // Start timer
      await this.initializeGameTimer(ctx);

      // Start game or add extra time
      await this.showGameControls(ctx);
    });

    this.command("add_30s", async (ctx) => {
      const response = await this.addExtraTime();
      await ctx.reply(response);
    });

    this.command("start_game", async (ctx) => {
      // Check if user sending this command is @khodis
      if (ctx.from.username !== "khodis") {
        await ctx.reply(
          "Только @khodis может насильно начинать следующий раунд :)"
        );
        return;
      }

      // Stop timer and start next round
      await this.startGame(ctx);
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
          await this.startGame(ctx);
          break;
        case "add_30s":
          const response = await this.addExtraTime();
          await ctx.answerCbQuery(response);
          break;
      }
    });
  }

  private async showGameControls(ctx: Context): Promise<void> {
    await ctx.reply("Что хотите сделать?", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Начать Игру",
              callback_data: "service:next_round",
            },
          ],
          [{ text: "Добавить 30 секунд", callback_data: "service:add_30s" }],
        ],
      },
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

    this.timerState.messageId = timerMessage.message_id;

    const timerInterval = new TimerInterval(
      async () => await this.startGame(ctx),
      MusicWaitingScene.INITIAL_WAIT_TIME,
      async () =>
        await ctx.telegram.editMessageText(
          ctx.chat!.id,
          this.timerState.messageId!,
          undefined,
          `Осталось: ${formatTime(timerInterval.getRemainingTime())}`
        ),
      MusicWaitingScene.TIMER_UPDATE_INTERVAL
    );

    this.timerState.timerInterval = timerInterval;
  }

  private async startGame(ctx: Context): Promise<void> {
    if (!this.timerState.timerInterval) {
      return;
    }
    this.timerState.timerInterval.clear();

    if (!this.musicGuessService.isGameStarted()) {
      await this.musicGuessService.startGame(ctx);
      return;
    }
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

export default MusicWaitingScene;
