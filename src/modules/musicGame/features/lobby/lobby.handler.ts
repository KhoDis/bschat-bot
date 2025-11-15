import { inject, injectable } from 'inversify';
import { CommandContext, CallbackQueryContext, TYPES } from '@/types';
import { MusicGameService } from '../../music-game.service';
import { ActionHelper } from '@/modules/common/action.helper';
import { RequirePermission } from '@/modules/permissions/require-permission.decorator';
import { LobbyUi } from './lobby.ui';
import { IBotContext } from '@/context/context.interface';
import { GameConfig } from '../../config/game-config';

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
    actions.handle('settings', async (ctx, action, ...args) => {
      await this.handleSettingsAction(ctx, action, ...args);
    });
    actions.handle('players', async (ctx, action, ...args) => {
      await this.handlePlayersAction(ctx, action, ...args);
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
        await this.showSettings(ctx);
        break;
      case 'info':
        await this.musicGameService.showActiveGameInfo(ctx);
        break;
      case 'players':
        await this.showPlayers(ctx);
        break;
      case 'back':
        await this.renderLobby(ctx);
        break;
      default:
        await ctx.reply('Unknown action');
    }
  }

  /**
   * Show settings panel
   */
  private async showSettings(ctx: CallbackQueryContext): Promise<void> {
    if (!ctx.chat) return;

    let game = await this.musicGameService.getCurrentGame(ctx.chat.id);

    // If no game exists, create a LOBBY game with default config
    if (!game) {
      // Create lobby through lifecycle service
      const result = await this.musicGameService.createLobbyForSettings(ctx.chat.id);
      if (!result) {
        await ctx.answerCbQuery('Failed to create game. Upload tracks first.');
        return;
      }
      game = await this.musicGameService.getCurrentGame(ctx.chat.id);
      if (!game) {
        await ctx.answerCbQuery('Failed to create game');
        return;
      }
    }

    const config = this.musicGameService.getGameConfig(game);
    const keyboard = this.ui.settingsKeyboard(config, {
      toggle: (key) => this.actions.encode('settings', 'toggle', key),
      setPreset: (preset) => this.actions.encode('settings', 'preset', preset),
      setDelay: (key, value) => this.actions.encode('settings', 'delay', key, value.toString()),
      back: this.actions.encode('lobby', 'back'),
    });

    // Try to edit message if it's a callback query, otherwise send new message
    if (ctx.callbackQuery?.message && 'text' in ctx.callbackQuery.message) {
      await ctx.editMessageText(this.ui.settingsText(config), {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(this.ui.settingsText(config), {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    }
  }

  /**
   * Handle settings actions
   */
  private async handleSettingsAction(
    ctx: CallbackQueryContext,
    action: string,
    ...args: string[]
  ): Promise<void> {
    if (!ctx.chat) return;

    const game = await this.musicGameService.getCurrentGame(ctx.chat.id);
    if (!game) {
      await ctx.answerCbQuery('No active game found');
      return;
    }

    const currentConfig = this.musicGameService.getGameConfig(game);
    let newConfig: GameConfig = { ...currentConfig };

    switch (action) {
      case 'toggle': {
        const key = args[0];
        if (key === 'autoAdvance') {
          newConfig.autoAdvance = !newConfig.autoAdvance;
        } else if (key === 'shuffle') {
          newConfig.shuffle = !newConfig.shuffle;
        } else if (key === 'allowSelfGuess') {
          newConfig.allowSelfGuess = !newConfig.allowSelfGuess;
        }
        break;
      }
      case 'preset': {
        const preset = args[0];
        if (preset === 'classic' || preset === 'aggressive' || preset === 'gentle') {
          newConfig.scoringPreset = preset;
        }
        break;
      }
      case 'delay': {
        const key = args[0];
        const valueStr = args[1];
        if (!key || !valueStr) {
          await ctx.answerCbQuery('Invalid delay parameters');
          return;
        }
        const value = parseInt(valueStr, 10);
        if (isNaN(value)) {
          await ctx.answerCbQuery('Invalid delay value');
          return;
        }
        if (key === 'hintDelaySec') {
          newConfig.hintDelaySec = value;
        } else if (key === 'advanceDelaySec') {
          newConfig.advanceDelaySec = value;
        }
        break;
      }
      default:
        await ctx.answerCbQuery('Unknown settings action');
        return;
    }

    await this.musicGameService.updateGameConfig(ctx.chat.id, newConfig);
    await this.showSettings(ctx);
    await ctx.answerCbQuery('Settings updated');
  }

  /**
   * Show players panel
   */
  private async showPlayers(ctx: CallbackQueryContext): Promise<void> {
    if (!ctx.chat) return;

    const players = await this.musicGameService.getSubmissionPlayers(ctx.chat.id);

    if (players.length === 0) {
      const keyboard = this.ui.playersKeyboard([], {
        remove: () => '',
        ping: this.actions.encode('players', 'ping'),
        back: this.actions.encode('lobby', 'back'),
      });

      if (ctx.callbackQuery?.message && 'text' in ctx.callbackQuery.message) {
        await ctx.editMessageText(this.ui.playersText([]), {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
      } else {
        await ctx.reply(this.ui.playersText([]), {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
      }
      return;
    }

    const keyboard = this.ui.playersKeyboard(players, {
      remove: (userId) => this.actions.encode('players', 'remove', userId),
      ping: this.actions.encode('players', 'ping'),
      back: this.actions.encode('lobby', 'back'),
    });

    if (ctx.callbackQuery?.message && 'text' in ctx.callbackQuery.message) {
      await ctx.editMessageText(this.ui.playersText(players), {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(this.ui.playersText(players), {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    }
  }

  /**
   * Handle players actions
   */
  private async handlePlayersAction(
    ctx: CallbackQueryContext,
    action: string,
    ...args: string[]
  ): Promise<void> {
    if (!ctx.chat) return;

    switch (action) {
      case 'remove': {
        const userIdStr = args[0];
        if (!userIdStr) {
          await ctx.answerCbQuery('Invalid player ID');
          return;
        }
        const userId = parseInt(userIdStr, 10);
        if (isNaN(userId)) {
          await ctx.answerCbQuery('Invalid player ID');
          return;
        }

        const result = await this.musicGameService.removePlayerTrack(ctx.chat.id, userId);
        if (result === 'NO_GAME') {
          await ctx.answerCbQuery('No game found');
          return;
        }
        if (result === 'NO_TRACK') {
          await ctx.answerCbQuery('Player has no track to remove');
          return;
        }

        await this.showPlayers(ctx);
        await ctx.answerCbQuery('Player track removed');
        break;
      }
      case 'ping': {
        await this.musicGameService.pingPlayers(ctx);
        await ctx.answerCbQuery('Players pinged');
        break;
      }
      default:
        await ctx.answerCbQuery('Unknown players action');
    }
  }
}
