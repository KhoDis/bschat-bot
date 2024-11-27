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
import MusicWaitingScene from "./bot/scenes/group/music_guess/MusicWaitingScene";
import { RootScene, PongScene } from "./bot/temp/Scenes";
import SceneService from "./bot/services/SceneService";

class Bot {
  bot: Telegraf<IBotContext>;
  commands: Command[] = [];
  stage: Scenes.Stage<IBotContext, Scenes.SceneSessionData>;

  constructor(
    private readonly configService: IConfigService,
    private readonly musicGuessService: MusicGuessService,
    private readonly userService: UserService,
    private readonly sceneService: SceneService
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
    const musicWaitingScene = new MusicWaitingScene(
      this.musicGuessService,
      this.userService
    );

    const rootScene = new RootScene(this.sceneService);
    const pongScene = new PongScene(this.sceneService);

    // Create stage and add scenes
    this.stage = new Scenes.Stage<IBotContext>([
      mainMenuScene,
      musicGuessMenuScene,
      musicUploadScene,
      groupMainMenuScene,
      musicGameScene,
      musicWaitingScene,
      rootScene,
      pongScene,
    ]);

    this.bot.use(this.stage.middleware());
  }

  init() {
    console.log("Starting bot...");

    // Global commands
    this.bot.command("start", async (ctx) => {
      // Check if it's a private message
      if (ctx.chat.type === "private") {
        // await ctx.scene.enter(PrivateMainMenuScene.sceneName);
        await ctx.scene.enter(RootScene.DEFINITION.displayName);
      } else {
        await ctx.scene.enter(GroupMainMenuScene.sceneName);
      }
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

const bot = new Bot(
  new ConfigService(),
  new MusicGuessService(),
  new UserService(),
  new SceneService()
);

bot.init();
