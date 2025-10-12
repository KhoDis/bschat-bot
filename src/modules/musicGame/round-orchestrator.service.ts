import { inject, injectable } from 'inversify';
import { TYPES } from '@/types';
import { MusicGameRepository } from '@/modules/musicGame/music-game.repository';
import { SchedulerService } from '@/modules/musicGame/scheduler/scheduler.service';
import { TextService } from '@/modules/common/text.service';
import { UiRenderer } from '@/modules/musicGame/ui.renderer';
import { Context } from 'telegraf';
import { User } from '@prisma/client';

@injectable()
export class RoundOrchestratorService {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: MusicGameRepository,
    @inject(TYPES.SchedulerService) private scheduler: SchedulerService,
    @inject(TYPES.TextService) private text: TextService,
    @inject(TYPES.UiRenderer) private ui: UiRenderer,
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
      const config = (game as any).config as {
        hintDelaySec?: number;
        advanceDelaySec?: number;
        autoAdvance?: boolean;
      } | null;

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

  async playRound(ctx: Context, participants: User[], currentRound: any): Promise<void> {
    const buttons = participants.map((user) => ({
      text: user.name,
      callback_data: `guess:${currentRound.id}_${user.id}`,
    }));

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

  private chunkButtons(buttons: any[], size: number) {
    return Array.from({ length: Math.ceil(buttons.length / size) }, (_, i) =>
      buttons.slice(i * size, i * size + size),
    );
  }
}
