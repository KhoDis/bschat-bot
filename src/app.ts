import { Scenes, session, Telegraf } from "telegraf";
import { IConfigService } from "./config/config.interface";
import { ConfigService } from "./config/config.service";
import { IBotContext } from "./context/context.interface";
import { MusicGameService } from "./bot/services/musicGameService";
import { UserService } from "./bot/services/UserService";
import GlobalScene from "./bot/menus/GlobalScene";
import { GameRepository } from "./bot/repositories/GameRepository";
import { MusicSubmissionRepository } from "./bot/repositories/MusicSubmissionRepository";
import { LeaderboardService } from "./bot/services/LeaderboardService";
import { RoundService } from "./bot/services/RoundService";
import { GuessService } from "./bot/services/GuessService";
import { botResponses, BotResponses } from "./config/botResponses";
import { GuessValidationService } from "./bot/services/GuessValidationService";

class Bot {
  bot: Telegraf<IBotContext>;
  stage: Scenes.Stage<IBotContext, Scenes.SceneSessionData>;

  constructor(
    configService: IConfigService,
    musicGuessService: MusicGameService,
    userService: UserService,
    gameRepository: GameRepository,
    botResponses: BotResponses,
    guessService: GuessService,
    roundService: RoundService,
    leaderboardService: LeaderboardService,
  ) {
    this.bot = new Telegraf<IBotContext>(configService.get("BOT_TOKEN"));

    this.bot.use(session());

    const globalScene = new GlobalScene(
      userService,
      musicGuessService,
      gameRepository,
      botResponses,
      guessService,
      roundService,
      leaderboardService,
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
  new MusicGameService(gameRepository, new MusicSubmissionRepository()),
  new UserService(),
  gameRepository,
  botResponses,
  new GuessService(
    gameRepository,
    new GuessValidationService(gameRepository, botResponses),
    botResponses,
  ),
  new RoundService(gameRepository, botResponses),
  new LeaderboardService(gameRepository, botResponses),
);

bot.init();
