import { session, Telegraf } from "telegraf";
import { IConfigService } from "./config/config.interface";
import { ConfigService } from "./config/config.service";
import { IBotContext } from "./context/context.interface";
import { MusicGameService } from "./bot/services/musicGameService";
import { UserService } from "./bot/services/UserService";
import { GameRepository } from "./bot/repositories/GameRepository";
import { MusicSubmissionRepository } from "./bot/repositories/MusicSubmissionRepository";
import { LeaderboardService } from "./bot/services/LeaderboardService";
import { RoundService } from "./bot/services/RoundService";
import { GuessService } from "./bot/services/GuessService";
import { botResponses } from "./config/botResponses";
import { GuessValidationService } from "./bot/services/GuessValidationService";
import { GlobalComposer } from "./bot/composers/GlobalComposer";
import { PrivateComposer } from "./bot/composers/PrivateComposer";
import { JokerComposer } from "./bot/composers/JokerComposer";
import { GroupComposer } from "./bot/composers/GroupComposer";

class Bot {
  bot: Telegraf<IBotContext>;

  constructor(
    privateComposer: PrivateComposer,
    groupComposer: GroupComposer,
    globalComposer: GlobalComposer,
    jokerComposer: JokerComposer,
    configService: IConfigService,
  ) {
    this.bot = new Telegraf<IBotContext>(configService.get("BOT_TOKEN"));

    const privateMiddleware = privateComposer.middleware();
    const groupMiddleware = groupComposer.middleware();
    const globalMiddleware = globalComposer.middleware();
    const jokerMiddleware = jokerComposer.middleware();

    this.bot.use(session());

    this.bot.use((ctx, next) => {
      if (!ctx.chat) {
        return next();
      }
      if (ctx.chat.type === "private") {
        return privateMiddleware(ctx, next);
      } else {
        return groupMiddleware(ctx, next);
      }
    });

    this.bot.use(globalMiddleware);
    this.bot.use(jokerMiddleware);
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

const userService = new UserService();
const musicGameService = new MusicGameService(
  gameRepository,
  new MusicSubmissionRepository(),
);
const roundService = new RoundService(gameRepository, botResponses);
const leaderboardService = new LeaderboardService(gameRepository, botResponses);
const guessService = new GuessService(
  gameRepository,
  new GuessValidationService(gameRepository, botResponses),
  botResponses,
);

const bot = new Bot(
  new PrivateComposer(userService, musicGameService, botResponses),
  new GroupComposer(
    userService,
    roundService,
    musicGameService,
    guessService,
    leaderboardService,
    botResponses,
  ),
  new GlobalComposer(userService, leaderboardService, botResponses),
  new JokerComposer(userService, botResponses),
  new ConfigService(),
);

bot.init();
