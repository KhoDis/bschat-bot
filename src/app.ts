import "reflect-metadata";
import { Composer, session, Telegraf } from "telegraf";
import { ConfigService } from "./modules/common/config.service";
import { IBotContext } from "./context/context.interface";
import { GlobalModule } from "./modules/common/global.module";
import { MusicGameUploadModule } from "./modules/musicGame/music-game-upload.module";
import { JokerModule } from "./modules/joke/joker.module";
import { MemberModule } from "@/modules/common/member.module";
import { RoleModule } from "@/modules/permissions/role.module";
import { CraftyModule } from "@/modules/crafty/crafty.module";
import { container } from "@/container";
import { TYPES } from "@/types";
import { SorryModule } from "@/modules/joke/sorry.module";
import { FoodModule } from "@/modules/food/food.module";
import { LlmModule } from "@/modules/joke/llm.module";
import { SchedulerService } from "@/modules/musicGame/scheduler/scheduler.service";
import { MusicGameModule } from "@/modules/musicGame/music-game.module";
import prisma from "@/prisma/client";

class Bot {
  bot: Telegraf<IBotContext>;
  private scheduler?: SchedulerService;

  constructor() {
    const configService = container.get<ConfigService>(TYPES.ConfigService);
    // Validate required environment variables before initializing bot
    try {
      configService.require(["BOT_TOKEN", "DATABASE_URL"]);
    } catch (e) {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    }

    this.bot = new Telegraf<IBotContext>(configService.get("BOT_TOKEN"));
    this.bot.use(
      session({
        defaultSession: () => ({}),
      }),
    );

    // const textMiddleware = container
    //   .get<TriggerModule>(TYPES.TextComposer)
    //   .middleware();
    const musicGameUploadMiddleware = container
      .get<MusicGameUploadModule>(TYPES.PrivateComposer)
      .middleware();
    const musicGameConsolidatedMiddleware = container
      .get<MusicGameModule>(TYPES.MusicGameConsolidatedModule)
      .middleware();
    const participantMiddleware = container
      .get<MemberModule>(TYPES.ParticipantComposer)
      .middleware();
    const globalMiddleware = container
      .get<GlobalModule>(TYPES.GlobalComposer)
      .middleware();
    const jokerMiddleware = container
      .get<JokerModule>(TYPES.JokerComposer)
      .middleware();
    const roleMiddleware = container
      .get<RoleModule>(TYPES.RoleComposer)
      .middleware();
    const craftyMiddleware = container
      .get<CraftyModule>(TYPES.CraftyComposer)
      .middleware();
    const sorryMiddleware = container
      .get<SorryModule>(TYPES.SorryComposer)
      .middleware();
    const foodMiddleware = container
      .get<FoodModule>(TYPES.FoodComposer)
      .middleware();
    const llmMiddleware = container
      .get<LlmModule>(TYPES.LLMComposer)
      .middleware();
    const scheduler = container.get<SchedulerService>(TYPES.SchedulerService);
    this.scheduler = scheduler;

    // Combine non-private middlewares into a single middleware
    const nonPrivateMiddleware = Composer.compose([
      musicGameConsolidatedMiddleware,
      participantMiddleware,
      roleMiddleware,
      craftyMiddleware,
    ]);

    this.bot.use((ctx, next) => {
      if (!ctx.chat) {
        return next();
      }
      // TODO: unclog the flow
      if (ctx.chat.type === "private") {
        return musicGameUploadMiddleware(ctx, next);
      } else {
        return nonPrivateMiddleware(ctx, next);
      }
    });

    this.bot.use(llmMiddleware);
    this.bot.use(globalMiddleware);
    this.bot.use(jokerMiddleware);
    // this.bot.use(textMiddleware);
    this.bot.use(sorryMiddleware);
    this.bot.use(foodMiddleware);

    // Start background scheduler
    try {
      scheduler.start?.();
    } catch (error) {
      console.error("Failed to start scheduler:", error);
    }
  }

  init() {
    console.info("Starting bot...");

    this.bot.catch((err) => {
      console.error("Bot error:", err);
    });

    this.bot
      .launch()
      .then(() => console.info("Bot launched"))
      .catch(console.error);
  }
}

const bot = new Bot();

bot.init();

// Graceful shutdown
const shutdown = async (signal: string) => {
  try {
    console.info(`Received ${signal}, shutting down...`);
    await prisma.$disconnect().catch(() => undefined);
    bot.bot.stop(signal);
  } finally {
    process.exit(0);
  }
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
