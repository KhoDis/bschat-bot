import { IBotContext } from "@/context/context.interface";
import { Composer } from "telegraf";
import { inject, injectable } from "inversify";
import { createApi } from "unsplash-js";
import { ConfigService } from "@/config/config.service";
import { CommandContext, TYPES } from "@/types";
import { FoodService } from "@/bot/services/FoodService";
import prisma from "@/prisma/client";
import { RequirePermission } from "@/bot/decorators/RequirePermission";

const FOOD_CATEGORIES = {
  "omelet breakfast": ["омлет", "яичница", "глазунья"],
  "pancakes with syrup": ["блины", "блинчики"],
  "bowl of porridge": ["каша", "овсянка"],
  "buttered toast": ["тост", "тосты"],
  "granola bowl": ["гранола", "мюсли"],
  "yogurt with berries": ["йогурт"],

  "italian pizza": ["пицца", "пиццу", "пиццей", "пиццерия", "пицца-итальяна"],
  "juicy burger": ["бургер", "чизбургер", "гамбургер", "бургерная"],
  "hot dog street food": ["хотдог"],

  "japanese ramen": ["рамен"],
  "udon noodles": ["удон"],
  "pho soup": ["фо-бо"],
  "tom yum soup": ["том-ям"],
  "donburi rice bowl": ["донбури"],
  "baozi buns": ["баоцзы"],
  "korean kimchi": ["кимчи"],
  "wok noodles": ["вок"],

  "sushi set": ["суши", "роллы", "сашими", "нигири", "урамаки", "гункан"],

  pelmeni: ["пельмени"],
  "borscht soup": ["борщ"],
  "olivier salad": ["оливье"],
  "vinaigrette salad": ["винегрет"],
  "okroshka soup": ["окрошка"],
  "solyanka soup": ["солянка"],
  "russian fish soup": ["уха"],
  "belarus draniki": ["драники"],

  "plov pilaf": ["плов"],

  "italian pasta": ["паста", "спагетти", "фетучини", "лазанья", "равиоли"],
  "pasta carbonara": ["карбонара"],
  "pasta bolognese": ["болоньезе"],

  "beef steak": ["стейк", "антрекот"],
  "pork chop": ["свинина", "карбонад", "ребрышки"],
  "grilled lamb": ["баранина"],
  "grilled chicken": ["курица", "курочка", "курица гриль"],
  "meat barbecue": ["шашлык", "гриль", "барбекю"],

  "grilled salmon": ["лосось"],
  "tuna fillet": ["тунец"],
  "cod fish": ["треска"],
  "shrimp dish": ["креветки"],
  "grilled squid": ["кальмары"],
  "cooked octopus": ["осьминог"],
  "fresh oysters": ["устрицы"],
  "lobster plate": ["лобстер"],
  "black caviar": ["икра"],

  "falafel plate": ["фалафель"],
  "hummus dip": ["хумус"],
  "tofu dish": ["тофу"],
  "seitan vegan": ["сейтан"],

  "fresh salad": ["салат", "цезарь", "греческий", "винегрет", "капрезе"],
  "bowl of soup": ["суп", "щи", "харчо", "крем-суп", "бульон"],

  "slice of cake": ["торт", "чизкейк", "пирожное", "тирамису", "эклер"],
  "muffin dessert": ["маффин", "кекс"],
  "glazed donut": ["пончик"],
  "ice cream scoop": ["мороженое"],
  "chocolate sweets": ["шоколад", "конфеты", "трюфель", "какао"],

  "croissant pastry": ["круассан"],
  "fruit pie": ["пирог", "пирожок"],
  "fresh bread": ["хлеб", "батон", "багет", "лаваш", "булочка"],

  "fresh fruit": [
    "яблоко",
    "банан",
    "манго",
    "ананас",
    "киви",
    "апельсин",
    "виноград",
  ],
  "fresh vegetables": [
    "помидор",
    "огурец",
    "морковь",
    "брокколи",
    "кабачок",
    "баклажан",
    "авокадо",
  ],

  "cheese plate": [
    "сыр",
    "моцарелла",
    "чеддер",
    "пармезан",
    "фета",
    "рикотта",
    "брынза",
  ],

  "fruit smoothie": ["смузи"],
  "lemonade drink": ["лимонад"],
  "milkshake with cream": ["милкшейк"],
  "fresh juice": ["фреш", "морс", "компот"],

  "cup of coffee": [
    "кофе",
    "капучино",
    "латте",
    "эспрессо",
    "мокка",
    "раф",
    "американо",
  ],
  "tea in teapot": ["чай", "мате", "пуэр", "улун", "каркаде"],

  "glass of wine": ["вино"],
  "cold beer": ["пиво"],
  "glass of whiskey": ["виски"],
  "rum cocktail": ["ром"],
  "gin tonic": ["джин"],
  "champagne celebration": ["шампанское"],
  "glass of cognac": ["коньяк"],
  vodka: ["водка"],

  "doner kebab": [
    "шаурма",
    "шаверма",
    "шаурму",
    "шавуху",
    "шавуха",
    "шаурмочка",
    "шавермочка",
    "doner",
    "донер",
    "донер кебаб",
    "донер-кебаб",
    "кебаб",
  ],
};

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

    // New commands
    this.command("addtrigger", (ctx) => this.handleAddTrigger(ctx));
    this.command("removetrigger", (ctx) => this.handleRemoveTrigger(ctx));
    this.command("listtriggers", (ctx) => this.handleListTriggers(ctx));

    this.command("seedfood", (ctx) => this.handleSeedFood(ctx));
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

  @RequirePermission("ADMIN")
  private async handleSeedFood(ctx: CommandContext) {
    try {
      // Add all from the list as one transaction
      await prisma.foodCategory.createMany({
        data: Object.entries(FOOD_CATEGORIES).map(([query, triggers]) => ({
          query,
          triggers: {
            createMany: {
              data: triggers.map((trigger) => ({ trigger })),
            },
          },
        })),
      });

      await this.foodService.initializeStemMap();
      await ctx.reply(`✅ Seeded food`);
    } catch (error) {
      if (error instanceof Error) {
        await ctx.reply(`❌ Error: ${error.message}`);
        return;
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
