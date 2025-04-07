import { Composer, Context } from "telegraf";
import { injectable } from "inversify";
import { IBotContext } from "@/context/context.interface";
import { randomInt } from "crypto";

@injectable()
export class SorryComposer extends Composer<IBotContext> {
  private apologyCounter: Map<number, number> = new Map();
  private readonly STICKERS = [
    "CAACAgIAAxkBAAKluGf0Fnpz6OzwjIZJc9pMsd0zMUaEAALyagACR5aoSRoNRPHRrJ-_NgQ",
    "CAACAgIAAxkBAAKlu2f0FoxQFqj_PMdvrHAzu6vkWpP2AAKZRgACQRgoS7q0M1Edekf4NgQ",
    "CAACAgIAAxkBAAKlvmf0FqfwceSQ5Y455UPtjjyuu3XoAALBagACSUmRSxm8R0e6OduJNgQ",
  ];

  constructor() {
    super();
    this.setupApologyHandlers();
  }

  private setupApologyHandlers() {
    const apologyPatterns = [
      /(извини|прости|сорри|виноват|sorry|apologize)/i,
      /(\bизв\b|\bсорян\b|\bсорь\b)/i,
    ];

    apologyPatterns.forEach((pattern) => {
      this.hears(pattern, async (ctx, next) => {
        if (!ctx.from) return next();

        const userId = ctx.from.id;
        const count = (this.apologyCounter.get(userId) || 0) + 1;
        this.apologyCounter.set(userId, count);

        // 30% chance to activate special response
        if (Math.random() < 0.3) {
          await this.executeSpecialAction(ctx, count);
        } else {
          await next();
        }
      });
    });
  }

  private async executeSpecialAction(ctx: Context, apologyCount: number) {
    const actions = [
      this.sendRandomSticker,
      this.createApologyQuest,
      this.reverseMessage,
      this.translateToKlingon,
      this.startApologyGame,
    ];

    const action = actions[randomInt(actions.length)]!;
    await action.call(this, ctx, apologyCount);
  }

  private async sendRandomSticker(ctx: Context) {
    const sticker = this.STICKERS[randomInt(this.STICKERS.length)]!;
    await ctx.replyWithSticker(sticker);
  }

  private async createApologyQuest(ctx: Context) {
    const quests = [
      'Чтобы я принял извинения, отправь фото котика с подписью "Я больше так не буду"',
      "Докажи искренность: пройди 3 круга вокруг стула и сфотографируй результат",
      'Для разблокировки чата произнеси "Я больше не буду извиняться" 3 раза вслух',
    ];
    await ctx.reply(quests[randomInt(quests.length)]!);
  }

  private async reverseMessage(ctx: Context) {
    if (!ctx.message) return;
    if (!("text" in ctx.message)) return;

    await ctx.reply(
      ctx.message.text.split("").reverse().join("") +
        "\n\n(Перевод на нормальный язык: я больше не буду)",
    );
  }

  private async translateToKlingon(ctx: Context) {
    await ctx.replyWithMarkdownV2(
      "`tlhIngan Hol: Qapla'!`\n" +
        '_Это значит "Я больше не буду" на клингонском_',
    );
  }

  private async startApologyGame(ctx: Context, count: number) {
    if (!(ctx.message && "text" in ctx.message)) return;
    const milestones = [3, 5, 10];
    const achievements = [
      "🥉 Бронзовый Извиняльщик",
      "🥈 Серебряный Раскаятель",
      "🏆 Золотой Мастер Сорян",
    ];

    const index = milestones.findIndex((m) => count === m);
    if (index !== -1) {
      await ctx.replyWithDice({
        message_thread_id: ctx.message.message_thread_id!,
      });
      await ctx.reply(
        `Достижение разблокировано: ${achievements[index]}!\n` +
          `Продолжай в том же духе для новых уровней!`,
      );
    }
  }
}
