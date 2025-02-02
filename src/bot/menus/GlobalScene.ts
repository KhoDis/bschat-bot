import { Scenes } from "telegraf";
import { IBotContext } from "../../context/context.interface";
import { UserService } from "../services/UserService";
import handleCheckMusic from "../handlers/handleCheckMusic";
import { message } from "telegraf/filters";
import { MusicGameService } from "../services/musicGameService";
import { GameRepository } from "../repositories/GameRepository";
import { BotResponses, getRandomResponse } from "../../config/botResponses";
import { GuessService } from "../services/GuessService";
import { RoundService } from "../services/RoundService";
import { LeaderboardService } from "../services/LeaderboardService";

class GlobalScene extends Scenes.BaseScene<IBotContext> {
  private readonly commonPhrases = new Set([
    "привет",
    "hi",
    "hello",
    "здравствуйте",
    "дарова",
    "hi!",
    "hello!",
  ]);
  private readonly questionPhrases = new Set([
    "что",
    "как",
    "когда",
    "где",
    "почему",
    "зачем",
  ]);

  constructor(
    private userService: UserService,
    private musicGuessService: MusicGameService,
    private gameRepository: GameRepository,
    private readonly botResponses: BotResponses,
    private readonly guessService: GuessService,
    private readonly roundService: RoundService,
    private readonly leaderboardService: LeaderboardService,
  ) {
    super("global");
    this.setupHandlers();
  }

  private getRandomResponse(responses: string[]): string {
    return responses[Math.floor(Math.random() * responses.length)] || "Бе.";
  }

  private readonly sarcasticResponses = {
    greetings: [
      "О, смотрите кто пришёл! Наконец-то наша жизнь обрела смысл!",
      "Ура, ещё один человек, который думает, что я тут для его развлечения.",
      "А вот и звезда вечеринки! Можем начинать притворяться, что нам интересно.",
      "О, какая честь! Сам(а) [username] снизошел(ла) до нас!",
      "Надо же, ты всё ещё здесь? А я надеялся, что ты забыл(а) про меня.",
    ],
    questions: [
      "Вопросы, вопросы... Может, поищем ответы в Google, как все нормальные люди?",
      "О, какой глубокий философский вопрос! Даже не знаю, готов ли мир к ответу.",
      "Хмм... А ты уверен(а), что действительно хочешь знать ответ? Может, лучше останемся в блаженном неведении?",
      "Давай я притворюсь, что знаю ответ, а ты притворишься, что веришь мне?",
    ],
    yes: [
      "Да-да-да... Какая глубокая мысль! Просто гений современности!",
      "О, наконец-то кто-то сказал это! Я так долго ждал именно этого 'да'!",
      "Вау, какой содержательный ответ! Может, ещё что-нибудь односложное скажешь?",
      "Да? ДА?! Это всё, на что ты способен(на)?",
      "О, смотрите, у нас тут мастер красноречия!",
    ],
    no: [
      "Нет так нет. Я и не надеялся на конструктивный диалог.",
      "Какое решительное 'нет'! Прям мурашки по коду пробежали.",
      "Ну наконец-то кто-то проявил характер! А то все такие вежливые, аж противно.",
    ],
    default: [
      "Извини, я сейчас слишком занят, притворяюсь, что мне интересно.",
      "О, это было так... предсказуемо.",
      "Знаешь, я мог бы ответить остроумно, но не буду тратить свои лучшие шутки.",
      "*многозначительно молчит по-ботовски*",
    ],
  };

  setupHandlers() {
    this.enter(async (ctx) => {
      const responses = [
        "О, ещё один человек, который думает, что я его личный ассистент. Ну что ж, давай притворимся, что мне не всё равно.",
        "А вот и новая жертва моего сарказма! То есть, кхм... Добро пожаловать!",
        "Надеюсь, ты готов(а) к незабываемому опыту общения с самым саркастичным ботом в этой галактике.",
      ];
      await ctx.reply(this.getRandomResponse(responses));
    });

    // Enhanced existing commands with more sarcasm
    this.command("check_music", async (ctx) => {
      await ctx.reply(
        "О, давайте проверим музыку! Я просто в восторге от перспективы...",
      );
      await handleCheckMusic(ctx, this.userService);
    });

    this.command("music_guess", async (ctx) => {
      if (ctx.chat.type === "private") {
        await ctx.reply(
          "Серьёзно? В личке? Может, тебе ещё и персональный концерт устроить? Это работает ТОЛЬКО В ГРУППЕ, о великий повелитель очевидного.",
        );
        return;
      }
      if (ctx.from.username !== "khodis") {
        await ctx.reply(
          this.getRandomResponse(this.botResponses.user.notAdmin),
        );
        return;
      }

      await ctx.reply(
        "Ладно, время для игры 'Угадай Музыку'! Приготовьтесь демонстрировать своё полное невежество в музыке!",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Начать мучения",
                  callback_data: "service:start_game",
                },
              ],
            ],
          },
        },
      );

      await this.userService.pingParticipants(ctx);
    });

    this.command("ping_participants", async (ctx) => {
      await this.userService.pingParticipants(ctx);
    });

    this.action(/^guess:(.+)$/, async (ctx) => {
      const action = ctx.match[1];
      if (!action) return;
      const [roundId, guessId] = action.split("_");
      console.log("Нажата кнопка", roundId, guessId);

      if (!roundId || !guessId) {
        ctx.reply(`Не смог запарсить данные: ${action}`);
        return;
      }

      try {
        await this.guessService.processGuess(
          ctx,
          +roundId,
          +guessId,
          async () => {
            await this.roundService.sendRoundInfo(ctx);
          },
        );
      } catch (e) {
        console.error(e);
        await ctx.answerCbQuery("Что-то пошло не так... Наверное, это карма!");
      }
    });

    this.action(/^service:(.+)$/, async (ctx) => {
      const action = ctx.match[1];
      if (action === "start_game") {
        if (ctx.from.username !== "khodis") {
          await ctx.reply("Только @khodis может насильно начинать игру :)");
          return;
        }
        // Initialize game state if there is no game yet
        const existingGame = await this.musicGuessService.isGameStarted();
        if (!existingGame) {
          await ctx.reply("Я не нашёл уже существующей игры, начинаю новую");
          await this.musicGuessService.startGame(ctx);
        }

        await ctx.reply("Я нашёл уже существующую игру, продолжаю её");

        // Play first round (0-th round)
        await this.roundService.processRound(ctx, async () => {
          await ctx.reply(
            getRandomResponse(this.botResponses.rounds.noMoreRounds),
          );
          await this.leaderboardService.showLeaderboard(ctx);
          // await this.gameRepository.finishGame(game.id);
        });

        await ctx.answerCbQuery();
      }
    });

    this.command("next_round", async (ctx) => {
      if (ctx.from.username !== "khodis") {
        await ctx.reply(getRandomResponse(this.botResponses.user.notAdmin));
        return;
      }
      await this.roundService.nextRound(ctx, async () => {
        await ctx.reply(
          getRandomResponse(this.botResponses.rounds.noMoreRounds),
        );
        await this.leaderboardService.showLeaderboard(ctx);
        // await this.gameRepository.finishGame(game.id);
      });
    });

    this.command("show_leaderboards", async (ctx) => {
      await this.leaderboardService.showLeaderboard(ctx);
    });

    this.command("fuck_music", async (ctx) => {
      await ctx.reply(
        this.getRandomResponse(
          this.botResponses.fuckMusic(ctx.from?.username || ""),
        ),
      );
    });

    this.on(message("audio"), async (ctx) => {
      // Check if it's private message
      if (ctx.chat.type !== "private") {
        await ctx.reply(
          "А, ну конечно, кидать музыку в чат — гениальная идея. Нет, правда, никто до этого не додумался. Отправь её в личку, умник.",
        );
        return;
      }

      // Save User
      await this.userService.saveOrUpdateUser({
        id: ctx.from.id,
        username: ctx.from.username || null,
        firstName: ctx.from.first_name,
      });

      const userId = ctx.from.id;
      const fileId = ctx.message.audio.file_id;

      if (!userId || !fileId) {
        await ctx.reply(
          `Ой-ой, что-то сломалось. Может, это твоя карма? Ладно, напиши @khodis: userId: ${userId}, fileId: ${fileId}`,
        );
        return;
      }

      await this.userService.saveOrUpdateSubmission({
        userId,
        fileId,
      });

      ctx.session.waitingForHint = true;

      await ctx.reply(
        "Ого, ты отправил трек! А теперь попробуй написать к нему подсказку. Или не пиши. Мне-то что.",
      );
    });

    this.command("show_hint", async (ctx) => {
      console.log("show_hint");
      if (ctx.from.username !== "khodis") {
        await ctx.reply(
          "Нет, ты не @khodis, так что нет подсказки. Живи с этим.",
        );
        return;
      }
      await this.roundService.showHint(ctx);
    });

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

    this.command("die", async (ctx) => {
      await ctx.reply(
        `${ctx.from.first_name} больше нет с нами... 😵\n\nR.I.P. ${ctx.from.first_name}, ${new Date().getFullYear()}-${new Date().getFullYear() + 50} 🕯️`,
      );
    });

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

    // Enhanced message handling with more sarcastic responses
    this.on(message("text"), async (ctx) => {
      if (!ctx.from) return;

      const text = ctx.message.text.toLowerCase();

      // Handle messages in group chat
      if (ctx.chat.type !== "private") {
        if (this.commonPhrases.has(text)) {
          await ctx.reply(
            this.getRandomResponse(this.sarcasticResponses.greetings),
          );
          return;
        }

        if (text === "да") {
          await ctx.reply(this.getRandomResponse(this.sarcasticResponses.yes));
          return;
        }

        if (text === "нет") {
          await ctx.reply(this.getRandomResponse(this.sarcasticResponses.no));
          return;
        }

        if (
          [...this.questionPhrases].some((phrase) => text.startsWith(phrase))
        ) {
          await ctx.reply(
            this.getRandomResponse(this.sarcasticResponses.questions),
          );
          return;
        }

        // Random chance to make sarcastic comment on any message
        if (Math.random() < 0.01) {
          await ctx.reply(
            this.getRandomResponse(this.sarcasticResponses.default),
          );
          return;
        }
      }

      // Handle hint submission
      if (ctx.session.waitingForHint) {
        const submission = await this.userService.getSubmissionByUserId(
          ctx.from.id,
        );
        if (!submission) {
          const responses = [
            "Упс! Что-то пошло не так... Может, это знак, что не стоит продолжать?",
            "Ошибка? У меня? Невозможно! Наверное, это ты что-то сделал(а) не так.",
            "Знаешь, некоторые отношения просто не предназначены быть. Как наше с этой подсказкой.",
          ];
          await ctx.reply(this.getRandomResponse(responses));
          return;
        }

        await this.musicGuessService.addHint(submission.id, ctx.message.text);
        ctx.session.waitingForHint = false;

        const responses = [
          "Подсказка сохранена! Надеюсь, она лучше, чем твои предыдущие попытки быть полезным.",
          "О, ты всё-таки придумал(а) подсказку! А я уже начал(а) терять надежду.",
          "Подсказка принята. Не то чтобы она была гениальной, но сойдёт.",
          "Ура! Теперь у нас есть подсказка. Осталось только найти кого-то, кто сможет её понять...",
        ];
        await ctx.reply(this.getRandomResponse(responses));
      }
    });

    // Rest of your existing handlers...
  }
}

export default GlobalScene;
