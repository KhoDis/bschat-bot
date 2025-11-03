import { Composer } from 'telegraf';
import { IBotContext } from '@/context/context.interface';
import { inject, injectable } from 'inversify';
import { CallbackQueryContext, TYPES } from '@/types';
import { ActionHelper } from '@/modules/common/action.helper';
import { callbackQuery } from 'telegraf/filters';
import { LobbyHandler } from './features/lobby';
import { GameplayHandler } from './features/gameplay';
import { InfoHandler } from './features/info';

/**
 * MusicGameModule - Unified entry point for music game features
 *
 * This module wires together three focused feature handlers:
 * - Lobby: Pre-game setup and configuration
 * - Gameplay: Active game round interactions
 * - Info: Game information and statistics
 *
 * Each feature is self-contained with its own handler and UI logic.
 */
@injectable()
export class MusicGameModule extends Composer<IBotContext> {
  private actions = new ActionHelper<CallbackQueryContext>();

  constructor(
    @inject(TYPES.LobbyHandler) private lobbyHandler: LobbyHandler,
    @inject(TYPES.GameplayHandler) private gameplayHandler: GameplayHandler,
    @inject(TYPES.InfoHandler) private infoHandler: InfoHandler,
  ) {
    super();

    this.registerCommands();
    this.registerActions();
    this.registerCallbackQueryHandler();
  }

  /**
   * Register all command handlers from features
   */
  private registerCommands(): void {
    // Lobby commands
    this.command('music_game', this.lobbyHandler.handleMusicGame.bind(this.lobbyHandler));
    this.command('music_lobby', this.lobbyHandler.handleMusicLobby.bind(this.lobbyHandler));

    // Gameplay commands
    this.command('music_start', this.gameplayHandler.handleMusicStart.bind(this.gameplayHandler));
    this.command('music_end', this.gameplayHandler.handleMusicEnd.bind(this.gameplayHandler));

    // Info commands
    this.command('music_info', this.infoHandler.handleMusicInfo.bind(this.infoHandler));
    this.command('music_list', this.infoHandler.handleMusicList.bind(this.infoHandler));
    this.command('music_players', this.infoHandler.handleMusicPlayers.bind(this.infoHandler));
    this.command('music_stats', this.infoHandler.handleMusicStats.bind(this.infoHandler));
    this.command('music_ping', this.infoHandler.handleMusicPing.bind(this.infoHandler));
  }

  /**
   * Register all action handlers from features
   */
  private registerActions(): void {
    this.lobbyHandler.registerActions(this.actions);
    this.gameplayHandler.registerActions(this.actions);
    // Info handler has no callback actions
  }

  /**
   * Register the unified callback query dispatcher
   */
  private registerCallbackQueryHandler(): void {
    this.on(callbackQuery('data'), async (ctx) => {
      const handled = await this.actions.dispatch(ctx);
      if (!handled) {
        await ctx.answerCbQuery('Unknown action');
      } else {
        await ctx.answerCbQuery();
      }
    });
  }
}
