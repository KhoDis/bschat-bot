import { Scenes } from "telegraf";
import { IBotContext } from "../../../context/context.interface";
import { MusicGuessService } from "../../services/musicGuess.service";

class GroupMainMenuScene extends Scenes.BaseScene<IBotContext> {
  static sceneName = "GROUP_MAIN_MENU_SCENE";
  private musicGuessService: MusicGuessService;

  constructor(musicGuessService: MusicGuessService) {
    super(GroupMainMenuScene.sceneName);

    this.musicGuessService = musicGuessService;

    this.setupHandlers();
  }

  private setupHandlers() {
    this.enter(async (ctx) => {
      await ctx.reply("Выберите услугу:", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎵 Начать Угадывать Музыку",
                callback_data: "service:music_guess",
              },
              { text: "🎲 Другая услуга", callback_data: "service:other" },
            ],
          ],
        },
      });
    });

    this.action(/^service:(.+)$/, async (ctx) => {
      const serviceName = ctx.match[1];

      switch (serviceName) {
        case "music_guess":
          // Check that it's from admin (@khodis)
          if (ctx.from.username !== "khodis") {
            await ctx.answerCbQuery(
              "Только @khodis может запустить событие :)"
            );
            return;
          }
          await ctx.scene.enter("MUSIC_GAME_SCENE");
          break;
        case "other":
          await ctx.answerCbQuery("Извините, другие услуги пока в разработке.");
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

export default GroupMainMenuScene;
