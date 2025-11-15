import { inject, injectable } from 'inversify';
import { TYPES } from '@/types';
import { MusicGameRepository, RoundWithGuesses } from '@/modules/musicGame/music-game.repository';
import { SchedulerService } from '@/modules/musicGame/scheduler/scheduler.service';
import { TextService } from '@/modules/common/text.service';
import { ActionCodec } from '@/modules/musicGame/action.codec';
import { Context } from 'telegraf';
import { User } from '@prisma/client';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';

@injectable()
export class RoundOrchestratorService {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: MusicGameRepository,
    @inject(TYPES.SchedulerService) private scheduler: SchedulerService,
    @inject(TYPES.TextService) private text: TextService,
    @inject(TYPES.ActionCodec) private codec: ActionCodec,
  ) {}

  async startRound(ctx: Context, chatId: number): Promise<void> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) {
      await ctx.reply(this.text.get('musicGame.noGame'));
      return;
    }

    const gameSequence = await this.gameRepository.getRoundBySequence(game.id, game.currentRound);
    if (!gameSequence) {
      await ctx.reply(this.text.get('rounds.noMoreRounds'));
      return;
    }

    const participants = await this.gameRepository.getParticipants(game.id);
    await this.playRound(ctx, participants, gameSequence);

    try {
      const config = (game as { config?: unknown }).config as
        | {
            hintDelaySec?: number;
            advanceDelaySec?: number;
            autoAdvance?: boolean;
          }
        | null
        | undefined;

      if (config?.hintDelaySec && ctx.chat) {
        const hintKey = `hint:${gameSequence.id}`;
        this.scheduler.scheduleOnce(
          hintKey,
          new Date(Date.now() + config.hintDelaySec * 1000),
          async () => {
            await this.showHint(ctx, chatId);
          },
        );
      }

      if (config?.autoAdvance && config?.advanceDelaySec && ctx.chat) {
        const advanceKey = `advance:${gameSequence.id}`;
        this.scheduler.scheduleOnce(
          advanceKey,
          new Date(Date.now() + config.advanceDelaySec * 1000),
          async () => {
            await this.advanceToNextRound(ctx, game.id);
          },
        );
      }
    } catch (error) {
      console.error('Failed to schedule round events:', error);
    }
  }

  async playRound(
    ctx: Context,
    participants: User[],
    currentRound: RoundWithGuesses,
  ): Promise<void> {
    // Ensure roundId and userId are valid numbers before encoding
    const roundId = typeof currentRound.id === 'bigint' ? Number(currentRound.id) : currentRound.id;
    if (!roundId || isNaN(roundId)) {
      console.error('Invalid roundId in playRound:', currentRound.id);
      throw new Error('Invalid roundId');
    }
    const buttons = participants.map((user) => {
      const userId = typeof user.id === 'bigint' ? Number(user.id) : user.id;
      if (!userId || isNaN(userId)) {
        console.error('Invalid userId in playRound:', user.id);
        throw new Error('Invalid userId');
      }
      return {
        text: user.name,
        callback_data: this.codec.encode('guess', roundId, userId),
      };
    });

    await ctx.replyWithAudio(currentRound.musicFileId, {
      caption: this.text.get('rounds.playRound'),
      reply_markup: { inline_keyboard: this.chunkButtons(buttons, 3) },
    });
  }

  async showHint(ctx: Context, chatId: number): Promise<void> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) {
      await ctx.reply(this.text.get('musicGame.noGame'));
      return;
    }
    const round = game.rounds.find((r) => r.roundIndex === game.currentRound);
    if (!round) {
      await ctx.reply(this.text.get('rounds.noCurrentRound'));
      return;
    }
    if (round.hintShownAt) {
      await ctx.reply(this.text.get('hints.hintAlreadyShown'));
      return;
    }
    await this.gameRepository.showHint(round.id);

    if (ctx.chat && round.hintChatId && round.hintMessageId) {
      try {
        await ctx.telegram.copyMessage(
          ctx.chat.id,
          Number(round.hintChatId),
          Number(round.hintMessageId),
        );
      } catch (error) {
        console.error('Failed to copy hint message:', error);
        await ctx.reply(this.text.get('hints.hintLayout'));
      }
      return;
    }
    await ctx.reply(this.text.get('hints.hintLayout'));
  }

  async advanceToNextRound(ctx: Context, gameId: number): Promise<void> {
    const game = await this.gameRepository.getGameById(gameId);
    if (!game) return;
    await ctx.reply(this.text.get('rounds.nextRound'));
    await this.gameRepository.updateGameRound(gameId, game.currentRound + 1);
    await this.startRound(ctx, Number(game.chatId));
  }

  private chunkButtons(buttons: InlineKeyboardButton[], size: number) {
    return Array.from({ length: Math.ceil(buttons.length / size) }, (_, i) =>
      buttons.slice(i * size, i * size + size),
    );
  }
}
