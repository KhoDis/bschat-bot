import { Scenes } from "telegraf";
import { IBotContext } from "../../../context/context.interface";

export class MainMenuScene extends Scenes.BaseScene<IBotContext> {
  static sceneName = "PRIVATE_MAIN_MENU_SCENE";

  constructor() {
    super(MainMenuScene.sceneName);

    this.setupHandlers();
  }

  private setupHandlers() {
    this.enter(async (ctx) => {
      await ctx.reply("Выберите услугу:", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎵 Угадай Музыку",
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
          await ctx.answerCbQuery();
          await ctx.scene.enter("MUSIC_GUESS_SCENE");
          break;
        case "other":
          await ctx.answerCbQuery();
          await ctx.reply("Извините, другие услуги пока в разработке.");
          break;
      }
    });
  }
}

export default MainMenuScene;
