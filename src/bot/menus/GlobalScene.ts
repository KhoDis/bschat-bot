import { Scenes } from "telegraf";
import { IBotContext } from "../../context/context.interface";
import { UserService } from "../services/UserService";
import handleCheckMusic from "../handlers/handleCheckMusic";
import { message } from "telegraf/filters";
import { MusicGuessService } from "../services/musicGuess.service";

class PrivateGlobalScene extends Scenes.BaseScene<IBotContext> {
  constructor(
    private userService: UserService,
    private musicGuessService: MusicGuessService,
  ) {
    super("global");

    this.setupHandlers();
  }

  setupHandlers() {
    this.enter(async (ctx) => {
      await ctx.reply(
        "Привет! Отправь мне музыку или проверь сколько участников с помощью команды /check_music",
      );
    });

    this.command("check_music", async (ctx) =>
      handleCheckMusic(ctx, this.userService),
    );

    this.command("music_guess", async (ctx) => {
      if (ctx.chat.type === "private") {
        await ctx.reply(
          "Игра работает только в группе, нажмите /music_guess в группе",
        );
        return;
      }
      if (ctx.from.username !== "khodis") {
        return;
      }

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
        },
      );

      await this.userService.pingParticipants(ctx);
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

    this.action(/^service:(.+)$/, async (ctx) => {
      const action = ctx.match[1];
      if (action === "start_game") {
        // Initialize game state if there is no game yet
        const existingGame = await this.musicGuessService.isGameStarted();
        if (!existingGame) {
          await ctx.reply("Я не нашёл уже существующей игры, начинаю новую");
          await this.musicGuessService.startGame(ctx);
        }

        await ctx.reply("Я нашёл уже существующую игру, продолжаю её");

        // Play first round (0-th round)
        await this.musicGuessService.processRound(ctx);

        await ctx.answerCbQuery();
      }
    });

    this.command("next_round", async (ctx) => {
      if (ctx.from.username !== "khodis") {
        await ctx.reply(
          "Только @khodis может насильно начинать следующий раунд :)",
        );
        return;
      }
      await this.musicGuessService.nextRound(ctx);
    });

    this.on(message("audio"), async (ctx) => {
      // Check if it's private message
      if (ctx.chat.type !== "private") {
        await ctx.reply(
          "Если это музыка на событие, то отправьте ее в личку :)",
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
          `Что-то пошло не так :(, попробуйте ещё. Отправьте это сообщение @khodis:\nuserId: ${userId}, fileId: ${fileId}`,
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
