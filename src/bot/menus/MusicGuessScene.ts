import { Scenes } from "telegraf";
import { IBotContext } from "../../context/context.interface";
import { UserService } from "../services/UserService";
import handleCheckMusic from "../handlers/handleCheckMusic";

class MusicGuessScene extends Scenes.BaseScene<IBotContext> {
  constructor(private userService: UserService) {
    super("music_guess");

    this.setupHandlers();
  }

  setupHandlers() {
    this.enter(async (ctx) => {
      await ctx.reply(
        "Привет! Это меню Угадай Музыку.\n\nКогда все будут готовы, нажмите 'Начать сейчас'",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Начать сейчас",
                  callback_data: "service:start_game",
                },
              ],
            ],
          },
        }
      );

      await this.userService.pingParticipants(ctx);
    });

    this.action(/^service:(.+)$/, async (ctx) => {
      const action = ctx.match[1];
      if (action === "start_game") {
        await ctx.scene.enter("music_game");
        await ctx.answerCbQuery();
      } else if (action === "check_music") {
        await handleCheckMusic(ctx, this.userService);
      }
    });

    this.command("cancel", async (ctx) => ctx.scene.leave());
  }
}

export default MusicGuessScene;
