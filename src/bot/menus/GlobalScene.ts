import { Scenes } from "telegraf";
import { IBotContext } from "../../context/context.interface";
import { UserService } from "../services/UserService";
import handleCheckMusic from "../handlers/handleCheckMusic";
import { message } from "telegraf/filters";
import { MusicGuessService } from "../services/musicGuess.service";

class PrivateGlobalScene extends Scenes.BaseScene<IBotContext> {
  constructor(
    private userService: UserService,
    private musicGuessService: MusicGuessService
  ) {
    super("global");

    this.setupHandlers();
  }

  setupHandlers() {
    this.enter(async (ctx) => {
      await ctx.reply(
        "Привет! Отправь мне музыку или проверь сколько участников с помощью команды /check_music"
      );
    });

    this.command("check_music", async (ctx) =>
      handleCheckMusic(ctx, this.userService)
    );

    this.command("music_guess", async (ctx) => {
      if (ctx.chat.type === "private") {
        await ctx.reply(
          "Если это музыка на событие, то отправьте ее в личку :)"
        );
        return;
      }
      if (ctx.from.username === "khodis") {
        await ctx.scene.enter("music_guess");
      }
    });

    this.action(/^guess:(.+)$/, async (ctx) => {
      const action = ctx.match[1];
      if (!action) return;
      const [roundId, guessId] = action.split("_");
      console.log("Нажата кнопка", roundId, guessId);

      if (!roundId || !guessId) {
        ctx.reply(`Не смог запарсить данные: ${action}`);
        return;
      }
      await this.musicGuessService.processGuess(ctx, +roundId, +guessId);
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
  }
}

export default PrivateGlobalScene;
