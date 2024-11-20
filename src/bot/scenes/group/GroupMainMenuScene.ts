import { Scenes } from "telegraf";
import { IBotContext } from "../../../context/context.interface";
import { MusicGuessService } from "../../services/musicGuess.service";
import MusicWaitingScene from "./music_guess/MusicWaitingScene";
import prisma from "../../../prisma/client";

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
              {
                text: "🎲 Проверить Музыку",
                callback_data: "service:check_music",
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
          await ctx.scene.enter(MusicWaitingScene.SCENE_NAME);
          break;
        case "check_music":
          await this.handleCheckMusic(ctx);
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
      await ctx.scene.enter(MusicWaitingScene.SCENE_NAME);
    });

    this.command("check_music", async (ctx) => {
      await this.handleCheckMusic(ctx);
    });

    this.command("other", async (ctx) => {
      await ctx.reply("Извините, другие услуги пока в разработке.");
    });
  }

  async handleCheckMusic(ctx: IBotContext) {
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
  }
}

export default GroupMainMenuScene;
