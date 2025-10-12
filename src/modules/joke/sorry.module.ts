import { Composer, Context } from 'telegraf';
import { injectable } from 'inversify';
import { IBotContext } from '@/context/context.interface';
import { randomInt } from 'crypto';

@injectable()
export class SorryModule extends Composer<IBotContext> {
  private apologyCounter: Map<number, number> = new Map();
  private readonly STICKERS = [
    'CAACAgIAAxkBAAKluGf0Fnpz6OzwjIZJc9pMsd0zMUaEAALyagACR5aoSRoNRPHRrJ-_NgQ',
    'CAACAgIAAxkBAAKlu2f0FoxQFqj_PMdvrHAzu6vkWpP2AAKZRgACQRgoS7q0M1Edekf4NgQ',
    'CAACAgIAAxkBAAKlvmf0FqfwceSQ5Y455UPtjjyuu3XoAALBagACSUmRSxm8R0e6OduJNgQ',
    'CAACAgIAAxkBAAKlwWf0HcmY3OCd7_CcPzlAfM5tGRIFAAJXgwACAkOQS45lnhCSoq8MNgQ',
    'CAACAgIAAxkBAAKlxGf0HeFQUlookzE6M2ymIuXDpTpXAAIDUwACMb2oSYkZBV3I0_XNNgQ',
    'CAACAgIAAxkBAAKlx2f0HfEjFgFf1xDChsKqNPdH-FlwAAJ7UQACT1moSX9Sud2ncpEHNgQ',
    'CAACAgIAAxkBAAKlymf0HgLdnLPfAAG2wRzT4ZhgztSNZQACUEcAAqImqEnUYlVVxhjHIzYE',
    'CAACAgIAAxkBAAKlzWf0Hhr8IYJBC-9eFQABOOc6LB72JgACbSEAAo6dAAFI7ON6RhMaI4A2BA',
  ];

  // Emoji reactions for the emoji action
  private readonly REACTIONS = ['😅', '🙏', '🥺', '🫣', '🤷‍♂️', '🙄', '🤌', '👉👈'];

  // Poems for the poetry action
  private readonly APOLOGY_POEMS = [
    "Roses are red,\nViolets are blue,\nI said I'm sorry,\nWhat more can I do?",
    "An apology slipped,\nFrom my guilty tongue,\nPlease accept it now,\nOr I'll remain unsung.",
    "Sorry, sorry, triple sorry,\nMy guilt is heavy, don't you worry,\nI promise to do better soon,\nJust forgive me by high noon.",
  ];

  constructor() {
    super();
    this.setupApologyHandlers();
  }

  private setupApologyHandlers() {
    // Extended with more apology patterns, including Russian and English variations
    const apologyPatterns = [
      /(извини|uzur|узур|прости|сорри|сорян|виноват|sorry|apologize|my bad|мой косяк|пардон|excuse me|forgive me)/i,
    ];

    apologyPatterns.forEach((pattern) => {
      this.hears(pattern, async (ctx, next) => {
        if (!ctx.from) return next();

        const userId = ctx.from.id;
        const count = (this.apologyCounter.get(userId) || 0) + 1;
        this.apologyCounter.set(userId, count);

        await this.executeSpecialAction(ctx, count);
        await next();
      });
    });
  }

  private async executeSpecialAction(ctx: Context, apologyCount: number) {
    const actions = [
      this.sendRandomSticker,
      this.createApologyQuest,
      this.reverseMessage,
      this.translateToKlingon,
      this.sendApologyMeme,
      this.generateWeirdTranslation,
      this.sendApologyPoem,
      this.apologyReactionAnimation,
      this.startApologyCountdown,
    ];

    const action = actions[randomInt(actions.length)]!;
    await action.call(this, ctx);
    await this.startApologyGame.call(this, ctx, apologyCount);
  }

  private async sendRandomSticker(ctx: Context) {
    const sticker = this.STICKERS[randomInt(this.STICKERS.length)]!;
    await ctx.replyWithSticker(sticker);
  }

  private async createApologyQuest(ctx: Context) {
    const quests = [
      'Чтобы я принял извинения, отправь фото котика с подписью "Я больше так не буду"',
      'Докажи искренность: пройди 3 круга вокруг стула и сфотографируй результат',
      'Для разблокировки чата произнеси "Я больше не буду извиняться" 3 раза вслух',
      'Напиши от руки записку с извинениями, сфотографируй и отправь сюда',
      'Чтобы получить прощение, запиши голосовое сообщение, где ты поёшь "Sorry" Джастина Бибера',
      'Придумай 3 причины, почему ты заслуживаешь прощения, и запиши их на стикерах',
    ];
    await ctx.reply(quests[randomInt(quests.length)]!);
  }

  private async reverseMessage(ctx: Context) {
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('Я даже не могу прочитать твои извинения задом наперёд! Попробуй текстом!');
      return;
    }

    await ctx.reply(
      ctx.message.text.split('').reverse().join('') +
        '\n\n(Перевод на нормальный язык: я больше не буду)',
    );
  }

  private async translateToKlingon(ctx: Context) {
    const klingonPhrases = [
      '`tlhIngan Hol: Qapla\'!`\n_Это значит "Я больше не буду" на клингонском_',
      '`tlhIngan Hol: jIQoS!`\n_Это значит "Прости меня" на клингонском_',
      '`tlhIngan Hol: jISaHbe\'!`\n_Это значит "Я был неправ" на клингонском_',
    ];

    await ctx.replyWithMarkdownV2(klingonPhrases[randomInt(klingonPhrases.length)]!);
  }

  private async startApologyGame(ctx: Context, count: number) {
    if (!ctx.message) return;

    const milestones = [3, 5, 10, 20, 50];
    const achievements = [
      '🥉 Бронзовый Извиняльщик',
      '🥈 Серебряный Раскаятель',
      '🏆 Золотой Мастер Сорян',
      '💎 Платиновый Лорд Извинений',
      '👑 Император Вселенского Сожаления',
    ];

    // Make sure message_thread_id exists or is undefined
    const threadId = ctx.message.message_thread_id;
    const messageOptions = threadId ? { message_thread_id: threadId } : {};

    const index = milestones.findIndex((m) => count === m); // Changed to exact matches
    if (index !== -1) {
      await ctx.replyWithDice(messageOptions);
      await ctx.reply(
        `Достижение разблокировано: ${achievements[index]}!\n` +
          `Продолжай в том же духе для новых уровней!\n` +
          `Текущий счёт извинений: ${count}`,
      );
    } else {
      // Random chance to show progress
      if (randomInt(3) === 0) {
        const nextMilestone =
          milestones.find((m) => m > count) || milestones[milestones.length - 1];
        await ctx.reply(`Счётчик извинений: ${count}/${nextMilestone} до следующего достижения!`);
      }
    }
  }

  // New methods below

  private async sendApologyMeme(ctx: Context) {
    const memes = [
      'https://i.imgflip.com/7xcyj7.jpg',
      'https://i.imgflip.com/7xcysx.jpg',
      'https://i.imgflip.com/7xcyvj.jpg',
    ];

    await ctx.replyWithPhoto(memes[randomInt(memes.length)]!, {
      caption: 'Извинения приняты в мемной форме!',
    });
  }

  private async generateWeirdTranslation(ctx: Context) {
    if (!ctx.message || !('text' in ctx.message)) return;

    const weirdLanguages = [
      {
        name: 'Пиратский',
        translation:
          'Йо-хо-хо! Прощенья просишь, морской волк? Клянусь бородой Нептуна, так уж и быть!',
      },
      {
        name: 'Язык котиков',
        translation: 'Мяу мур мяу! *урчит* Мррр мяу! *трётся о ногу* Мур!',
      },
      {
        name: 'Язык эльфов',
        translation:
          'Ai laurië lantar lassi súrinen, mellon nin. Твои извинения приняты, о дитя звёзд.',
      },
      {
        name: 'Язык программистов',
        translation:
          "if (apology === true) {\n  return 'accepted';\n} else {\n  throw new Error('Try harder');\n}",
      },
    ];

    const language = weirdLanguages[randomInt(weirdLanguages.length)]!;

    await ctx.reply(
      `Твои извинения на ${language.name}:\n\n${language.translation}\n\n(Бот перевёл автоматически, возможны ошибки)`,
    );
  }

  private async sendApologyPoem(ctx: Context) {
    if (!ctx.chat) return;
    const poem = this.APOLOGY_POEMS[randomInt(this.APOLOGY_POEMS.length)]!;

    await ctx.reply(`🎭 *Поэтическое принятие извинений* 🎭\n\n${poem}`, {
      parse_mode: 'Markdown',
    });
  }

  private async apologyReactionAnimation(ctx: Context) {
    if (!ctx.chat) return;
    if (!ctx.message) return;

    const message = await ctx.reply('Обрабатываю ваши извинения...');

    // React with a sequence of emojis
    const maxReactions = 5;
    const reactions = [];

    for (let i = 0; i < maxReactions; i++) {
      reactions.push(this.REACTIONS[randomInt(this.REACTIONS.length)]!);
    }

    // Send a series of edited messages to simulate animation
    for (let i = 0; i < reactions.length; i++) {
      const currentEmojis = reactions.slice(0, i + 1).join(' ');
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        message.message_id,
        undefined,
        `Обрабатываю ваши извинения${'.'.repeat(i % 4)}\n${currentEmojis}`,
      );

      // Small delay between edits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Final message
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      message.message_id,
      undefined,
      `Извинения обработаны и ${Math.random() > 0.5 ? 'приняты' : 'условно приняты'}!\n${reactions.join(' ')}`,
    );
  }

  private async startApologyCountdown(ctx: Context) {
    if (!ctx.chat) return;
    if (!ctx.message) return;

    const initialTime = 10; // seconds

    const message = await ctx.reply(
      `⏳ Таймер прощения: ${initialTime} секунд\nПодожди, пока я подумаю над твоими извинениями...`,
    );

    // Countdown animation
    for (let i = initialTime - 1; i >= 0; i--) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Skip some updates to make it less spammy
      if (i % 2 === 0 || i <= 3) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          message.message_id,
          undefined,
          `⏳ Таймер прощения: ${i} секунд\nПодожди, пока я подумаю над твоими извинениями...`,
        );
      }
    }

    // Final result
    const results = [
      '✅ Извинения приняты! Можешь спать спокойно.',
      '❌ Извинения отклонены! Попробуй снова через 24 часа.',
      '⚠️ Условно принято. Будем наблюдать за твоим поведением.',
      '🎲 Бросаю кубик судьбы... Тебе повезло сегодня!',
      '📝 Извинения занесены в протокол и будут рассмотрены комитетом.',
    ];

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      message.message_id,
      undefined,
      results[randomInt(results.length)]!,
    );
  }
}
