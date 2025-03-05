import { Context } from "telegraf";
import {
  GameRepository,
  GameWithData,
  RoundWithGuesses,
} from "../repositories/GameRepository";
import { BotTemplates, getRandomResponse } from "@/config/botTemplates";
import { IBotContext } from "@/context/context.interface";
import { Result } from "@/utils/Result";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { Game, GameRound, User } from "@/types";

export class RoundService {
  constructor(
    private gameRepository: GameRepository,
    private readonly botResponses: BotTemplates,
  ) {}

  async processRound(ctx: Context, onNoRound: () => Promise<void>) {
    const game = await this.gameRepository.getCurrentGame();
    const context = this.validateRound(game);

    await context.match(
      async ({ game, round }) => {
        const currentRound = await this.gameRepository.getCurrentRound();
        if (!currentRound) {
          await onNoRound();
          return;
        }
        const participants = await this.gameRepository.getParticipants();
        await this.playRound(ctx, participants, currentRound);
      },
      async () => {
        getRandomResponse(this.botResponses.gameState.noGame);
      },
    );
  }

  private async playRound(
    ctx: Context,
    participants: User[],
    currentRound: RoundWithGuesses,
  ) {
    const buttons = participants.map((user) => ({
      text: user.name,
      // NOTE: USE ID HERE, BECAUSE IT IS UNIQUE, NOT ROUND INDEX
      callback_data: `guess:${currentRound.id}_${user.id}`,
    }));

    const captions = [
      "Угадываем! Или хотя бы делаем вид...",
      "Время показать свою музыкальную ~безграмотность~ эрудицию!",
      "Ну что, готовы к новым музыкальным открытиям?",
      "Внимание! Сейчас будет что-то... интересное.",
    ];

    await ctx.replyWithAudio(currentRound.submission.fileId, {
      caption: getRandomResponse(captions),
      reply_markup: { inline_keyboard: this.chunkButtons(buttons, 3) },
    });

    console.log("Current round id", currentRound.id);
    await this.sendRoundInfo(ctx, currentRound.id);
  }

  async sendRoundInfo(ctx: Context, roundId: number) {
    const round = await this.gameRepository.findRoundById(roundId);
    if (!round) {
      await ctx.reply("Больше нет раундов в sendRoundInfo " + roundId);
      return;
    }

    const info = await this.formatRoundInfo(round);

    if (round.infoMessageId && round.chatId) {
      console.log("I found message info", round.infoMessageId, round.chatId);
      try {
        await ctx.telegram.editMessageText(
          round.chatId.toString(),
          round.infoMessageId,
          undefined,
          info,
          { parse_mode: "HTML" },
        );
      } catch (error) {
        console.error("Failed to edit message, sending new one:", error);
        await this.sendNewRoundInfo(ctx, round, info);
      }
    } else {
      console.log("Could not find message info, sending new one");
      await this.sendNewRoundInfo(ctx, round, info);
    }
  }

  private async sendNewRoundInfo(ctx: Context, round: GameRound, info: string) {
    const message = await ctx.reply(info, { parse_mode: "HTML" });

    // Update the round with the new message ID and chat ID
    await this.gameRepository.updateRoundMessageInfo(
      round.id,
      message.message_id,
      message.chat.id,
    );
  }

  private chunkButtons(buttons: InlineKeyboardButton[], size: number) {
    return Array.from({ length: Math.ceil(buttons.length / size) }, (_, i) =>
      buttons.slice(i * size, i * size + size),
    );
  }

  async nextRound(ctx: Context, onNoRound: () => Promise<void>) {
    const game = await this.gameRepository.getCurrentGame();
    if (!game) {
      await ctx.reply(getRandomResponse(this.botResponses.gameState.noGame));
      return;
    }

    await ctx.reply(getRandomResponse(this.botResponses.rounds.nextRound));
    await this.gameRepository.updateGameRound(game.id, game.currentRound + 1);
    await this.processRound(ctx, onNoRound);
  }

  async showHint(ctx: IBotContext) {
    const game = await this.gameRepository.getCurrentGame();
    const context = this.validateRound(game).andThen((context) =>
      this.validateHintShown(context.game, context.round),
    );

    await context.match(
      async ({ game, round }) => {
        await this.gameRepository.updateRoundHint(round.id, true);
        if (
          ctx.chat &&
          round.submission.mediaHintChatId &&
          round.submission.mediaHintMessageId
        ) {
          await ctx.telegram.copyMessage(
            ctx.chat.id,
            round.submission.mediaHintChatId,
            round.submission.mediaHintMessageId,
          );
          return;
        }
        await ctx.reply(
          getRandomResponse(
            this.botResponses.hints.hintLayout(round.submission.hint as string),
          ),
        );
      },
      async () => {
        await ctx.reply(
          getRandomResponse(this.botResponses.hints.hintAlreadyShown),
        );
      },
    );
  }

  private validateRound(
    game: GameWithData | null,
  ): Result<{ game: GameWithData; round: RoundWithGuesses }, string> {
    if (!game) {
      return Result.err(getRandomResponse(this.botResponses.gameState.noGame));
    }
    const roundId = game.currentRound;
    const round = game.rounds.find((r) => r.index === roundId);
    return round
      ? Result.ok({ game, round })
      : Result.err(getRandomResponse(this.botResponses.rounds.noSuchRound));
  }

  private validateHintShown(
    game: Game,
    round: RoundWithGuesses,
  ): Result<{ game: Game; round: RoundWithGuesses }, string> {
    if (round.hintShown) {
      return Result.err(
        getRandomResponse(this.botResponses.hints.hintAlreadyShown),
      );
    }
    return Result.ok({ game, round });
  }

  private async formatRoundInfo(round: RoundWithGuesses) {
    const notYetGuessed = await this.gameRepository.getUsersNotGuessed(
      round.id,
    );
    const thinkingPhrases = [
      "Всё ещё в раздумьях",
      "Мучаются с ответом",
      "Погружены в глубокие размышления",
      "Изображают мыслительный процесс",
    ];

    const correctPhrases = [
      "Счастливчики угадавшие",
      "Знатоки (или везунчики?)",
      "Каким-то чудом угадали",
    ];

    const wrongPhrases = [
      "Промахнулись мимо кассы",
      "Не угадали (как неожиданно!)",
      "Попытались, но увы",
    ];

    return `
        🎯 Раунд ${round.index + 1} - продолжаем веселиться!
        ${round.hintShown ? "💡 Подсказка была показана (для особо одарённых)" : ""}
        
        ${getRandomResponse(thinkingPhrases)}: ${notYetGuessed.map((u) => u.name).join(", ")}
        
        ${getRandomResponse(correctPhrases)}: ${
          round.guesses
            .filter((g) => g.isCorrect)
            .map(
              (g) =>
                `${g.user.name} (${g.points} ${this.getPointsWord(g.points)})`,
            )
            .join(", ") || "Пока никто! Неужели так сложно?"
        }
        
        ${getRandomResponse(wrongPhrases)}: ${
          round.guesses
            .filter((g) => !g.isCorrect)
            .map((g) => g.user.name)
            .join(", ") || "Пока никто не ошибся. Но это ненадолго!"
        }
      `;
  }

  private getPointsWord(points: number): string {
    if (points === 1) return "очко";
    if (points >= 2 && points <= 4) return "очка";
    return "очков";
  }
}
