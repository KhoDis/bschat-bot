import { Scenes, session, Telegraf } from "telegraf";
import { IConfigService } from "./config/config.interface";
import { ConfigService } from "./config/config.service";
import { IBotContext } from "./context/context.interface";
import { Command } from "./bot/commands/command.class";
import { MusicGuessService } from "./bot/services/musicGuess.service";
import MainMenuScene from "./bot/scenes/private/PrivateMainMenuScene";
import MusicGuessScene from "./bot/scenes/private/music/MusicGuessScene";
import { UserService } from "./bot/services/UserService";
import MusicUploadScene from "./bot/scenes/private/music/MusicUploadScene";
import PrivateMainMenuScene from "./bot/scenes/private/PrivateMainMenuScene";
import GroupMainMenuScene from "./bot/scenes/group/GroupMainMenuScene";
import MusicGameScene from "./bot/scenes/group/music_guess/MusicGameScene";

class Bot {
  bot: Telegraf<IBotContext>;
  commands: Command[] = [];
  stage: Scenes.Stage<Scenes.SceneContext>;

  constructor(
    private readonly configService: IConfigService,
    private readonly musicGuessService: MusicGuessService,
    private readonly userService: UserService
  ) {
    this.bot = new Telegraf<IBotContext>(this.configService.get("BOT_TOKEN"));

    this.bot.use(session());

    // Create private scenes
    const mainMenuScene = new MainMenuScene();
    const musicGuessMenuScene = new MusicGuessScene(this.userService);
    const musicUploadScene = new MusicUploadScene(this.userService);

    // Create chat scenes
    const groupMainMenuScene = new GroupMainMenuScene(this.musicGuessService);
    const musicGameScene = new MusicGameScene(
      this.musicGuessService,
      this.userService
    );

    // Create stage and add scenes
    this.stage = new Scenes.Stage<IBotContext>([
      mainMenuScene,
      musicGuessMenuScene,
      musicUploadScene,
      groupMainMenuScene,
      musicGameScene,
    ]);

    this.bot.use(this.stage.middleware());
  }

  init() {
    console.log("Starting bot...");

    // Global commands
    this.bot.command("start", async (ctx) => {
      // Check if it's a private message
      if (ctx.chat.type === "private") {
        await ctx.scene.enter(PrivateMainMenuScene.sceneName);
      } else {
        await ctx.scene.enter(GroupMainMenuScene.sceneName);
      }
    });

    // this.bot.command("check_music", async (ctx) => {
    //   // Check how many people and who has submitted music
    //   const musicSubmissions = await prisma.musicSubmission.findMany({});
    //   const uniqueUsers = new Set(musicSubmissions.map((s) => s.userId));

    //   const userMap = new Map(
    //     (
    //       await prisma.user.findMany({
    //         where: { id: { in: [...uniqueUsers] } },
    //       })
    //     ).map((user) => [user.id, user])
    //   );

    //   await ctx.reply(
    //     `Всего участников: ${uniqueUsers.size}\n\n` +
    //       [...userMap.values()]
    //         .map((user) => `${user.name} ${user.tag ? `(${user.tag})` : ""}`)
    //         .join("\n")
    //   );
    // });

    // this.bot.action(/guess_(.+)/, async (ctx) => {
    //   const guessData = ctx.match[1]!.split("_"); // TODO: make callback system more robust
    //   const guessedUserId = guessData[0] ? parseInt(guessData[0]) : null; // User's picked option

    //   console.log(`Button pressed for user ID: ${guessedUserId}`);

    //   if (!guessedUserId) {
    //     await ctx.answerCbQuery("Почему-то id пользователя не нашлось :(");
    //     return Promise.resolve();
    //   }

    //   await this.musicGuessService.processGuess(ctx, guessedUserId);
    // });

    this.bot.catch((err) => {
      console.error("Bot error:", err);
    });

    this.bot
      .launch()
      .then(() => console.log("Bot launched"))
      .catch(console.error);
  }
}

const bot = new Bot(
  new ConfigService(),
  new MusicGuessService(),
  new UserService()
);

bot.init();
