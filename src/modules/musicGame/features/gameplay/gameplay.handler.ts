import { inject, injectable } from 'inversify';
import { CommandContext, CallbackQueryContext, TYPES } from '@/types';
import { MusicGameService } from '../../music-game.service';
import { ActionHelper } from '@/modules/common/action.helper';
import { RequirePermission } from '@/modules/permissions/require-permission.decorator';
import { IBotContext } from '@/context/context.interface';

/**
 * Gameplay Handler - Active game round interactions
 *
 * Handles:
 * - /music_start - Start the game
 * - /music_end - End the game
 * - Guess actions
 * - Round controls (hint, replay, skip, reveal)
 */
@injectable()
export class GameplayHandler {
  constructor(@inject(TYPES.MusicGameService) private musicGameService: MusicGameService) {}

  /**
   * Register all gameplay-related actions
   */
  registerActions(actions: ActionHelper<CallbackQueryContext>): void {
    actions.handle('game_start', async (ctx) => {
      await this.musicGameService.startGame(ctx);
    });

    actions.handle('guess', async (ctx, roundId, guessedUserId) => {
      // Check if parameters are provided and valid
      if (!roundId || !guessedUserId || roundId === '' || guessedUserId === '') {
        console.error('Invalid guess parameters:', {
          roundId,
          guessedUserId,
          callbackData: ctx.callbackQuery?.data,
        });
        await ctx.answerCbQuery('Ошибка: неверные параметры догадки');
        return;
      }
      const parsedRoundId = parseInt(roundId, 10);
      const parsedGuessedUserId = parseInt(guessedUserId, 10);
      if (isNaN(parsedRoundId) || isNaN(parsedGuessedUserId)) {
        console.error('Failed to parse guess parameters:', {
          roundId,
          guessedUserId,
          parsedRoundId,
          parsedGuessedUserId,
          callbackData: ctx.callbackQuery?.data,
        });
        await ctx.answerCbQuery('Ошибка: неверные параметры догадки');
        return;
      }
      await this.musicGameService.processGuess(ctx, parsedRoundId, parsedGuessedUserId);
    });

    actions.handle('round_hint', async (ctx, roundId) => {
      if (ctx.chat) {
        await this.musicGameService.showHint(ctx, ctx.chat.id);
      }
    });

    actions.handle('round_replay', async (ctx, roundId) => {
      if (ctx.chat) {
        await this.musicGameService.replayCurrentRound(ctx, ctx.chat.id);
      }
    });

    actions.handle('round_skip', async (ctx, roundId) => {
      if (ctx.chat) {
        await this.musicGameService.skipCurrentRound(ctx, ctx.chat.id);
      }
    });

    actions.handle('round_reveal', async (ctx, roundId) => {
      if (ctx.chat) {
        await this.musicGameService.revealCurrentRound(ctx, ctx.chat.id);
      }
    });
  }

  /**
   * /music_start - Start a new game
   */
  @RequirePermission('MANAGE_MUSIC_GAME')
  async handleMusicStart(ctx: CommandContext): Promise<void> {
    await this.musicGameService.startGame(ctx);
  }

  /**
   * /music_end - End the current game
   */
  @RequirePermission('MANAGE_MUSIC_GAME')
  async handleMusicEnd(ctx: CommandContext): Promise<void> {
    await this.musicGameService.endGame(ctx);
  }
}
