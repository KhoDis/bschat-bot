import { Scenes, session, Telegraf } from "telegraf";
import { IConfigService } from "./config/config.interface";
import { ConfigService } from "./config/config.service";
import { IBotContext } from "./context/context.interface";
import { MusicGuessService } from "./bot/services/musicGuess.service";
import { UserService } from "./bot/services/UserService";
import GlobalScene from "./bot/menus/GlobalScene";
import { GameRepository } from "./bot/repositories/GameRepository";
import { MusicSubmissionRepository } from "./bot/repositories/MusicSubmissionRepository";

class Bot {
  bot: Telegraf<IBotContext>;
  stage: Scenes.Stage<IBotContext, Scenes.SceneSessionData>;

  constructor(
    configService: IConfigService,
    musicGuessService: MusicGuessService,
    userService: UserService,
    gameRepository: GameRepository,
  ) {
    this.bot = new Telegraf<IBotContext>(configService.get("BOT_TOKEN"));

    this.bot.use(session());

    const globalScene = new GlobalScene(
      userService,
      musicGuessService,
      gameRepository,
    );

    // Create stage and add scenes
    this.stage = new Scenes.Stage<IBotContext>([globalScene], {
      default: "global",
    });

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

const gameRepository = new GameRepository();

const bot = new Bot(
  new ConfigService(),
  new MusicGuessService(gameRepository, new MusicSubmissionRepository()),
  new UserService(),
  gameRepository,
);

bot.init();
