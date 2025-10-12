import { IBotContext } from '@/context/context.interface';
import { Composer } from 'telegraf';
import { inject, injectable } from 'inversify';
import { createApi } from 'unsplash-js';
import { ConfigService } from '@/modules/common/config.service';
import { TextService } from '@/modules/common/text.service';
import { CommandContext, TYPES } from '@/types';
import { FoodService } from '@/modules/food/food.service';
import prisma from '@/prisma/client';
import { RequirePermission } from '@/modules/permissions/require-permission.decorator';
import { Prisma } from '@prisma/client';
import { ArgsService } from '@/modules/common/args.service';
import { FoodRepository } from '@/modules/food/food.repository';

const specialChars = [
  '_',
  '*',
  '[',
  ']',
  '(',
  ')',
  '~',
  '`',
  '>',
  '#',
  '+',
  '-',
  '=',
  '|',
  '{',
  '}',
  '.',
  '!',
];

@injectable()
export class FoodModule extends Composer<IBotContext> {
  private unsplash: ReturnType<typeof createApi>;
  private responseChance = 100;

  constructor(
    @inject(TYPES.ConfigService) private config: ConfigService,
    @inject(TYPES.FoodService) private foodService: FoodService,
    @inject(TYPES.ArgsService) private args: ArgsService,
    @inject(TYPES.TextService) private text: TextService,
    @inject(TYPES.FoodRepository) private foodRepo: FoodRepository,
  ) {
    super();

    this.unsplash = createApi({
      accessKey: this.config.get('UNSPLASH_ACCESS_KEY'),
    });

    this.setupCommands();
    this.setupFoodListener();
  }

  private setupCommands() {
    this.command('addfood', (ctx) => this.handleAddFood(ctx));
    this.command('removefood', (ctx) => this.handleRemoveFood(ctx));
    this.command('listfood', (ctx) => this.handleListFood(ctx));

    this.command('renamefood', (ctx) => this.handleRenameFood(ctx));

    // New commands
    this.command('addtrigger', (ctx) => this.handleAddTrigger(ctx));
    this.command('removetrigger', (ctx) => this.handleRemoveTrigger(ctx));
    this.command('listtriggers', (ctx) => this.handleListTriggers(ctx));

    this.command('setfoodchance', (ctx) => this.handleSetChance(ctx));
  }

  @RequirePermission('MANAGE_FOOD')
  private async handleSetChance(ctx: CommandContext) {
    const args = this.args.parse(ctx.message.text);
    if (args.length < 2) {
      await ctx.reply(this.text.get('food.setchance.usage'));
      return;
    }

    const value = parseInt(args[1]!, 10);
    if (isNaN(value) || value < 0 || value > 100) {
      await ctx.reply(this.text.get('food.setchance.invalid'));
      return;
    }

    this.responseChance = value;
    await ctx.reply(this.text.get('food.setchance.success', { value }));
  }

  @RequirePermission('MANAGE_FOOD')
  private async handleAddFood(ctx: CommandContext) {
    const args = this.args.parse(ctx.message.text);
    if (args.length < 3) {
      await ctx.reply(this.text.get('food.add.usage'));
      return;
    }

    const query = args[1];
    const triggers = args.slice(2);

    if (!query || triggers.length === 0) {
      await ctx.reply(this.text.get('food.add.usage'));
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

      const existingTriggerMap = new Map(existingTriggers.map((t) => [t.trigger, t]));
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

      const added = this.text.get('food.add.success', {
        query,
        triggers: triggers.join(', '),
      });
      if (transfers.length > 0) {
        const transferMessages = transfers
          .map((t) =>
            this.text.get('food.add.transfer', {
              trigger: t.trigger,
              from: t.from,
            }),
          )
          .join('\n');
        await ctx.reply(`${added}\n\n${transferMessages}`);
      } else {
        await ctx.reply(added);
      }
    } catch (error) {
      if (error instanceof Error) {
        await ctx.reply(this.text.get('food.error', { error: error.message }));
        return;
      }
      throw error;
    }
  }

  @RequirePermission('MANAGE_FOOD')
  private async handleRenameFood(ctx: CommandContext) {
    const args = this.args.parse(ctx.message.text);
    if (args.length < 3) {
      await ctx.reply(this.text.get('food.rename.usage'));
      return;
    }

    const oldName = args[1];
    const newName = args[2];

    if (!oldName || !newName) {
      await ctx.reply(this.text.get('food.rename.usage'));
      return;
    }

    try {
      const updatedCategory = await prisma.foodCategory.update({
        where: { query: oldName },
        data: { query: newName },
      });

      await this.foodService.initializeStemMap();
      await ctx.reply(this.text.get('food.rename.success', { oldName, newName }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        await ctx.reply(this.text.get('food.categoryNotFound', { query: oldName }));
      } else if (error instanceof Error) {
        await ctx.reply(this.text.get('food.error', { error: error.message }));
      } else {
        throw error;
      }
    }
  }

  @RequirePermission('MANAGE_FOOD')
  private async handleAddTrigger(ctx: CommandContext) {
    const args = this.args.parse(ctx.message.text);
    if (args.length < 3) {
      await ctx.reply(this.text.get('food.trigger.add.usage'));
      return;
    }

    const query = args[1];
    const newTriggers = args.slice(2);

    if (!query || newTriggers.length === 0) {
      await ctx.reply(this.text.get('food.trigger.add.usage'));
      return;
    }

    try {
      // Find the category first
      const category = await prisma.foodCategory.findFirst({
        where: { query },
      });

      if (!category) {
        await ctx.reply(this.text.get('food.categoryNotFound', { query }));
        return;
      }

      // Add new triggers
      const existingTriggers = await prisma.foodTrigger.findMany({
        where: { categoryId: category.id },
        select: { trigger: true },
      });

      const existingTriggerValues = existingTriggers.map((t) => t.trigger);
      const duplicates = newTriggers.filter((t) => existingTriggerValues.includes(t));
      const triggersToAdd = newTriggers.filter((t) => !existingTriggerValues.includes(t));

      if (triggersToAdd.length === 0) {
        await ctx.reply(this.text.get('food.trigger.add.allExist', { query }));
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

      const addedMsg = this.text.get('food.trigger.add.success', {
        count: triggersToAdd.length,
        query,
        triggers: triggersToAdd.join(', '),
      });
      if (duplicates.length > 0) {
        const skipped = this.text.get('food.trigger.add.skipped', {
          count: duplicates.length,
          duplicates: duplicates.join(', '),
        });
        await ctx.reply(`${addedMsg}\n${skipped}`);
      } else {
        await ctx.reply(addedMsg);
      }
    } catch (error) {
      if (error instanceof Error) {
        await ctx.reply(this.text.get('food.error', { error: error.message }));
        return;
      }

      throw error;
    }
  }

  @RequirePermission('MANAGE_FOOD')
  private async handleRemoveTrigger(ctx: CommandContext) {
    const args = this.args.parse(ctx.message.text);
    if (args.length < 2) {
      await ctx.reply(this.text.get('food.trigger.remove.usage'));
      return;
    }

    const triggersToRemove = args.slice(1);

    if (triggersToRemove.length === 0) {
      await ctx.reply(this.text.get('food.trigger.remove.usage'));
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
        await ctx.reply(this.text.get('food.trigger.remove.none'));
      } else {
        await ctx.reply(this.text.get('food.trigger.remove.success', { count: result.count }));
      }
    } catch (error) {
      if (error instanceof Error) {
        await ctx.reply(this.text.get('food.error', { error: error.message }));
        return;
      }

      throw error;
    }
  }

  @RequirePermission('MANAGE_FOOD')
  private async handleRemoveFood(ctx: CommandContext) {
    const args = this.args.parse(ctx.message.text);
    if (args.length < 2) {
      await ctx.reply(this.text.get('food.remove.usage'));
      return;
    }

    const query = args[1];

    if (!query) {
      await ctx.reply(this.text.get('food.remove.usage'));
      return;
    }

    try {
      await prisma.foodCategory.deleteMany({
        where: { query },
      });
      await this.foodService.initializeStemMap();
      await ctx.reply(this.text.get('food.remove.success', { query }));
    } catch (error) {
      if (error instanceof Error) {
        await ctx.reply(this.text.get('food.error', { error: error.message }));
        return;
      }

      throw error;
    }
  }

  private async handleListFood(ctx: IBotContext) {
    const categories = await this.foodRepo.listCategories();
    if (!categories.length) {
      await ctx.reply(this.text.get('food.list.none'));
      return;
    }

    const list = categories.map((c) => `• ${c.query}`).join('\n');
    await ctx.reply(this.text.get('food.list.header', { list }));
  }

  private async handleListTriggers(ctx: CommandContext) {
    const args = this.args.parse(ctx.message.text);

    if (args.length < 2) {
      // No category specified, show all categories with their triggers
      const categories = await this.foodRepo.listCategoriesWithTriggers();

      if (!categories.length) {
        await ctx.reply(this.text.get('food.triggers.none'));
        return;
      }

      const list = categories
        .map((c) => {
          return `• ${c.query}: ${c.triggers.map((t) => t.trigger).join(', ')}`;
        })
        .join('\n');
      await ctx.reply(this.text.get('food.triggers.all.header', { list }));
    } else {
      // Show triggers for specific category
      const query = args[1];

      if (!query) {
        await ctx.reply(this.text.get('food.triggers.usage'));
        return;
      }

      const category = await this.foodRepo.findCategoryWithTriggersByQuery(query);

      if (!category) {
        await ctx.reply(this.text.get('food.categoryNotFound', { query }));
        return;
      }

      if (!category.triggers.length) {
        await ctx.reply(this.text.get('food.triggers.category.none', { query }));
        return;
      }

      const triggersList = category.triggers.map((t) => t.trigger).join(', ');
      await ctx.reply(
        this.text.get('food.triggers.category.header', {
          query,
          triggersList,
        }),
      );
    }
  }

  private setupFoodListener() {
    this.on('message', async (ctx, next) => {
      if (!ctx.message || !('text' in ctx.message)) return;

      const detected = this.foodService.detectCategoryFromText(ctx.message.text);
      if (!detected) return;

      const roll = Math.random() * 100;
      if (roll > this.responseChance) return;

      const { category } = detected;

      try {
        const photoData = await this.fetchUnsplashPhoto(category);
        const attribution = `||Фото: [${photoData.authorName}](https://unsplash.com/@${photoData.authorUsername}) / Unsplash||`;

        await ctx.replyWithPhoto(photoData.url, {
          caption: `Вот твоя ${category}\\! 🍽️\n\n${attribution}`,
          parse_mode: 'MarkdownV2',
        });
      } catch (error) {
        await ctx.reply(this.text.get('food.unsplash.error', { error: String(error) }));
      }

      await next();
    });
  }

  private escapeMarkdownV2(text: string): string {
    return text
      .split('')
      .map((char) => (specialChars.includes(char) ? `\\${char}` : char))
      .join('');
  }

  private async fetchUnsplashPhoto(
    fullQuery: string,
  ): Promise<{ url: string; authorName: string; authorUsername: string }> {
    const result = await this.unsplash.photos.getRandom({
      query: fullQuery,
      count: 1,
      orientation: 'landscape',
    });

    if (result.errors || !result.response) {
      throw new Error(result.errors?.[0] || 'Unknown error');
    }

    const photo = Array.isArray(result.response) ? result.response[0] : result.response;

    if (!photo) {
      throw new Error('No photo found');
    }

    return {
      url: photo.urls.regular,
      authorName: this.escapeMarkdownV2(photo.user.name || 'Unknown'),
      authorUsername: this.escapeMarkdownV2(photo.user.username || 'unknown'),
    };
  }
}
