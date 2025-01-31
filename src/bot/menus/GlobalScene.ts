import { Scenes } from "telegraf";
import { IBotContext } from "../../context/context.interface";
import { UserService } from "../services/UserService";
import handleCheckMusic from "../handlers/handleCheckMusic";
import { message } from "telegraf/filters";
import { MusicGuessService } from "../services/musicGuess.service";
import { GameRepository } from "../repositories/GameRepository";

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
    private musicGuessService: MusicGuessService,
    private gameRepository: GameRepository,
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
        const responses = [
          "Ой, кажется, кто-то забыл проверить свои права доступа! Спойлер: их нет.",
          "Ха! Хорошая попытка. Но нет. Совсем нет.",
          "О, смотрите, у нас тут самозванец! Как мило.",
          `Извини, но твоё "я хочу" для меня звучит как "пожалуйста, проигнорируй меня".`,
        ];
        await ctx.reply(this.getRandomResponse(responses));
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
      await this.musicGuessService.processGuess(ctx, +roundId, +guessId);
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
        await this.musicGuessService.processRound(ctx);

        await ctx.answerCbQuery();
      }
    });

    this.command("next_round", async (ctx) => {
      if (ctx.from.username !== "khodis") {
        await ctx.reply(
          "Ой, смотри-ка, у нас тут новый админ. Ах, нет, подождите, это просто кто-то пытается нажать кнопку без прав!",
        );
        return;
      }
      await this.musicGuessService.nextRound(ctx);
    });

    this.command("show_leaderboards", async (ctx) => {
      await this.musicGuessService.showLeaderboard(ctx);
    });

    this.command("fuck_music", async (ctx) => {
      const username = ctx.from.username;
      const responses = [
        `/fuck_${username} — вот это ты, да, именно ты. Горжусь твоей самокритичностью!`,
        `Ого! Кто-то сегодня встал не с той ноги? Или это твоё обычное состояние, ${username}?`,
        `А давайте лучше обсудим, почему ${username} такой агрессивный? Детские травмы? Несчастная любовь?`,
      ];
      await ctx.reply(this.getRandomResponse(responses));
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
      await this.musicGuessService.showHint(ctx);
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
