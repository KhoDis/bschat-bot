import { message } from "telegraf/filters";
import { IBotContext } from "../../context/context.interface";
import { Composer } from "telegraf";
import { UserService } from "../services/UserService";
import { BotResponses, getRandomResponse } from "../../config/botResponses";

export class JokerComposer extends Composer<IBotContext> {
  constructor(
    private userService: UserService,
    private botResponses: BotResponses,
  ) {
    super();

    this.setupHandlers();
  }

  private setupHandlers() {
    this.command("banbs", async (ctx) => {
      const commandArgs = ctx.message.text.split(" ");
      if (commandArgs.length < 2) {
        await ctx.reply("Нужно указать пользователя");
        return;
      }

      const target = commandArgs[1];

      await ctx.reply(`${target} был забанен. Причина: недостаток интеллекта.`);

      setTimeout(async () => {
        await ctx.reply(`Ладно, шучу. У нас тут демократия. Пока что...`);
      }, 5000);
    });

    this.command("summon_demons", async (ctx) => {
      await ctx.reply("🔮 Начинаем ритуал призыва...");
      await new Promise((r) => setTimeout(r, 2000));
      await ctx.reply("🌑 Тьма сгущается...");
      await new Promise((r) => setTimeout(r, 3000));
      await ctx.reply("🕯️ Кто-то постучался в дверь...");
      await new Promise((r) => setTimeout(r, 4000));
      await ctx.reply(
        "👁️ Он здесь. О, нет. ОН СМОТРИТ НА ТЕБЯ, @" + ctx.from.username,
      );
      setTimeout(() => ctx.reply("Ладно, шучу. Или нет?"), 6000);
    });

    this.command("fuck_music", async (ctx) => {
      await ctx.reply(
        getRandomResponse(
          this.botResponses.fuckMusic(ctx.from?.username || ""),
        ),
      );
    });

    this.command("die", async (ctx) => {
      await ctx.reply(
        `${ctx.from.first_name} больше нет с нами... 😵\n\nR.I.P. ${ctx.from.first_name}, ${new Date().getFullYear()}-${new Date().getFullYear() + 50} 🕯️`,
      );
    });

    const roasts = [
      "Твой интеллект можно уместить на флешке 256 Кб.",
      "Если бы тупость светилась, ты был бы солнцем.",
      "Ты как Wi-Fi в метро – иногда ловишь, но в целом нет.",
      "Твой словарный запас – это просто смайлы.",
      "Ты — доказательство, что эволюция иногда идёт в обратную сторону.",
      "У тебя столько харизмы, сколько FPS в Minecraft на калькуляторе.",
      "Если бы был конкурс на худшее оправдание, ты бы проиграл.",
      "Ты настолько ленивый, что твоя тень двигается больше, чем ты.",
      "Я бы тебя унизил, но природа уже сделала это за меня.",
      "Ты как будильник без батарейки – бесполезен и раздражаешь.",
      "Твой IQ можно измерять в комнатной температуре (в градусах Цельсия).",
      "Если бы тупость была преступлением, ты бы получил пожизненный срок.",
      "У тебя есть талант! Правда, никто пока не понял, какой.",
      "Твои аргументы такие же слабые, как интернет в деревне.",
      "Ты как NPC в старых играх – повторяешь одно и то же без причины.",
      "Ты пытаешься быть умным, но твои мозги работают в демо-версии.",
      "Если бы болтовня сжигала калории, ты был бы моделью.",
      "Ты как антивирус 2005 года – тормозишь и бесполезен.",
      "Ты мог бы участвовать в Олимпиаде… по фейлам.",
      "Ты настолько скучный, что даже Google не хочет тебя искать.",
      "Если бы был турнир по ошибкам, ты бы ошибся с регистрацией.",
      "Ты как батарейка из дешёвого фонарика – разряжаешься в самый важный момент.",
      "Ты пробовал молчать? Это тебе идёт больше, чем говорить.",
      "Твои шутки такие старые, что ими можно избивать динозавров.",
      "Ты как GPS в плохой погоде – тупишь и ведёшь не туда.",
      "Если бы тупость продавали, ты был бы биткоином 2010 года – ценность нулевая, но экземпляр редкий.",
      "Ты не из тех, кто учится на ошибках. Ты просто коллекционируешь их.",
      "Если бы лень была спортом, ты бы не участвовал – потому что лень.",
      "Ты так часто ошибаешься, что твоя жизнь – это speedrun по фейлам.",
      "Тебе платят за то, чтобы ты был таким? Потому что кажется, что ты профи.",
      "Ты как старый телевизор – картинка слабая, звук раздражающий, но выбросить жалко.",
      "Ты — доказательство, что законы физики можно игнорировать, ведь у тебя нет притяжения.",
    ];

    this.command("roast", async (ctx) => {
      const mention = ctx.message.text.split(" ")[1] || "@неудачник";
      const roast = roasts[Math.floor(Math.random() * roasts.length)];
      await ctx.reply(`${mention}, ${roast}`);
    });

    this.command("rickroll", async (ctx) => {
      await ctx.reply(
        "Срочная новость! Невероятная информация: https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      );
    });

    this.command("delete_account", async (ctx) => {
      await ctx.reply(
        "⚠️ Ваш запрос на удаление аккаунта подтверждён. Удаление через 10 секунд... 😱",
      );
      for (let i = 10; i > 0; i--) {
        await new Promise((r) => setTimeout(r, 1000));
        await ctx.reply(`${i}...`);
      }
      await ctx.reply("💀 Ошибка: недостаточно интеллекта для удаления.");
    });

    this.command("self_destruct", async (ctx) => {
      await ctx.reply("⚠️ Система самоуничтожения активирована! ⚠️");
      for (let i = 5; i > 0; i--) {
        await new Promise((r) => setTimeout(r, 1000));
        await ctx.reply(`${i}...`);
      }
      await ctx.reply("💥 БУМ! Ах да, это же просто чат. Продолжайте.");
    });

    this.command("ping_behruz", async (ctx) => {
      await ctx.reply("@BEHruzM_17");
      await ctx.reply("@BEHruzM_17");
      await ctx.reply("@BEHruzM_17");
    });
  }
}
