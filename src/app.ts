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
    configService: IConfigService,
    musicGuessService: MusicGuessService,
    userService: UserService,
    sceneService: SceneService,
  ) {
    this.bot = new Telegraf<IBotContext>(configService.get("BOT_TOKEN"));

    this.bot.use(session());

    const globalScene = new GlobalScene(userService, musicGuessService);
    const musicGuessScene = new MusicGuessScene(userService);
    const musicGameScene = new MusicGameScene(musicGuessService, userService);

    // Create stage and add scenes
    this.stage = new Scenes.Stage<IBotContext>(
      [globalScene, musicGuessScene, musicGameScene],
      {
        default: "global",
      },
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
  new SceneService(),
);

bot.init();
