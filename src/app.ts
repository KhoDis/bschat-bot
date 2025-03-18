import { Composer, session, Telegraf } from "telegraf";
import { IConfigService } from "./config/config.interface";
import { ConfigService } from "./config/config.service";
import { IBotContext } from "./context/context.interface";
import { MusicGameService } from "./bot/services/MusicGameService";
import { UserService } from "./bot/services/UserService";
import { GameRepository } from "./bot/repositories/GameRepository";
import { MusicSubmissionRepository } from "./bot/repositories/MusicSubmissionRepository";
import { LeaderboardService } from "./bot/services/LeaderboardService";
import { RoundService } from "./bot/services/RoundService";
import { GuessService } from "./bot/services/GuessService";
import { botTemplates } from "./config/botTemplates";
import { GuessValidationService } from "./bot/services/GuessValidationService";
import { GlobalComposer } from "./bot/composers/GlobalComposer";
import { PrivateComposer } from "./bot/composers/PrivateComposer";
import { JokerComposer } from "./bot/composers/JokerComposer";
import { UserRepository } from "@/bot/repositories/UserRepository";
import { MusicGameComposer } from "@/bot/composers/MusicGameComposer";
import { ParticipantComposer } from "@/bot/composers/ParticipantComposer";
import { TextService } from "@/bot/services/TextService";
import { RoleService } from "@/bot/services/RoleService";
import { RoleComposer } from "@/bot/composers/RoleComposer";
import { PermissionService } from "@/bot/services/PermissionService";
import CraftyService from "@/bot/services/CraftyService";
import { CraftyComposer } from "@/bot/composers/CraftyComposer";

class Bot {
  bot: Telegraf<IBotContext>;

  constructor(
    privateComposer: PrivateComposer,
    musicGameComposer: MusicGameComposer,
    participantComposer: ParticipantComposer,
    globalComposer: GlobalComposer,
    jokerComposer: JokerComposer,
    roleComposer: RoleComposer,
    craftyComposer: CraftyComposer,
    configService: IConfigService,
  ) {
    this.bot = new Telegraf<IBotContext>(configService.get("BOT_TOKEN"));

    this.bot.use(session());

    const privateMiddleware = privateComposer.middleware();
    const musicGameMiddleware = musicGameComposer.middleware();
    const participantMiddleware = participantComposer.middleware();
    const globalMiddleware = globalComposer.middleware();
    const jokerMiddleware = jokerComposer.middleware();
    const roleMiddleware = roleComposer.middleware();
    const craftyMiddleware = craftyComposer.middleware();

    // Combine non-private middlewares into a single middleware
    const nonPrivateMiddleware = Composer.compose([
      musicGameMiddleware,
      participantMiddleware,
      roleMiddleware,
      craftyMiddleware,
    ]);

    this.bot.use((ctx, next) => {
      if (!ctx.chat) {
        return next();
      }
      if (ctx.chat.type === "private") {
        return privateMiddleware(ctx, next);
      } else {
        return nonPrivateMiddleware(ctx, next);
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
const userRepository = new UserRepository();

const textService = new TextService();
const configService = new ConfigService();

const userService = new UserService(userRepository);
const musicGameService = new MusicGameService(
  gameRepository,
  new MusicSubmissionRepository(),
);
const roundService = new RoundService(
  gameRepository,
  textService,
  botTemplates,
);
const leaderboardService = new LeaderboardService(gameRepository, botTemplates);
const guessService = new GuessService(
  gameRepository,
  new GuessValidationService(gameRepository, botTemplates),
  botTemplates,
);
const permissionService = new PermissionService();
const roleService = new RoleService(permissionService);
const craftyService = new CraftyService(
  configService.get("CRAFTY_BASE_URL"),
  configService.get("CRAFTY_API_KEY"),
);

const bot = new Bot(
  new PrivateComposer(userService, musicGameService, textService),
  new MusicGameComposer(
    userService,
    roundService,
    musicGameService,
    guessService,
    leaderboardService,
    botTemplates,
  ),
  new ParticipantComposer(userService, textService),
  new GlobalComposer(leaderboardService, botTemplates),
  new JokerComposer(userService, botTemplates, textService),
  new RoleComposer(roleService, permissionService, userService, textService),
  new CraftyComposer(craftyService, roleService, textService),
  configService,
);

bot.init();
