import { Scenes } from "telegraf";
import { IBotContext } from "../../context/context.interface";
import { UserService } from "../services/UserService";
import handleCheckMusic from "../handlers/handleCheckMusic";
import { message } from "telegraf/filters";
import { MusicGuessService } from "../services/musicGuess.service";
import { GameRepository } from "../repositories/GameRepository";

class GlobalScene extends Scenes.BaseScene<IBotContext> {
  constructor(
    private userService: UserService,
    private musicGuessService: MusicGuessService,
    private gameRepository: GameRepository,
  ) {
    super("global");

    this.setupHandlers();
  }

  setupHandlers() {
    this.enter(async (ctx) => {
      await ctx.reply(
        "О, еще один человек, который думает, что я его личный ассистент. Ну ладно, отправь музыку или напиши /check_music.",
      );
    });

    this.command("check_music", async (ctx) =>
      handleCheckMusic(ctx, this.userService),
    );

    this.command("music_guess", async (ctx) => {
      if (ctx.chat.type === "private") {
        await ctx.reply(
          "Ахаха, серьезно? Это работает только в группе. Попробуй ещё раз, но на этот раз в группе.",
        );
        return;
      }
      if (ctx.from.username !== "khodis") {
        await ctx.reply("Ой, а ты кто? Решил тут командовать? Ну-ну.");
        return;
      }

      await ctx.reply(
        "Ладно, добро пожаловать в игру 'Угадай Музыку'. Готовьтесь, будет весело. Или нет. Посмотрим.",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Начать сейчас",
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
      ctx.reply(`/fuck_${username} — вот это ты, да, именно ты.`);
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

      console.log("show_hint");
      await this.musicGuessService.showHint(ctx);
    });

    this.on(message("text"), async (ctx) => {
      if (!ctx.from) {
        return;
      }
      // If it's from the group chat
      if (ctx.chat.type !== "private") {
        if (ctx.message.text.toLowerCase() === "да") {
          const responses = [
            "О, да, конечно. И что дальше?",
            "Ахаха, гениально. Просто да. Вот это уровень.",
            "Я тоже так думаю. Ну, почти. На самом деле нет.",
          ];
          await ctx.reply(
            responses[Math.floor(Math.random() * responses.length)] || "",
          );
          return;
        }
      }
      if (ctx.session.waitingForHint) {
        const submission = await this.userService.getSubmissionByUserId(
          ctx.from.id,
        );
        if (!submission) {
          await ctx.reply(
            "Что-то пошло не так... Может, просто выйдешь и зайдёшь заново?",
          );
          return;
        }

        await this.musicGuessService.addHint(submission.id, ctx.message.text);
        ctx.session.waitingForHint = false;
        await ctx.reply(
          "Подсказка сохранена! Я бы тебя похвалил, но мне лень. Так что просто радуйся.",
        );
      }
    });
  }
}

export default GlobalScene;
