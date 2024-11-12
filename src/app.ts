import { Scenes, session, Telegraf } from "telegraf";
import { IConfigService } from "./config/config.interface";
import { ConfigService } from "./config/config.service";
import prisma from "./prisma/client";
import { IBotContext } from "./context/context.interface";
import { Command } from "./bot/commands/command.class";
import { StartCommand } from "./bot/commands/start.command";
import { CollectScene } from "./bot/scenes/collect.scene";
import { IMusicGuessService } from "./bot/events/musicGuess.interface";
import { MusicGuessService } from "./bot/events/musicGuess.service";

class Bot {
  bot: Telegraf<IBotContext>;
  commands: Command[] = [];
  stage: Scenes.Stage<Scenes.SceneContext>;

  constructor(
    private readonly configService: IConfigService,
    private readonly musicGuessService: IMusicGuessService
  ) {
    this.bot = new Telegraf<IBotContext>(this.configService.get("BOT_TOKEN"));
    this.bot.use(session());

    const collectScene = new CollectScene(this.musicGuessService);
    // const playScene = new PlayScene(this.configService);
    this.stage = new Scenes.Stage([collectScene.scene]);
  }

  init() {
    this.commands = [new StartCommand(this.bot)];
    for (const command of this.commands) {
      command.handle();
    }
    this.bot.launch();
  }
}

const bot = new Bot(new ConfigService(), new MusicGuessService());

bot.init();

// const startBot = async () => {
//   try {
//     // Test database connection
//     await prisma.$connect();
//     console.log("Successfully connected to database");

//     const bot = createBot();
//     await bot.launch();
//     console.log("Bot started successfully");

//     // Enable graceful stop
//     process.once("SIGINT", () => {
//       bot.stop("SIGINT");
//       prisma.$disconnect();
//     });
//     process.once("SIGTERM", () => {
//       bot.stop("SIGTERM");
//       prisma.$disconnect();
//     });
//   } catch (error) {
//     console.error("Error starting bot:", error);
//     process.exit(1);
//   }
// };

// startBot();
