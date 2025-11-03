import { inject, injectable } from 'inversify';
import { TYPES } from '@/types';
import { MusicGameRepository } from '@/modules/musicGame/music-game.repository';
import { MemberService } from '@/modules/common/member.service';
import { TextService } from '@/modules/common/text.service';
import { IBotContext } from '@/context/context.interface';
import { GameConfig } from '@/modules/musicGame/config/game-config';
import { GameStatus } from '@prisma/client';

@injectable()
export class GameLifecycleService {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: MusicGameRepository,
    @inject(TYPES.MemberService) private memberService: MemberService,
    @inject(TYPES.TextService) private text: TextService,
  ) {}

  /**
   * Creates a lobby with DRAFT rounds from submissions.
   * Game stays in LOBBY state until explicitly started.
   */
  async createLobby(
    ctx: IBotContext,
  ): Promise<'ALREADY_ACTIVE' | 'NO_TRACKS' | { gameId: number; chatId: number } | 'ERROR'> {
    if (!ctx.chat) return 'ERROR';
    try {
      const activeGame = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
      if (activeGame) return 'ALREADY_ACTIVE';

      const users = await this.memberService.getSubmissionUsers(ctx.chat.id);
      if (!users.length) return 'NO_TRACKS';

      const game = await this.gameRepository.createLobbyFromSubmissions(ctx.chat.id);
      return { gameId: game.id, chatId: Number(game.chatId) };
    } catch (e) {
      console.error('Error creating lobby:', e);
      return 'ERROR';
    }
  }

  /**
   * Starts a game from LOBBY state.
   * Transitions DRAFT rounds to LIVE and sets game to ACTIVE.
   */
  async start(
    ctx: IBotContext,
  ): Promise<'ALREADY_ACTIVE' | 'NO_TRACKS' | 'NO_LOBBY' | { chatId: number } | 'ERROR'> {
    if (!ctx.chat) return 'ERROR';
    try {
      const activeGame = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
      
      // If there's an ACTIVE game, return error
      if (activeGame && activeGame.status === GameStatus.ACTIVE) {
        return 'ALREADY_ACTIVE';
      }

      // If there's no LOBBY game, return error
      if (!activeGame || activeGame.status !== GameStatus.LOBBY) {
        return 'NO_LOBBY';
      }

      // Check if lobby has tracks
      const users = await this.memberService.getSubmissionUsers(ctx.chat.id);
      if (!users.length) return 'NO_TRACKS';

      // Start the lobby game
      const started = await this.gameRepository.startGameFromLobby(activeGame.id);
      return { chatId: Number(started.chatId) };
    } catch (e) {
      console.error('Error starting game:', e);
      return 'ERROR';
    }
  }

  /**
   * Starts a game with config (creates lobby if needed, then starts with config)
   */
  async startWithConfig(
    ctx: IBotContext,
    config: GameConfig,
  ): Promise<'ALREADY_ACTIVE' | 'NO_TRACKS' | { chatId: number } | 'ERROR'> {
    if (!ctx.chat) return 'ERROR';
    try {
      const activeGame = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
      
      // If there's an ACTIVE game, return error
      if (activeGame && activeGame.status === GameStatus.ACTIVE) {
        return 'ALREADY_ACTIVE';
      }

      // If there's a LOBBY game, start it with config
      if (activeGame && activeGame.status === GameStatus.LOBBY) {
        const started = await this.gameRepository.startGameFromLobby(activeGame.id, config);
        return { chatId: Number(started.chatId) };
      }

      // Otherwise, create lobby and start with config
      const users = await this.memberService.getSubmissionUsers(ctx.chat.id);
      if (!users.length) return 'NO_TRACKS';

      const lobby = await this.gameRepository.createLobbyFromSubmissions(ctx.chat.id);
      const started = await this.gameRepository.startGameFromLobby(lobby.id, config);
      return { chatId: Number(started.chatId) };
    } catch (e) {
      console.error('Error starting game with config:', e);
      return 'ERROR';
    }
  }

  async end(ctx: IBotContext): Promise<'NO_ACTIVE' | 'ENDED'> {
    if (!ctx.chat) return 'NO_ACTIVE';
    const game = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
    if (!game) return 'NO_ACTIVE';
    await this.gameRepository.endGame(game.id);
    return 'ENDED';
  }
}
