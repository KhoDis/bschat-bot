import { IBotContext } from "@/context/context.interface";
import { Composer } from "telegraf";
import { inject, injectable } from "inversify";
import { createApi } from "unsplash-js";
import { ConfigService } from "@/config/config.service";
import { CommandContext, TYPES } from "@/types";
import { FoodService } from "@/bot/services/FoodService";
import prisma from "@/prisma/client";
import { RequirePermission } from "@/bot/decorators/RequirePermission";

@injectable()
export class FoodComposer extends Composer<IBotContext> {
  private unsplash: ReturnType<typeof createApi>;

  constructor(
    @inject(TYPES.ConfigService) private config: ConfigService,
    @inject(TYPES.FoodService) private foodService: FoodService,
  ) {
    super();

    this.unsplash = createApi({
      accessKey: this.config.get("UNSPLASH_ACCESS_KEY"),
    });

    this.setupCommands();
    this.setupFoodListener();
    this.foodService.initializeStemMap().then((r) => console.log(r));
  }

  private setupCommands() {
    this.command("addfood", (ctx) => this.handleAddFood(ctx));
    this.command("removefood", (ctx) => this.handleRemoveFood(ctx));
    this.command("listfood", (ctx) => this.handleListFood(ctx));
  }

  private splitArgs(text: string): string[] {
    const args: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of text.slice(1).trim()) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === " " && !inQuotes) {
        args.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    if (current) args.push(current);
    return args;
  }

  @RequirePermission("MANAGE_FOOD")
  private async handleAddFood(ctx: CommandContext) {
    // Implement admin check here
    const args = this.splitArgs(ctx.message.text);
    if (args.length < 3) {
      await ctx.reply('Usage: /addfood "query" trigger1 trigger2 ...');
      return;
    }

    const query = args[1];
    const triggers = args.slice(2);

    if (!query || triggers.length === 0) {
      await ctx.reply('Usage: /addfood "query" trigger1 trigger2 ...');
      return;
    }

    try {
      await prisma.foodCategory.create({
        data: {
          query,
          triggers: {
            createMany: {
              data: triggers.map((trigger) => ({ trigger })),
            },
          },
        },
      });
      await this.foodService.initializeStemMap();
      await ctx.reply(
        `✅ Added "${query}" with triggers: ${triggers.join(", ")}`,
      );
    } catch (error) {
      if (error instanceof Error) {
        await ctx.reply(`❌ Error: ${error.message}`);
        return;
      }

      throw error;
    }
  }

  private async handleRemoveFood(ctx: CommandContext) {
    // Implement admin check here
    const args = this.splitArgs(ctx.message.text);
    if (args.length < 2) {
      await ctx.reply('Usage: /removefood "query"');
      return;
    }

    const query = args[1];

    if (!query) {
      await ctx.reply('Usage: /removefood "query"');
      return;
    }

    try {
      await prisma.foodCategory.deleteMany({
        where: { query },
      });
      await this.foodService.initializeStemMap();
      await ctx.reply(`✅ Removed "${query}"`);
    } catch (error) {
      await ctx.reply("❌ Category not found!");
    }
  }

  private async handleListFood(ctx: IBotContext) {
    const categories = await prisma.foodCategory.findMany({
      include: { triggers: true },
    });
    if (!categories.length) {
      await ctx.reply("No categories found.");
      return;
    }

    const list = categories
      .map((c) => {
        return `• ${c.query}: ${c.triggers.map((t) => t.trigger).join(", ")}`;
      })
      .join("\n");
    await ctx.reply(`📜 Food Categories:\n\n${list}`);
  }

  private setupFoodListener() {
    this.on("message", async (ctx, next) => {
      if (!ctx.message || !("text" in ctx.message)) return;

      const detected = this.foodService.detectCategoryFromText(
        ctx.message.text,
      );
      if (!detected) return;

      const { category } = detected;

      try {
        const photoData = await this.fetchUnsplashPhoto(category);
        const attribution = `||Фото: [${photoData.authorName}](https://unsplash.com/@${photoData.authorUsername}) / Unsplash||`;

        await ctx.replyWithPhoto(photoData.url, {
          caption: `Вот твоя ${category}\\! 🍽️\n\n${attribution}`,
          parse_mode: "MarkdownV2",
        });
      } catch (error) {
        await ctx.reply(
          `Не удалось найти фото... Попробуй другой запрос! 😅\n\n${error}`,
        );
      }

      await next();
    });
  }

  private async fetchUnsplashPhoto(
    fullQuery: string,
  ): Promise<{ url: string; authorName: string; authorUsername: string }> {
    const result = await this.unsplash.photos.getRandom({
      query: fullQuery,
      count: 1,
      orientation: "landscape",
    });

    if (result.errors || !result.response) {
      throw new Error(result.errors?.[0] || "Unknown error");
    }

    const photo = Array.isArray(result.response)
      ? result.response[0]
      : result.response;

    if (!photo) {
      throw new Error("No photo found");
    }

    return {
      url: photo.urls.regular,
      authorName: photo.user.name || "Unknown",
      authorUsername: photo.user.username || "unknown",
    };
  }
}
