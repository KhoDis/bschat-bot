import { IBotContext } from '@/context/context.interface';
import { Composer } from 'telegraf';
import { MemberService } from '@/modules/common/member.service';
import { TextService } from '@/modules/common/text.service';
import { inject, injectable } from 'inversify';
import { CommandContext, TYPES } from '@/types';
import { ArgsService } from '@/modules/common/args.service';

@injectable()
export class JokerModule extends Composer<IBotContext> {
  private readonly roasts = [
    'Твой интеллект можно уместить на флешке 256 Кб.',
    'Если бы тупость светилась, ты был бы солнцем.',
    'Ты как Wi-Fi в метро – иногда ловишь, но в целом нет.',
    'Твой словарный запас – это просто смайлы.',
    'Ты — доказательство, что эволюция иногда идёт в обратную сторону.',
    'У тебя столько харизмы, сколько FPS в Minecraft на калькуляторе.',
    'Если бы был конкурс на худшее оправдание, ты бы проиграл.',
    'Ты настолько ленивый, что твоя тень двигается больше, чем ты.',
    'Я бы тебя унизил, но природа уже сделала это за меня.',
    'Ты как будильник без батарейки – бесполезен и раздражаешь.',
    'Твой IQ можно измерять в комнатной температуре (в градусах Цельсия).',
    'Если бы тупость была преступлением, ты бы получил пожизненный срок.',
    'У тебя есть талант! Правда, никто пока не понял, какой.',
    'Твои аргументы такие же слабые, как интернет в деревне.',
    'Ты как NPC в старых играх – повторяешь одно и то же без причины.',
    'Ты пытаешься быть умным, но твои мозги работают в демо-версии.',
    'Если бы болтовня сжигала калории, ты был бы моделью.',
    'Ты как антивирус 2005 года – тормозишь и бесполезен.',
    'Ты мог бы участвовать в Олимпиаде… по фейлам.',
    'Ты настолько скучный, что даже Google не хочет тебя искать.',
    'Если бы был турнир по ошибкам, ты бы ошибся с регистрацией.',
    'Ты как батарейка из дешёвого фонарика – разряжаешься в самый важный момент.',
    'Ты пробовал молчать? Это тебе идёт больше, чем говорить.',
    'Твои шутки такие старые, что ими можно избивать динозавров.',
    'Ты как GPS в плохой погоде – тупишь и ведёшь не туда.',
    'Если бы тупость продавали, ты был бы биткоином 2010 года – ценность нулевая, но экземпляр редкий.',
    'Ты не из тех, кто учится на ошибках. Ты просто коллекционируешь их.',
    'Если бы лень была спортом, ты бы не участвовал – потому что лень.',
    'Ты так часто ошибаешься, что твоя жизнь – это speedrun по фейлам.',
    'Тебе платят за то, чтобы ты был таким? Потому что кажется, что ты профи.',
    'Ты как старый телевизор – картинка слабая, звук раздражающий, но выбросить жалко.',
    'Ты — доказательство, что законы физики можно игнорировать, ведь у тебя нет притяжения.',
  ];

  constructor(
    @inject(TYPES.MemberService) private readonly userService: MemberService,
    @inject(TYPES.TextService) private readonly text: TextService,
    @inject(TYPES.ArgsService) private readonly args: ArgsService,
  ) {
    super();
    this.setupHandlers();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private setupHandlers(): void {
    this.command('banbs', this.handleBanbs.bind(this));
    this.command('summon_demons', this.handleSummonDemons.bind(this));
    this.command('fuck_music', this.handleFuckMusic.bind(this));
    this.command('die', this.handleDie.bind(this));
    this.command('roast', this.handleRoast.bind(this));
    this.command('rickroll', this.handleRickroll.bind(this));
    this.command('delete_account', this.handleDeleteAccount.bind(this));
    this.command('self_destruct', this.handleSelfDestruct.bind(this));
    this.command('ping_behruz', this.handlePingBehruz.bind(this));
    this.command('greet', this.handleGreet.bind(this));
    this.command('terebinder', this.handleTerebinder.bind(this));
    this.command('8ball', this.handle8ball.bind(this));
  }

  private async handleGreet(ctx: CommandContext): Promise<void> {
    await ctx.reply(this.text.get('greetings'));
  }

  private async handleBanbs(ctx: CommandContext): Promise<void> {
    const commandArgs = this.args.parse(ctx.message.text);
    if (commandArgs.length < 2) {
      await ctx.reply('Нужно указать пользователя');
      return;
    }

    const target = commandArgs[1];
    await ctx.reply(`${target} был забанен. Причина: недостаток интеллекта.`);

    await this.sleep(5000);
    await ctx.reply('Ладно, шучу. У нас тут демократия. Пока что...');
  }

  private async handleSummonDemons(ctx: CommandContext): Promise<void> {
    await ctx.reply('🔮 Начинаем ритуал призыва...');
    await this.sleep(2000);
    await ctx.reply('🌑 Тьма сгущается...');
    await this.sleep(3000);
    await ctx.reply('🕯️ Кто-то постучался в дверь...');
    await this.sleep(4000);
    await ctx.reply('👁️ Он здесь. О, нет. ОН СМОТРИТ НА ТЕБЯ, @' + ctx.from.username);
    await this.sleep(6000);
    await ctx.reply('Ладно, шучу. Или нет?');
  }

  private async handleFuckMusic(ctx: CommandContext): Promise<void> {
    await ctx.reply(this.text.get('fuckMusic'));
  }

  private async handleDie(ctx: CommandContext): Promise<void> {
    const currentYear = new Date().getFullYear();
    await ctx.reply(
      `${ctx.from.first_name} больше нет с нами... 😵\n\nR.I.P. ${ctx.from.first_name}, ${currentYear}-${currentYear + 50} 🕯️`,
    );
  }

  private async handleRoast(ctx: CommandContext): Promise<void> {
    const [, mention] = this.args.parse(ctx.message.text);
    const roast = this.roasts[Math.floor(Math.random() * this.roasts.length)];
    await ctx.reply(`${mention || '@' + ctx.from.username}, ${roast}`);
  }

  private async handleRickroll(ctx: CommandContext): Promise<void> {
    await ctx.reply(
      'Срочная новость! Невероятная информация: https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
  }

  private async handleDeleteAccount(ctx: CommandContext): Promise<void> {
    await ctx.reply(
      '⚠️ Ваш запрос на удаление аккаунта подтверждён. Удаление через 10 секунд... 😱',
    );

    for (let i = 10; i > 0; i--) {
      await this.sleep(1000);
      await ctx.reply(`${i}...`);
    }

    await ctx.reply('💀 Ошибка: недостаточно интеллекта для удаления.');
  }

  private async handleSelfDestruct(ctx: CommandContext): Promise<void> {
    await ctx.reply('⚠️ Система самоуничтожения активирована! ⚠️');

    for (let i = 5; i > 0; i--) {
      await this.sleep(1000);
      await ctx.reply(`${i}...`);
    }

    await ctx.reply('💥 БУМ! Ах да, это же просто чат. Продолжайте.');
  }

  private async handlePingBehruz(ctx: CommandContext): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await ctx.reply('@BEHruzM_17');
    }
  }

  // Add this function to create a seeded random number generator
  private createSeededRandom(seed: number) {
    return function () {
      // Simple mulberry32 algorithm for seeded random numbers
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private async handle8ball(ctx: CommandContext): Promise<void> {
    const responses = [
      'Бесспорно.',
      'Вероятно, да.',
      'Спроси позже.',
      'Не рассчитывай на это.',
      'Определённо нет.',
      '💩 Лучше не знать ответа.',
    ];
    const answer = responses[Math.floor(Math.random() * responses.length)];
    await ctx.reply(`🎱 ${answer}`);
  }

  private async handleTerebinder(ctx: CommandContext): Promise<void> {
    await ctx.reply('🔮 Теребиндер пробуждается...');

    // Create a typing effect for dramatic effect
    const message = '⚡ Анализирую твою ауру... ⚡';
    let currentText = '...';

    const sentMessage = await ctx.reply(currentText);

    // Simulate typing effect by updating the message character by character
    for (let i = 0; i < message.length; i++) {
      const char = message[i];
      currentText += char;
      // if whitespace, skip
      if (char === ' ') {
        continue;
      }
      if (i % 2 === 0) {
        continue;
      }
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        sentMessage.message_id,
        undefined,
        currentText,
      );
      await this.sleep(300); // Delay between characters
    }

    await this.sleep(1000);

    // Generate a "random" but deterministic fortune based on the user's username
    const username = ctx.from.username || ctx.from.first_name;
    const today = new Date();
    const dailyIdentifier = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const usernameSeed = [...username].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const dateSeed = [...dailyIdentifier].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const combinedSeed = usernameSeed + dateSeed;
    // Create seeded random function
    const seededRandom = this.createSeededRandom(combinedSeed);

    // Then replace your getSeededIndex function with this simpler version
    const getRandomItem = <T>(array: T[]): T => {
      const index = Math.floor(seededRandom() * array.length);
      return array[index % array.length]!;
    };

    // Define fortune components with more variety and modularity
    // Первая часть предсказания - временной период
    const timeFramePrefixes = ['Через', 'Ровно через', 'Примерно через', 'В течение следующих'];

    const timeFrameValues = [
      '3 дня',
      'неделю',
      '2 недели',
      'месяц',
      '42 часа',
      'полнолуние',
      'ретроградный Меркурий',
    ];

    // Вторая часть - место события
    const locations = [
      'в общественном транспорте',
      'на работе',
      'в интернете',
      'в очереди за кофе',
      'в подъезде',
      'на пешеходном переходе',
      'в супермаркете',
      'в соцсетях',
      'во сне',
      'в параллельной вселенной, которая очень похожа на нашу',
    ];

    // Третья часть - глагол (что произойдет)
    const verbs = [
      'встретишь',
      'найдёшь',
      'получишь',
      'услышишь',
      'увидишь',
      'придумаешь',
      'создашь',
      'потеряешь',
      'обретёшь',
    ];

    // Четвертая часть - что именно (объект)
    const objects = [
      'человека, который изменит твою жизнь',
      'решение проблемы, над которой давно думаешь',
      'новую возможность заработка',
      'неожиданное сообщение',
      'вдохновение для нового проекта',
      'утерянную вещь из детства',
      'второй носок, который пропал при стирке в 2018 году',
      'ответ на вопрос, который тебя давно тревожит',
      'новое хобби, в котором внезапно преуспеешь',
      'мем, который станет вирусным благодаря тебе',
    ];

    // Пятая часть - последствия
    const consequences = [
      'Это принесёт тебе удачу',
      'Это заставит тебя улыбаться неделю',
      'Это решит твои финансовые проблемы',
      'Это изменит твой взгляд на мир',
      'Это станет началом чего-то большого',
      'Это будет абсолютно бесполезно, но очень забавно',
      'От этого зависит судьба человечества, хотя ты об этом не узнаешь',
      'Из-за этого ты пропустишь автобус, но это к лучшему',
      'Благодаря этому ты выиграешь спор с коллегой',
      'Это сделает тебя немного счастливее',
    ];

    // Шестая часть - совет
    const advicePrefixes = [
      'Звёзды советуют:',
      'Чтобы это сбылось:',
      'Важное указание:',
      'Теребиндер настоятельно рекомендует:',
      'Космический совет дня:',
      'Древняя мудрость Теребиндера гласит:',
    ];

    const adviceContents = [
      'носи в кармане что-нибудь зелёное',
      'не принимай важных решений по средам',
      'улыбайся чаще обычного',
      'сделай комплимент незнакомцу',
      'попробуй новое блюдо',
      'смени рингтон на телефоне',
      'поговори с растением дома',
      'напиши сообщение старому другу',
      'послушай музыку, которую никогда раньше не слушал',
      'вычисли число Пи до 10-го знака и прошепчи его перед сном',
      'посмотри на закат и задумчиво вздохни',
    ];

    // Седьмая часть - предостережение
    const warningPrefixes = [
      'Но остерегайся:',
      'Избегай:',
      'Опасайся:',
      'Будь осторожен с:',
      'Теребиндер предупреждает:',
      'Судьба шепчет опасение:',
    ];

    const warningContents = [
      'людей в фиолетовых носках',
      'разговоров о погоде с незнакомцами',
      'чёрных кошек с белыми пятнами (обычные чёрные кошки безопасны)',
      'покупок со скидкой 42%',
      "песен, которые начинаются с буквы 'К'",
      'чисел, делящихся на 7',
      'еды с названиями длиннее шести букв',
      'сообщений, отправленных ровно в полдень',
      'дверей с необычными ручками',
      'людей, которые моргают чаще обычного',
    ];

    // Восьмая часть - случайный факт
    const randomFactPrefixes = [
      'Интересный факт:',
      'Теребиндер знает, что:',
      'Мало кто знает, но:',
      'Совершенно секретно:',
      'Странное совпадение:',
      'Теребиндер подсмотрел в твоём будущем:',
    ];

    const randomFactContents = [
      'твоё любимое число думает о тебе каждый день',
      'в параллельной вселенной ты изобрёл телепорт',
      'твои носки образуют тайное общество',
      'твой холодильник ведёт дневник о тебе',
      'ты однажды чуть не встретил знаменитость, но не заметил',
      'твой кот/собака (если есть) пишет о тебе мемуары',
      'ты будешь упомянут в книге рекордов через 17 лет',
      'кто-то сохранил твоё сообщение в избранное',
      'ровно 7 человек помнят тебя из детского сада',
      'в следующем месяце ты будешь случайно сфотографирован туристом',
    ];

    // Используем username для создания детерминированных, но уникальных предсказаний
    const getSeededIndex = (array: any[], offset: number = 0): number => {
      return Math.abs((combinedSeed * (offset + 1)) % array.length);
    };

    // Use it to select items from your arrays
    const timeFramePrefix = getRandomItem(timeFramePrefixes);
    const timeFrameValue = getRandomItem(timeFrameValues);
    const location = getRandomItem(locations);
    const verb = getRandomItem(verbs);
    const object = getRandomItem(objects);
    const consequence = getRandomItem(consequences);
    const advicePrefix = getRandomItem(advicePrefixes);
    const adviceContent = getRandomItem(adviceContents);
    const warningPrefix = getRandomItem(warningPrefixes);
    const warningContent = getRandomItem(warningContents);
    const randomFactPrefix = getRandomItem(randomFactPrefixes);
    const randomFactContent = getRandomItem(randomFactContents);

    // Calculate accuracy using seeded random
    const accuracy = Math.floor(seededRandom() * 42) + 59; // 59% to 100%

    // Generate lucky numbers
    const luckyNumbers = [];
    for (let i = 0; i < 3; i++) {
      luckyNumbers.push(Math.floor(seededRandom() * 100) + 1);
    }

    // Make the fortune
    const fortuneText =
      `🔮 *ПРЕДСКАЗАНИЕ ТЕРЕБИНДЕРА НА СЕГОДНЯ* 🔮\n\n` +
      `👤 *${username}*\n\n` +
      `🕰️ *${timeFramePrefix} ${timeFrameValue}* ${location} ты ${verb} ${object}. ${consequence}.\n\n` +
      `💡 *${advicePrefix}* ${adviceContent}.\n\n` +
      `⚠️ *${warningPrefix}* ${warningContent}.\n\n` +
      `🧠 *${randomFactPrefix}* ${randomFactContent}.\n\n` +
      `🎲 *Счастливые числа:* ${luckyNumbers.join(', ')}.\n\n` +
      `📊 *Точность предсказания:* ${accuracy}%`;

    // Send the fortune
    await ctx.reply(fortuneText, { parse_mode: 'Markdown' });

    await this.sleep(2000);

    // Generate a conclusion
    const conclusions = [
      'Теребиндер никогда не ошибается. Почти никогда. Иногда. Редко бывает прав, если честно.',
      'Предсказание составлено лично для тебя. И для тех, у кого похожее имя.',
      'Твоя судьба на сегодня теперь предопределена. Завтра составим новую.',
      'Если предсказание не сбудется, значит, ты живёшь в другой вселенной.',
      'Теребиндер использовал все свои магические силы. Перезарядка к завтрашнему дню.',
      'Это предсказание действительно только сегодня. Завтра будет совершенно новое!',
    ];

    const conclusionIndex = getSeededIndex(conclusions, 12);
    await ctx.reply(conclusions[conclusionIndex % conclusions.length]!);

    // Показать когда будет доступен следующий предсказание
    const nextPredictionTime = new Date();
    nextPredictionTime.setDate(nextPredictionTime.getDate() + 1);
    nextPredictionTime.setHours(12, 0, 0, 0);
    const timeUntilNextPrediction = nextPredictionTime.getTime() - Date.now();

    await ctx.reply(
      `🕰️ *Следующее предсказание будет доступно через* ${Math.floor(timeUntilNextPrediction / (1000 * 60))} минут.`,
      { parse_mode: 'Markdown' },
    );
  }
}
