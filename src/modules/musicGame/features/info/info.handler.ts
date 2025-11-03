import { inject, injectable } from 'inversify';
import { CommandContext, TYPES } from '@/types';
import { MusicGameService } from '../../music-game.service';

/**
 * Info Handler - Game information and statistics
 * 
 * Handles:
 * - /music_info - Show current game info
 * - /music_list - List all games
 * - /music_players - List all players
 * - /music_stats - Show game statistics
 * - /music_ping - Ping all players
 */
@injectable()
export class InfoHandler {
  constructor(
    @inject(TYPES.MusicGameService) private musicGameService: MusicGameService,
  ) {}

  /**
   * /music_info - Show information about the current game
   */
  async handleMusicInfo(ctx: CommandContext): Promise<void> {
    await this.musicGameService.showActiveGameInfo(ctx);
  }

  /**
   * /music_list - List all games for this chat
   */
  async handleMusicList(ctx: CommandContext): Promise<void> {
    await this.musicGameService.listGames(ctx);
  }

  /**
   * /music_players - List all players
   */
  async handleMusicPlayers(ctx: CommandContext): Promise<void> {
    await this.musicGameService.listPlayers(ctx);
  }

  /**
   * /music_stats - Show game statistics
   */
  async handleMusicStats(ctx: CommandContext): Promise<void> {
    await this.musicGameService.getGameStats(ctx);
  }

  /**
   * /music_ping - Ping all players
   */
  async handleMusicPing(ctx: CommandContext): Promise<void> {
    await this.musicGameService.pingPlayers(ctx);
  }
}

