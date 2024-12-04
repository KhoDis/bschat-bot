import { Scenes, session, Telegraf } from "telegraf";
import { IConfigService } from "./config/config.interface";
import { ConfigService } from "./config/config.service";
import { IBotContext } from "./context/context.interface";
import { Command } from "./bot/commands/command.class";
import { MusicGuessService } from "./bot/services/musicGuess.service";
import { UserService } from "./bot/services/UserService";
import SceneService from "./bot/services/SceneService";
import GlobalScene from "./bot/menus/GlobalScene";
import MusicGuessScene from "./bot/menus/MusicGuessScene";
import MusicGameScene from "./bot/menus/MusicGameScene";

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

    // // Create private scenes
    // const mainMenuScene = new PrivateRootScene(this.sceneService);
    // const musicGuessMenuScene = new MusicGuessScene(
    //   this.sceneService,
    //   this.userService
    // );
    // const musicUploadScene = new MusicGuessUploadScene(
    //   this.sceneService,
    //   this.userService
    // );

    // // Create chat scenes
    // const groupMainMenuScene = new GroupMainMenuScene(this.musicGuessService);
    // const musicGameScene = new MusicGameScene(
    //   this.musicGuessService,
    //   this.userService
    // );
    // const musicWaitingScene = new MusicWaitingScene(
    //   this.musicGuessService,
    //   this.userService
    // );

    // const rootScene = new RootScene(this.sceneService);
    // const pongScene = new PongScene(this.sceneService);

    // const privateGlobalScene = new GlobalScene(userService);
    const globalScene = new GlobalScene(userService, musicGuessService);
    const musicGuessScene = new MusicGuessScene(userService);
    const musicGameScene = new MusicGameScene(musicGuessService, userService);

    // Create stage and add scenes
    this.stage = new Scenes.Stage<IBotContext>(
      [
        // mainMenuScene,
        // musicGuessMenuScene,
        // musicUploadScene,
        // groupMainMenuScene,
        // musicGameScene,
        // musicWaitingScene,
        // rootScene,
        // pongScene,

        globalScene,
        musicGuessScene,
        musicGameScene,
      ],
      {
        default: "global",
      }
    );

    this.bot.use(this.stage.middleware());
  }

  init() {
    console.log("Starting bot...");

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
