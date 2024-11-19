import { Scenes } from "telegraf";
import { IBotContext } from "../../../../context/context.interface";
import { MusicGuessService } from "../../../services/musicGuess.service";
import { UserService } from "../../../services/UserService";

// Music Guess Service Scene
export class MusicGuessScene extends Scenes.BaseScene<IBotContext> {
  private userService: UserService;

  constructor(userService: UserService) {
    super("MUSIC_GUESS_SCENE");
    this.userService = userService;

    this.setupHandlers();
  }

  private setupHandlers() {
    this.enter(async (ctx) => {
      await ctx.reply("Меню Угадай Музыку:", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎧 Отправить Трек",
                callback_data: "action:submit_track",
              },
              { text: "📊 Статистика", callback_data: "action:music_stats" },
            ],
            [{ text: "🔙 Главное Меню", callback_data: "action:back_to_main" }],
          ],
        },
      });
    });

    this.action(/^action:(.+)$/, async (ctx) => {
      const action = ctx.match[1];

      switch (action) {
        case "submit_track":
          await ctx.answerCbQuery();
          await ctx.scene.enter("MUSIC_UPLOAD_SCENE");
          break;
        case "music_stats":
          await ctx.answerCbQuery();
          const users = await this.userService.getUserSubmissions();
          await ctx.reply(
            `Всего участников: ${users.length}\n\n` +
              users
                .map(
                  (user) => `${user.name} ${user.tag ? `(${user.tag})` : ""}`
                )
                .join("\n")
          );
          break;
        case "back_to_main":
          await ctx.answerCbQuery();
          await ctx.scene.enter("MAIN_MENU_SCENE");
          break;
      }
    });
  }
}

export default MusicGuessScene;
