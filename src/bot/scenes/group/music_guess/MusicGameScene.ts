import { Scenes } from "telegraf";
import { IBotContext } from "../../../../context/context.interface";
import { MusicGuessService } from "../../../services/musicGuess.service";
import { UserService } from "../../../services/UserService";
import Timer from "../../../../utils/Timer";

class MusicGameScene extends Scenes.BaseScene<IBotContext> {
  static sceneName = "MUSIC_GAME_SCENE";

  private musicGuessService: MusicGuessService;
  private userService: UserService;

  private timer: Timer | null = null;

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
      const message = `@${participants
        .map(
          async (p) =>
            `[${await this.userService.getFormattedUser(
              Number(p.userId)
            )}](tg://user?id=${p.userId})`
        )
        .join("\n")}`;
      await ctx.reply(message);

      // Start game after 2 minutes
      this.timer = new Timer(
        async () => await this.musicGuessService.startGame(ctx),
        2 * 60 * 1000
      );

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
        await ctx.reply("Только @khodis может запустить событие :)");
        return;
      }

      await this.musicGuessService.nextRound(ctx);
    });

    this.action(/^service:(.+)$/, async (ctx) => {
      const serviceName = ctx.match[1];

      switch (serviceName) {
        case "next_round":
          // Check if user sending this command is @khodis
          if (ctx.from.username !== "khodis") {
            await ctx.answerCbQuery(
              "Только @khodis может запустить событие :)"
            );
            return;
          }

          await this.musicGuessService.nextRound(ctx);
          break;
        case "add_30s":
          // Add 30 seconds to the game timer
          if (this.timer) {
            const added = this.timer.addTime(30 * 1000);
            if (added) {
              await ctx.reply("Добавлено 30 секунд.");
            } else {
              await ctx.answerCbQuery("Уже поздно :(");
            }
          } else {
            await ctx.answerCbQuery("Ещё ничего не играется.");
          }
          break;
      }
    });

    this.command("music_guess", async (ctx) => {
      // Check that it's from admin (@khodis)
      if (ctx.from.username !== "khodis") {
        await ctx.reply("Только @khodis может запустить событие :)");
        return;
      }
      await ctx.scene.enter("MUSIC_GAME_SCENE");
    });

    this.command("other", async (ctx) => {
      await ctx.reply("Извините, другие услуги пока в разработке.");
    });
  }
}

export default MusicGameScene;
