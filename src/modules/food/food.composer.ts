import { IBotContext } from "@/context/context.interface";
import { Composer } from "telegraf";
import { inject, injectable } from "inversify";
import { createApi } from "unsplash-js";
import { ConfigService } from "@/modules/common/config.service";
import { CommandContext, TYPES } from "@/types";
import { FoodService } from "@/modules/food/food.service";
import prisma from "@/prisma/client";
import { RequirePermission } from "@/modules/permissions/require-permission.decorator";
import { Prisma } from "@prisma/client";

const specialChars = [
  "_",
  "*",
  "[",
  "]",
  "(",
  ")",
  "~",
  "`",
  ">",
  "#",
  "+",
  "-",
  "=",
  "|",
  "{",
  "}",
  ".",
  "!",
];

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

    this.command("renamefood", (ctx) => this.handleRenameFood(ctx));

    // New commands
    this.command("addtrigger", (ctx) => this.handleAddTrigger(ctx));
    this.command("removetrigger", (ctx) => this.handleRemoveTrigger(ctx));
    this.command("listtriggers", (ctx) => this.handleListTriggers(ctx));
  }

  private splitArgs(text: string): string[] {
    const args: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of text.slice(1).trim()) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === " " && !inQuotes) {
        if (current) {
          args.push(current);
          current = "";
        }
      } else {
        current += char;
      }
    }
    if (current) args.push(current);
    return args;
  }

  @RequirePermission("MANAGE_FOOD")
  private async handleAddFood(ctx: CommandContext) {
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
      // First check for existing triggers
      const existingTriggers = await prisma.foodTrigger.findMany({
        where: {
          trigger: {
            in: triggers,
          },
        },
        include: {
          category: true,
        },
      });

      const existingTriggerMap = new Map(
        existingTriggers.map((t) => [t.trigger, t]),
      );
      const newTriggers = triggers.filter((t) => !existingTriggerMap.has(t));
      const transfers: { trigger: string; from: string }[] = [];

      // Create the new category
      const category = await prisma.foodCategory.create({
        data: {
          query,
          triggers: {
            create: newTriggers.map((trigger) => ({ trigger })),
          },
        },
        include: {
          triggers: true,
        },
      });

      // Process transfers if needed
      if (existingTriggers.length > 0) {
        for (const { trigger, category: oldCategory } of existingTriggers) {
          await prisma.foodTrigger.update({
            where: { id: existingTriggerMap.get(trigger)!.id },
            data: { categoryId: category.id },
          });
          transfers.push({ trigger, from: oldCategory.query });
        }
      }

      await this.foodService.initializeStemMap();

      let message = `✅ Added "${query}" with triggers: ${triggers.join(", ")}`;
      if (transfers.length > 0) {
        const transferMessages = transfers.map(
          (t) => `\n⚠️ Trigger "${t.trigger}" was transferred from "${t.from}"`,
        );
        message += `\n\n${transferMessages.join("")}`;
      }

      await ctx.reply(message);
    } catch (error) {
      if (error instanceof Error) {
        await ctx.reply(`❌ Error: ${error.message}`);
        return;
      }
      throw error;
    }
  }

  @RequirePermission("MANAGE_FOOD")
  private async handleRenameFood(ctx: CommandContext) {
    const args = this.splitArgs(ctx.message.text);
    if (args.length < 3) {
      await ctx.reply('Usage: /renamefood "oldname" "newname"');
      return;
    }

    const oldName = args[1];
    const newName = args[2];

    if (!oldName || !newName) {
      await ctx.reply('Usage: /renamefood "oldname" "newname"');
      return;
    }

    try {
      const updatedCategory = await prisma.foodCategory.update({
        where: { query: oldName },
        data: { query: newName },
      });

      await this.foodService.initializeStemMap();
      await ctx.reply(`✅ Renamed "${oldName}" to "${newName}"`);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        await ctx.reply(`❌ Category "${oldName}" not found!`);
      } else if (error instanceof Error) {
        await ctx.reply(`❌ Error: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  @RequirePermission("MANAGE_FOOD")
  private async handleAddTrigger(ctx: CommandContext) {
    const args = this.splitArgs(ctx.message.text);
    if (args.length < 3) {
      await ctx.reply('Usage: /addtrigger "query" trigger1 trigger2 ...');
      return;
    }

    const query = args[1];
    const newTriggers = args.slice(2);

    if (!query || newTriggers.length === 0) {
      await ctx.reply('Usage: /addtrigger "query" trigger1 trigger2 ...');
      return;
    }

    try {
      // Find the category first
      const category = await prisma.foodCategory.findFirst({
        where: { query },
      });

      if (!category) {
        await ctx.reply(`❌ Category "${query}" not found!`);
        return;
      }

      // Add new triggers
      const existingTriggers = await prisma.foodTrigger.findMany({
        where: { categoryId: category.id },
        select: { trigger: true },
      });

      const existingTriggerValues = existingTriggers.map((t) => t.trigger);
      const duplicates = newTriggers.filter((t) =>
        existingTriggerValues.includes(t),
      );
      const triggersToAdd = newTriggers.filter(
        (t) => !existingTriggerValues.includes(t),
      );

      if (triggersToAdd.length === 0) {
        await ctx.reply(`❌ All triggers already exist for "${query}"`);
        return;
      }

      await prisma.foodTrigger.createMany({
        data: triggersToAdd.map((trigger) => ({
          trigger,
          categoryId: category.id,
        })),
        skipDuplicates: true,
      });

      await this.foodService.initializeStemMap();

      let message = `✅ Added ${triggersToAdd.length} trigger(s) to "${query}": ${triggersToAdd.join(", ")}`;
      if (duplicates.length > 0) {
        message += `\n⚠️ Skipped ${duplicates.length} duplicate(s): ${duplicates.join(", ")}`;
      }

      await ctx.reply(message);
    } catch (error) {
      if (error instanceof Error) {
        await ctx.reply(`❌ Error: ${error.message}`);
        return;
      }

      throw error;
    }
  }

  @RequirePermission("MANAGE_FOOD")
  private async handleRemoveTrigger(ctx: CommandContext) {
    const args = this.splitArgs(ctx.message.text);
    if (args.length < 2) {
      await ctx.reply("Usage: /removetrigger trigger1 trigger2 ...");
      return;
    }

    const triggersToRemove = args.slice(1);

    if (triggersToRemove.length === 0) {
      await ctx.reply("Usage: /removetrigger trigger1 trigger2 ...");
      return;
    }

    try {
      // Delete the specified triggers
      const result = await prisma.foodTrigger.deleteMany({
        where: {
          trigger: {
            in: triggersToRemove,
          },
        },
      });

      await this.foodService.initializeStemMap();

      if (result.count === 0) {
        await ctx.reply("❌ No triggers found to remove!");
      } else {
        await ctx.reply(`✅ Removed ${result.count} trigger(s)`);
      }
    } catch (error) {
      if (error instanceof Error) {
        await ctx.reply(`❌ Error: ${error.message}`);
        return;
      }

      throw error;
    }
  }

  @RequirePermission("MANAGE_FOOD")
  private async handleRemoveFood(ctx: CommandContext) {
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
      if (error instanceof Error) {
        await ctx.reply(`❌ Error: ${error.message}`);
        return;
      }

      throw error;
    }
  }

  private async handleListFood(ctx: IBotContext) {
    const categories = await prisma.foodCategory.findMany();
    if (!categories.length) {
      await ctx.reply("No food categories found.");
      return;
    }

    const list = categories.map((c) => `• ${c.query}`).join("\n");
    await ctx.reply(
      `📜 Food Categories:\n\n${list}\n\nUse /listtriggers "category" to see triggers for a specific category.`,
    );
  }

  private async handleListTriggers(ctx: CommandContext) {
    const args = this.splitArgs(ctx.message.text);

    if (args.length < 2) {
      // No category specified, show all categories with their triggers
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
      await ctx.reply(`📜 All Categories with Triggers:\n\n${list}`);
    } else {
      // Show triggers for specific category
      const query = args[1];

      if (!query) {
        await ctx.reply('Usage: /listtriggers "category"');
        return;
      }

      const category = await prisma.foodCategory.findFirst({
        where: { query },
        include: { triggers: true },
      });

      if (!category) {
        await ctx.reply(`❌ Category "${query}" not found!`);
        return;
      }

      if (!category.triggers.length) {
        await ctx.reply(`Category "${query}" has no triggers.`);
        return;
      }

      const triggersList = category.triggers.map((t) => t.trigger).join(", ");
      await ctx.reply(`📜 Triggers for "${query}":\n\n${triggersList}`);
    }
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

  private escapeMarkdownV2(text: string): string {
    return text
      .split("")
      .map((char) => (specialChars.includes(char) ? `\\${char}` : char))
      .join("");
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
      authorName: this.escapeMarkdownV2(photo.user.name || "Unknown"),
      authorUsername: this.escapeMarkdownV2(photo.user.username || "unknown"),
    };
  }
}
