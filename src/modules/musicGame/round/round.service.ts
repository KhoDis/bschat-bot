import { Context } from "telegraf";
import { inject, injectable } from "inversify";
import { TYPES } from "@/types";
import {
  MusicGameRepository,
  RoundWithGuesses,
} from "@/modules/musicGame/music-game.repository";
import { TextService } from "@/modules/common/text.service";
import { GameService } from "@/modules/musicGame/game/game.service";
import { CallbackQueryContext, CommandContext } from "@/types";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { User } from "@prisma/client";
import * as tg from "telegraf/src/core/types/typegram";
import { LeaderboardService } from "@/modules/musicGame/leaderboard/leaderboard.service";
import { SchedulerService } from "@/modules/musicGame/scheduler/scheduler.service";

/**
 * RoundService - Core round logic
 *
 * Responsibilities:
 * - Managing round progression
 * - Presenting music tracks
 * - Handling hints
 * - Displaying round information
 */
@injectable()
export class RoundService {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: MusicGameRepository,
    @inject(TYPES.TextService) private text: TextService,
    @inject(TYPES.LeaderboardService)
    private leaderboardService: LeaderboardService,
    @inject(TYPES.GameService) private gameService: GameService,
    @inject(TYPES.SchedulerService) private scheduler: SchedulerService,
  ) {}

  /**
   * Handles the end of a game
   */
  private async handleGameEnd(
    ctx: CommandContext | CallbackQueryContext,
    chatId: number,
  ): Promise<void> {
    await ctx.reply(this.text.get("rounds.noMoreRounds"));
    await this.leaderboardService.showLeaderboard(ctx, chatId);
    await this.gameService.endGame(ctx);
  }

  /**
   * Processes the current round, showing music and options
   */
  async processRound(
    ctx: CallbackQueryContext | CommandContext,
    chatId: number,
  ) {
    const game = await this.gameService.getCurrentGame(chatId);

    if (!game) {
      await ctx.reply(this.text.get("musicGame.noGame"));
      return;
    }

    const gameSequence = await this.gameRepository.getRoundBySequence(
      game.id,
      game.currentRound,
    );
    if (!gameSequence) {
      await this.handleGameEnd(ctx, chatId);
      return;
    }

    const participants = await this.gameRepository.getParticipants(game.id);
    await this.playRound(ctx, participants, gameSequence);

    // Schedule hint from config (in-memory)
    try {
      const config = (game as any).config as { hintDelaySec?: number } | null;
      if (config?.hintDelaySec && ctx.chat) {
        const key = `hint:${gameSequence.id}`;
        this.scheduler.scheduleOnce(
          key,
          new Date(Date.now() + config.hintDelaySec * 1000),
          async () => {
            await this.showHint(ctx as any, Number(game.chatId));
          },
        );
      }
    } catch (error) {
      console.error("Failed to schedule round events:", error);
    }
  }

  /**
   * Shows the music track and guess options for a round
   */
  private async playRound(
    ctx: Context,
    participants: User[],
    currentRound: RoundWithGuesses,
  ) {
    const buttons = participants.map((user) => ({
      text: user.name,
      // Using round ID for unique identification
      callback_data: `guess:${currentRound.id}_${user.id}`,
    }));

    console.log("currentRound", currentRound);
    await ctx.replyWithAudio(currentRound.musicFileId, {
      caption: this.text.get("rounds.playRound"),
      reply_markup: { inline_keyboard: this.chunkButtons(buttons, 3) },
    });

    await this.sendRoundInfo(ctx, currentRound.id);
  }

  /**
   * Sends or updates the round information message
   */
  async sendRoundInfo(ctx: Context, roundId: number) {
    const round = await this.gameRepository.findRoundById(roundId);
    if (!round) {
      await ctx.reply("Раунд не найден: " + roundId);
      return;
    }

    const info = await this.formatRoundInfo(round);

    if (round.infoMessageId) {
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

  /**
   * Sends a new round info message
   */
  private async sendNewRoundInfo(
    ctx: Context,
    round: RoundWithGuesses,
    info: string,
  ) {
    const message = await ctx.reply(info, { parse_mode: "HTML" });
    await this.gameRepository.updateRoundMessageInfo(
      round.id,
      message.message_id,
    );
  }

  /**
   * Arranges button layout into rows
   */
  private chunkButtons(buttons: InlineKeyboardButton[], size: number) {
    return Array.from({ length: Math.ceil(buttons.length / size) }, (_, i) =>
      buttons.slice(i * size, i * size + size),
    );
  }

  /**
   * Advances to the next round
   */
  async nextRound(ctx: CommandContext) {
    const game = await this.gameService.getCurrentGame(ctx.chat.id);

    if (!game) {
      await ctx.reply(this.text.get("musicGame.noGame"));
      return;
    }

    await ctx.reply(this.text.get("rounds.nextRound"));
    await this.gameRepository.updateGameRound(game.id, game.currentRound + 1);
    await this.processRound(ctx, ctx.chat.id);
  }

  /**
   * Plays the current round's music track again
   */
  async playCurrentRound(ctx: Context, chatId: number) {
    const game = await this.gameService.getCurrentGame(chatId);
    if (!game) {
      await ctx.reply(this.text.get("musicGame.noGame"));
      return;
    }

    const gameSequence = await this.gameRepository.getRoundBySequence(
      game.id,
      game.currentRound,
    );
    if (!gameSequence) {
      await ctx.reply(this.text.get("rounds.noRound"));
      return;
    }

    const participants = await this.gameRepository.getParticipants(game.id);
    await this.playRound(ctx, participants, gameSequence);
  }

  /**
   * Shows a hint for the current round
   */
  async showHint(ctx: Context, chatId: number) {
    const game = await this.gameService.getCurrentGame(chatId);
    if (!game) {
      await ctx.reply(this.text.get("musicGame.noGame"));
      return;
    }

    const round = game.rounds.find((r) => r.roundIndex === game.currentRound);
    if (!round) {
      await ctx.reply(this.text.get("rounds.noCurrentRound"));
      return;
    }

    if (round.hintShownAt) {
      await ctx.reply(this.text.get("hints.hintAlreadyShown"));
      return;
    }

    await this.gameRepository.showHint(round.id);

    if (ctx.chat && round.hintChatId && round.hintMessageId) {
      try {
        const threadId = this.getThreadId(ctx);
        await ctx.telegram.copyMessage(
          ctx.chat.id,
          Number(round.hintChatId),
          Number(round.hintMessageId),
          threadId ? { message_thread_id: threadId } : {},
        );
      } catch (error) {
        console.error("Failed to copy hint message:", error);
        await ctx.reply(this.text.get("hints.hintLayout"));
      }
      return;
    }

    await ctx.reply(this.text.get("hints.hintLayout"));
  }

  /**
   * Formats the round information message
   */
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

  /**
   * Returns the correct grammatical form for points
   */
  private getPointsWord(points: number): string {
    if (points === 1) return "очко";
    if (points >= 2 && points <= 4) return "очка";
    return "очков";
  }

  private getThreadId<U extends tg.Update>(ctx: Context<U>) {
    const msg = ctx.msg;
    return msg?.isAccessible()
      ? msg.is_topic_message
        ? msg.message_thread_id
        : undefined
      : undefined;
  }
}
