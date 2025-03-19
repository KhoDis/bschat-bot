import { Context } from "telegraf";
import {
  GameRepository,
  GameWithData,
  RoundWithGuesses,
} from "../repositories/GameRepository";
import { IBotContext } from "@/context/context.interface";
import { Result } from "@/utils/Result";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { Game, GameRound, User } from "@prisma/client";
import * as tg from "telegraf/src/core/types/typegram";
import { TextService } from "@/bot/services/TextService";
import { inject, injectable } from "inversify";
import { TYPES } from "@/types";

@injectable()
export class RoundService {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: GameRepository,
    @inject(TYPES.TextService) private text: TextService,
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
        const participants = await this.gameRepository.getParticipants(game.id);
        await this.playRound(ctx, participants, currentRound);
      },
      async () => {
        this.text.get("gameState.noGame");
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

    await ctx.replyWithAudio(currentRound.submission.fileId, {
      caption: this.text.get("rounds.playRound"),
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

  async nextRound(
    ctx: Context,
    onNoRound: () => Promise<void>,
    gameId?: number,
  ) {
    const game = gameId
      ? await this.gameRepository.getGameById(gameId)
      : await this.gameRepository.getCurrentGame();
    if (!game) {
      await ctx.reply(this.text.get("gameState.noGame"));
      return;
    }

    await ctx.reply(this.text.get("rounds.nextRound"));
    await this.gameRepository.updateGameRound(game.id, game.currentRound + 1);
    await this.processRound(ctx, onNoRound);
  }

  private getThreadId<U extends tg.Update>(ctx: Context<U>) {
    const msg = ctx.msg;
    return msg?.isAccessible()
      ? msg.is_topic_message
        ? msg.message_thread_id
        : undefined
      : undefined;
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
          const threadId = this.getThreadId(ctx);
          await ctx.telegram.copyMessage(
            ctx.chat.id,
            Number(round.submission.mediaHintChatId),
            Number(round.submission.mediaHintMessageId),
            threadId ? { message_thread_id: threadId } : {},
          );
          return;
        }
        await ctx.reply(this.text.get("hints.hintLayout"));
      },
      async () => {
        await ctx.reply(this.text.get("hints.hintAlreadyShown"));
      },
    );
  }

  private validateRound(
    game: GameWithData | null,
  ): Result<{ game: GameWithData; round: RoundWithGuesses }, string> {
    if (!game) {
      return Result.err(this.text.get("gameState.noGame"));
    }
    const roundId = game.currentRound;
    const round = game.rounds.find((r) => r.index === roundId);
    return round
      ? Result.ok({ game, round })
      : Result.err(this.text.get("rounds.noSuchRound"));
  }

  private validateHintShown(
    game: Game,
    round: RoundWithGuesses,
  ): Result<{ game: Game; round: RoundWithGuesses }, string> {
    if (round.hintShown) {
      return Result.err(this.text.get("hints.hintAlreadyShown"));
    }
    return Result.ok({ game, round });
  }

  private async formatRoundInfo(round: RoundWithGuesses) {
    const notYetGuessed = await this.gameRepository.getUsersNotGuessed(
      round.id,
    );

    return `
        🎯 Раунд ${round.index + 1} - продолжаем веселиться!
        ${round.hintShown ? "💡 Подсказка была показана (для особо одарённых)" : ""}
        
        ${this.text.get("roundInfo.thinking")}: ${notYetGuessed.map((u) => u.name).join(", ")}
        
        ${this.text.get("roundInfo.correct")}: ${
          round.guesses
            .filter((g) => g.isCorrect)
            .map(
              (g) =>
                `${g.user.name} (${g.points} ${this.getPointsWord(g.points)})`,
            )
            .join(", ") || "Пока никто! Неужели так сложно?"
        }
        
        ${this.text.get("roundInfo.wrong")}: ${
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
