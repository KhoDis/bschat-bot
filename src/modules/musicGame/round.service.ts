import { Context } from "telegraf";
import {
  GameRepository,
  GameWithData,
  RoundWithGuesses,
} from "@/bot/repositories/GameRepository";
import { IBotContext } from "@/context/context.interface";
import { Result } from "@/utils/Result";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { Game, GameRound, User } from "@prisma/client";
import * as tg from "telegraf/src/core/types/typegram";
import { TextService } from "@/modules/common/text.service";
import { inject, injectable } from "inversify";
import { CallbackQueryContext, CommandContext, TYPES } from "@/types";
import { LeaderboardService } from "@/modules/musicGame/leaderboard.service";

@injectable()
export class RoundService {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: GameRepository,
    @inject(TYPES.TextService) private text: TextService,
    @inject(TYPES.LeaderboardService)
    private leaderboardService: LeaderboardService,
  ) {}

  private async showLeaderboard(ctx: Context, chatId: number) {
    const leaderboard =
      await this.leaderboardService.generateLeaderboard(chatId);
    if (!leaderboard) {
      await ctx.reply("Произошла ошибка при генерации лидерборда");
      return;
    }
    await ctx.reply(leaderboard);
  }

  private async handleGameEnd(
    ctx: CommandContext | CallbackQueryContext,
    chatId: number,
  ): Promise<void> {
    await ctx.reply(this.text.get("rounds.noMoreRounds"));
    await this.showLeaderboard(ctx, chatId);
  }

  async processRound(
    ctx: CallbackQueryContext | CommandContext,
    chatId: number,
  ) {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    const context = this.validateRound(game);

    await context.match(
      async ({ game, round }) => {
        const currentRound = await this.gameRepository.getCurrentRound(chatId);
        if (!currentRound) {
          await this.handleGameEnd(ctx, chatId);
          return;
        }
        const participants = await this.gameRepository.getParticipants(game.id);
        await this.playRound(ctx, participants, currentRound);
      },
      async (e: string) => {
        await ctx.reply(this.text.get("musicGame.noGame", { error: e }));
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

    await ctx.replyWithAudio(currentRound.musicFileId, {
      caption: this.text.get("rounds.playRound"),
      reply_markup: { inline_keyboard: this.chunkButtons(buttons, 3) },
    });

    await this.sendRoundInfo(ctx, currentRound.id);
  }

  async sendRoundInfo(ctx: Context, roundId: number) {
    const round = await this.gameRepository.findRoundById(roundId);
    if (!round) {
      await ctx.reply("Больше нет раундов в sendRoundInfo " + roundId);
      return;
    }

    const info = await this.formatRoundInfo(round);

    if (round.infoMessageId && round) {
      try {
        await ctx.telegram.editMessageText(
          round.game.chatId.toString(),
          Number(round.infoMessageId),
          undefined,
          info,
          { parse_mode: "HTML" },
        );
      } catch (error) {
        console.error("Failed to edit message, sending new one:", error);
        await this.sendNewRoundInfo(ctx, round, info);
      }
    } else {
      await this.sendNewRoundInfo(ctx, round, info);
    }
  }

  private async sendNewRoundInfo(ctx: Context, round: GameRound, info: string) {
    const message = await ctx.reply(info, { parse_mode: "HTML" });

    // Update the round with the new message ID and chat ID
    await this.gameRepository.updateRoundMessageInfo(
      round.id,
      message.message_id,
    );
  }

  private chunkButtons(buttons: InlineKeyboardButton[], size: number) {
    return Array.from({ length: Math.ceil(buttons.length / size) }, (_, i) =>
      buttons.slice(i * size, i * size + size),
    );
  }

  async nextRound(ctx: CommandContext, gameId?: number) {
    const game = gameId
      ? await this.gameRepository.getGameById(gameId)
      : await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
    if (!game) {
      await ctx.reply(this.text.get("musicGame.noGame"));
      return;
    }

    await ctx.reply(this.text.get("rounds.nextRound"));
    await this.gameRepository.updateGameRound(game.id, game.currentRound + 1);
    await this.processRound(ctx, ctx.chat.id);
  }

  private getThreadId<U extends tg.Update>(ctx: Context<U>) {
    const msg = ctx.msg;
    return msg?.isAccessible()
      ? msg.is_topic_message
        ? msg.message_thread_id
        : undefined
      : undefined;
  }

  async showHint(ctx: IBotContext, chatId: number) {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    const context = this.validateRound(game).andThen((context) =>
      this.validateHintShown(context.game, context.round),
    );

    await context.match(
      async ({ game, round }) => {
        await this.gameRepository.showHint(round.id);
        if (ctx.chat && round.hintChatId && round.hintMessageId) {
          const threadId = this.getThreadId(ctx);
          await ctx.telegram.copyMessage(
            ctx.chat.id,
            Number(round.hintChatId),
            Number(round.hintMessageId),
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
      return Result.err(this.text.get("musicGame.noGame"));
    }
    const roundId = game.currentRound;
    const round = game.rounds.find((r) => r.roundIndex === roundId);
    return round
      ? Result.ok({ game, round })
      : Result.err(this.text.get("rounds.noSuchRound"));
  }

  private validateHintShown(
    game: Game,
    round: RoundWithGuesses,
  ): Result<{ game: Game; round: RoundWithGuesses }, string> {
    if (round.hintShownAt) {
      return Result.err(this.text.get("hints.hintAlreadyShown"));
    }
    return Result.ok({ game, round });
  }

  private async formatRoundInfo(round: RoundWithGuesses) {
    const notYetGuessed = await this.gameRepository.getUsersNotGuessed(
      round.id,
    );

    return `
        🎯 Раунд ${round.roundIndex + 1} - продолжаем веселиться!
        ${round.hintShownAt ? "💡 Подсказка была показана (для особо одарённых)" : ""}
        
        ${this.text.get("rounds.roundInfo.thinking")}: ${notYetGuessed.map((u) => u.name).join(", ")}
        
        ${this.text.get("rounds.roundInfo.correct")}: ${
          round.guesses
            .filter((g) => g.guessedId === round.userId)
            .map(
              (g) =>
                `${g.user.name} (${g.points} ${this.getPointsWord(g.points)})`,
            )
            .join(", ") || "Пока никто! Неужели так сложно?"
        }
        
        ${this.text.get("rounds.roundInfo.wrong")}: ${
          round.guesses
            .filter((g) => g.guessedId !== round.userId)
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
