import { Context, Scenes } from "telegraf";
import { IBotContext } from "../../../../context/context.interface";
import { MusicGuessService } from "../../../services/musicGuess.service";
import { UserService } from "../../../services/UserService";
import Timer from "../../../../utils/Timer";
import { formatTime } from "../../../../utils/timeUtils";

class MusicGameScene extends Scenes.BaseScene<IBotContext> {
  static sceneName = "MUSIC_GAME_SCENE";

  private musicGuessService: MusicGuessService;
  private userService: UserService;

  private timer: Timer | null = null;
  private timerMessageId: number | null = null; // To track the timer message
  private timerInterval: NodeJS.Timeout | null = null; // To track the interval

  constructor(musicGuessService: MusicGuessService, userService: UserService) {
    super(MusicGameScene.sceneName);

    this.musicGuessService = musicGuessService;
    this.userService = userService;

    this.setupHandlers();
  }

  private setupHandlers() {
    this.enter(async (ctx) => {
      await ctx.reply("Это игра Угадай Музыку! Пингуем и ждём 2 минуты.");

      // Ping all participants (tag all of them)
      const participants = await this.musicGuessService.getTracks();

      if (!participants.length) {
        await ctx.reply("Никто не решился учавствовать :(");
        return Promise.resolve();
      }

      const names = participants.map(
        async (p) =>
          `[${await this.userService.getFormattedUser(
            Number(p.userId)
          )}](tg://user?id=${p.userId})`
      );
      // Await all promises
      const formattedNames = await Promise.all(names);
      await ctx.replyWithMarkdown(formattedNames.join("\n"));

      // Start game after 2 minutes with timer
      const duration = 2 * 60 * 1000; // 2 minutes in milliseconds

      // Initialize the actual game logic
      const timer = new Timer(() => this.nextRound(ctx), duration);

      this.timer = timer;
      timer.start();

      // Send initial timer message and store its ID
      const timerMessage = await ctx.reply(`Осталось: ...`);
      this.timerMessageId = timerMessage.message_id;

      // Start updating the timer message every second
      this.timerInterval = setInterval(async () => {
        const remainingTime = timer.getRemainingTime();
        console.log(remainingTime);
        if (remainingTime <= 0) {
          clearInterval(this.timerInterval!); // Clear interval when time is up
          this.timerInterval = null;
          return;
        }

        try {
          // Edit the timer message
          await ctx.telegram.editMessageText(
            ctx.chat!.id,
            this.timerMessageId!,
            undefined,
            `Осталось: ${formatTime(remainingTime)}`
          );
        } catch (error) {
          console.error("Failed to update timer message:", error);
          clearInterval(this.timerInterval!);
        }
      }, 5000);

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
      // Add 30 seconds to the game timer
      if (this.timer) {
        const added = this.timer.addTime(30 * 1000);
        if (added) {
          await ctx.reply("Добавлено 30 секунд.");
        } else {
          await ctx.reply("Уже поздно :(");
        }
      } else {
        await ctx.reply("Ещё ничего не играется.");
      }
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
      this.timer?.clear();
      await this.musicGuessService.nextRound(ctx);
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
          this.nextRound(ctx);
          break;
        case "add_30s":
          // Add 30 seconds to the game timer
          if (this.timer) {
            const added = this.timer.addTime(30 * 1000);
            if (added) {
              await ctx.answerCbQuery("Добавлено 30 секунд.");
            } else {
              await ctx.answerCbQuery("Уже поздно :(");
            }
          } else {
            await ctx.answerCbQuery("Ещё ничего не играется.");
          }
          break;
      }
    });
  }

  private async nextRound(ctx: Context) {
    // Stop the timer and edit the message when time is up
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    // Clear the timer
    this.timer?.clear();
    this.timer = null;
    await ctx.telegram.editMessageText(
      ctx.chat!.id,
      this.timerMessageId!,
      undefined,
      "Время вышло!"
    );
    if (!this.musicGuessService.isGameStarted()) {
      await this.musicGuessService.startGame(ctx);
      return;
    }
    await this.musicGuessService.nextRound(ctx);
  }
}

export default MusicGameScene;
