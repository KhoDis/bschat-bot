import "reflect-metadata";
import { Composer, session, Telegraf } from "telegraf";
import { ConfigService } from "./modules/common/config.service";
import { IBotContext } from "./context/context.interface";
import { GlobalComposer } from "./modules/common/global.composer";
import { PrivateComposer } from "./bot/composers/PrivateComposer";
import { JokerComposer } from "./bot/composers/JokerComposer";
import { MusicGameModule } from "@/modules/musicGame/music-game.module";
import { MemberModule } from "@/modules/common/member.module";
import { RoleComposer } from "@/modules/permissions/role.composer";
import { CraftyComposer } from "@/modules/crafty/crafty.composer";
import { container } from "@/container";
import { TYPES } from "@/types";
import { TriggerComposer } from "@/modules/trigger/trigger.composer";
import { SorryComposer } from "@/bot/composers/SorryComposer";
import { FoodComposer } from "@/modules/food/food.composer";

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
      .get<TriggerComposer>(TYPES.TextComposer)
      .middleware();
    const privateMiddleware = container
      .get<PrivateComposer>(TYPES.PrivateComposer)
      .middleware();
    const musicGameMiddleware = container
      .get<MusicGameModule>(TYPES.MusicGameModule)
      .middleware();
    const participantMiddleware = container
      .get<MemberModule>(TYPES.ParticipantComposer)
      .middleware();
    const globalMiddleware = container
      .get<GlobalComposer>(TYPES.GlobalComposer)
      .middleware();
    const jokerMiddleware = container
      .get<JokerComposer>(TYPES.JokerComposer)
      .middleware();
    const roleMiddleware = container
      .get<RoleComposer>(TYPES.RoleComposer)
      .middleware();
    const craftyMiddleware = container
      .get<CraftyComposer>(TYPES.CraftyComposer)
      .middleware();
    const sorryMiddleware = container
      .get<SorryComposer>(TYPES.SorryComposer)
      .middleware();
    const foodMiddleware = container
      .get<FoodComposer>(TYPES.FoodComposer)
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
      if (ctx.chat.type === "private") {
        return privateMiddleware(ctx, next);
      } else {
        return nonPrivateMiddleware(ctx, next);
      }
    });

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
