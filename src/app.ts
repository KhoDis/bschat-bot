import { Scenes, session, Telegraf } from "telegraf";
import { IConfigService } from "./config/config.interface";
import { ConfigService } from "./config/config.service";
import prisma from "./prisma/client";
import { IBotContext } from "./context/context.interface";
import { Command } from "./bot/commands/command.class";
import { StartCommand } from "./bot/commands/start.command";
import { IMusicGuessService } from "./bot/events/musicGuess.interface";
import { MusicGuessService } from "./bot/events/musicGuess.service";
import { message } from "telegraf/filters";

class Bot {
  bot: Telegraf<IBotContext>;
  commands: Command[] = [];
  //   stage: Scenes.Stage<Scenes.SceneContext>;

  constructor(
    private readonly configService: IConfigService,
    private readonly musicGuessService: IMusicGuessService
  ) {
    this.bot = new Telegraf<IBotContext>(this.configService.get("BOT_TOKEN"));
  }

  init() {
    // this.commands = [new StartCommand(this.bot)];
    // for (const command of this.commands) {
    //   command.handle();
    // }

    console.log("Starting bot...");

    this.bot.on(message("audio"), async (ctx) => {
      // Check if it's private message
      if (ctx.chat.type !== "private") {
        await ctx.reply(
          "Если это музыка на событие, то отправьте ее в личку :)"
        );
        return;
      }

      // Save User
      await prisma.user.upsert({
        where: { id: ctx.from.id },
        create: {
          id: ctx.from.id,
          tag: ctx.from.username || null,
          name: ctx.from.first_name,
        },
        update: {
          tag: ctx.from.username || null,
          name: ctx.from.first_name,
        },
      });

      const userId = ctx.from.id;
      const fileId = ctx.message.audio.file_id;

      if (userId && fileId) {
        // Check if user has already submitted a track
        const existingTrack = await prisma.musicSubmission.findFirst({
          where: { userId },
        });

        if (existingTrack) {
          await prisma.musicSubmission.update({
            where: { userId },
            data: { fileId },
          });

          await ctx.reply(
            "Песня обновлена! Она будет использоваться в событии :)"
          );
          return;
        }

        await prisma.musicSubmission.create({
          data: {
            userId,
            fileId,
          },
        });

        await ctx.reply(
          "Песня отправлена! Она будет использоваться в событии :)"
        );
      } else {
        await ctx.reply(
          `Что-то пошло не так :(, попробуйте ещё. Отправьте это сообщение @khodis:\nuserId: ${userId}, fileId: ${fileId}`
        );
      }
    });

    this.bot.command("start_event", async (ctx) => {
      ctx.reply("Пытаемся запустить событие...");
      // Check if user sending this command is @khodis
      if (ctx.from.username !== "khodis") {
        await ctx.reply("Только @khodis может запустить событие :)");
        return;
      }
      ctx.reply("Проверка прошла успешно");

      await this.musicGuessService.startGame(ctx);
    });

    this.bot.command("next_round", async (ctx) => {
      // Check if user sending this command is @khodis
      if (ctx.from.username !== "khodis") {
        await ctx.reply("Только @khodis может запустить событие :)");
        return;
      }

      await this.musicGuessService.nextRound(ctx);
    });

    this.bot.command("check_music", async (ctx) => {
      // Check how many people and who has submitted music
      const musicSubmissions = await prisma.musicSubmission.findMany({});
      const uniqueUsers = new Set(musicSubmissions.map((s) => s.userId));

      const userMap = new Map(
        (
          await prisma.user.findMany({
            where: { id: { in: [...uniqueUsers] } },
          })
        ).map((user) => [user.id, user])
      );

      await ctx.reply(
        `Всего участников: ${uniqueUsers.size}\n\n` +
          [...userMap.values()]
            .map((user) => `${user.name} ${user.tag ? `(${user.tag})` : ""}`)
            .join("\n")
      );
    });

    this.bot.action(/guess_(.+)/, async (ctx) => {
      const guessData = ctx.match[1]!.split("_"); // TODO: make callback system more robust
      const guessedUserId = guessData[0] ? parseInt(guessData[0]) : null; // User's picked option

      console.log(`Button pressed for user ID: ${guessedUserId}`);

      if (!guessedUserId) {
        await ctx.answerCbQuery("Почему-то id пользователя не нашлось :(");
        return Promise.resolve();
      }

      await this.musicGuessService.processGuess(ctx, guessedUserId);
    });

    this.bot.catch((err) => {
      console.error("Bot error:", err);
    });

    this.bot
      .launch()
      .then(() => console.log("Bot launched"))
      .catch(console.error);
  }
}

const bot = new Bot(new ConfigService(), new MusicGuessService());

bot.init();
