import { Scenes } from "telegraf";
import { IBotContext } from "../../../../context/context.interface";
import { message } from "telegraf/filters";
import { UserService } from "../../../services/UserService";

export class MusicUploadScene extends Scenes.BaseScene<IBotContext> {
  private userService: UserService;
  constructor(userService: UserService) {
    super("MUSIC_UPLOAD_SCENE");

    this.userService = userService;

    this.setupHandlers();
  }

  private setupHandlers() {
    this.enter(async (ctx) => {
      await ctx.reply("Загрузите трек", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Главное Меню", callback_data: "action:back_to_main" }],
          ],
        },
      });
    });

    this.on(message("audio"), async (ctx) => {
      // Check if it's private message
      if (ctx.chat.type !== "private") {
        await ctx.reply(
          "Если это музыка на событие, то отправьте ее в личку :)"
        );
        return;
      }

      // Save User
      await this.userService.saveOrUpdateUser({
        id: ctx.from.id,
        username: ctx.from.username || null,
        firstName: ctx.from.first_name,
      });

      const userId = ctx.from.id;
      const fileId = ctx.message.audio.file_id;

      if (!userId || !fileId) {
        await ctx.reply(
          `Что-то пошло не так :(, попробуйте ещё. Отправьте это сообщение @khodis:\nuserId: ${userId}, fileId: ${fileId}`
        );
        return;
      }

      await this.userService.saveOrUpdateSubmission({
        userId,
        fileId,
      });

      await ctx.reply("Спасибо за трек! Ждите эвент :)");
    });

    this.action(/^action:(.+)$/, async (ctx) => {
      const action = ctx.match[1];

      switch (action) {
        case "back_to_main":
          await ctx.scene.enter("MAIN_MENU_SCENE");
          break;
        default:
          await ctx.reply("Что-то пошло не так :(");
      }
    });
  }
}

export default MusicUploadScene;
