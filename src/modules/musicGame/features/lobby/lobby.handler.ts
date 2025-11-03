import { inject, injectable } from 'inversify';
import { CommandContext, CallbackQueryContext, TYPES } from '@/types';
import { MusicGameService } from '../../music-game.service';
import { ActionHelper } from '@/modules/common/action.helper';
import { RequirePermission } from '@/modules/permissions/require-permission.decorator';
import { LobbyUi } from './lobby.ui';
import { IBotContext } from '@/context/context.interface';

/**
 * Lobby Handler - Pre-game setup and configuration
 *
 * Handles:
 * - /music_game - Initial game setup
 * - /music_lobby - Show lobby interface
 * - Lobby button actions (start, settings, info, players)
 */
@injectable()
export class LobbyHandler {
  private actions = new ActionHelper<CallbackQueryContext>();

  constructor(
    @inject(TYPES.MusicGameService) private musicGameService: MusicGameService,
    @inject(TYPES.LobbyUi) private ui: LobbyUi,
  ) {}

  /**
   * Register all lobby-related actions
   */
  registerActions(actions: ActionHelper<CallbackQueryContext>): void {
    actions.handle('lobby', async (ctx, action) => {
      await this.handleLobbyAction(ctx, action);
    });
  }

  /**
   * /music_game - Initiate game setup
   */
  @RequirePermission('MANAGE_MUSIC_GAME')
  async handleMusicGame(ctx: CommandContext): Promise<void> {
    await this.musicGameService.initiateGameSetup(ctx);
  }

  /**
   * /music_lobby - Show lobby interface
   */
  @RequirePermission('MANAGE_MUSIC_GAME')
  async handleMusicLobby(ctx: CommandContext): Promise<void> {
    await this.renderLobby(ctx);
  }

  /**
   * Render the lobby interface
   */
  private async renderLobby(ctx: IBotContext): Promise<void> {
    if (!ctx.chat) return;

    const keyboard = this.ui.lobbyKeyboard({
      start: this.actions.encode('lobby', 'start'),
      settings: this.actions.encode('lobby', 'settings'),
      info: this.actions.encode('lobby', 'info'),
      players: this.actions.encode('lobby', 'players'),
    });

    await ctx.reply('🎵 Music Game Lobby\n\nChoose an option:', {
      reply_markup: keyboard,
    });
  }

  /**
   * Handle lobby button actions
   */
  private async handleLobbyAction(ctx: CallbackQueryContext, action: string): Promise<void> {
    switch (action) {
      case 'start':
        await this.musicGameService.startGame(ctx);
        break;
      case 'settings':
        await ctx.reply('⚙️ Settings panel - coming soon!');
        break;
      case 'info':
        await this.musicGameService.showActiveGameInfo(ctx);
        break;
      case 'players':
        await ctx.reply('👥 Player management - coming soon!');
        break;
      default:
        await ctx.reply('Unknown action');
    }
  }
}
