import "reflect-metadata";
import { Composer, session, Telegraf } from "telegraf";
import { ConfigService } from "./modules/common/config.service";
import { IBotContext } from "./context/context.interface";
import { GlobalModule } from "./modules/common/global.module";
import { MusicGameUploadModule } from "./modules/musicGame/music-game-upload.module";
import { JokerModule } from "./modules/joke/joker.module";
import { MusicGameModule } from "@/modules/musicGame/music-game.module";
import { MemberModule } from "@/modules/common/member.module";
import { RoleModule } from "@/modules/permissions/role.module";
import { CraftyModule } from "@/modules/crafty/crafty.module";
import { container } from "@/container";
import { TYPES } from "@/types";
import { TriggerModule } from "@/modules/joke/trigger.module";
import { SorryModule } from "@/modules/joke/sorry.module";
import { FoodModule } from "@/modules/food/food.module";
import { TriggerComposer } from "@/modules/trigger/trigger.composer";
import { SorryComposer } from "@/bot/composers/SorryComposer";
import { FoodComposer } from "@/modules/food/food.composer";
import { FoodComposer } from "@/bot/composers/FoodComposer";
import { LLMComposer } from "@/bot/composers/LLMComposer";
import { TriggerModule } from "@/modules/joke/trigger.module";
import { SorryModule } from "@/modules/joke/sorry.module";
import { FoodModule } from "@/modules/food/food.module";

class Bot {
  bot: Telegraf<IBotContext>;

  constructor() {
    const configService = container.get<ConfigService>(TYPES.ConfigService);

    this.bot = new Telegraf<IBotContext>(configService.get("BOT_TOKEN"));
    this.bot.use(
      session({
        defaultSession: () => ({}),
      }),
    );

    const textMiddleware = container
      .get<TriggerModule>(TYPES.TextComposer)
      .middleware();
    const musicGameUploadMiddleware = container
      .get<MusicGameUploadModule>(TYPES.PrivateComposer)
      .middleware();
    const musicGameMiddleware = container
      .get<MusicGameModule>(TYPES.MusicGameModule)
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
      .get<LLMComposer>(TYPES.LLMComposer)
      .middleware();

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
    this.bot.use(textMiddleware);
    this.bot.use(sorryMiddleware);
    this.bot.use(foodMiddleware);
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
