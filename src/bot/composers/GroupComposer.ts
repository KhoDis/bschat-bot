import { message } from "telegraf/filters";
import { IBotContext } from "../../context/context.interface";
import { Composer } from "telegraf";
import { UserService } from "../services/UserService";
import { BotResponses, getRandomResponse } from "../../config/botResponses";
import { RoundService } from "../services/RoundService";
import { GuessService } from "../services/GuessService";
import { MusicGameService } from "../services/musicGameService";
import { LeaderboardService } from "../services/LeaderboardService";

export class GroupComposer extends Composer<IBotContext> {
  constructor(
    private userService: UserService,
    private roundService: RoundService,
    private musicGuessService: MusicGameService,
    private guessService: GuessService,
    private leaderboardService: LeaderboardService,
    private botResponses: BotResponses,
  ) {
    super();

    this.setupHandlers();
  }

  private setupHandlers() {
    this.command("music_guess", async (ctx) => {
      // TODO: add contracts
      if (ctx.chat.type === "private") {
        await ctx.reply(
          "Серьёзно? В личке? Может, тебе ещё и персональный концерт устроить? Это работает ТОЛЬКО В ГРУППЕ, о великий повелитель очевидного.",
        );
        return;
      }
      if (ctx.from.username !== "khodis") {
        await ctx.reply(getRandomResponse(this.botResponses.user.notAdmin));
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
  }
}
