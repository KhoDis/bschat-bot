import { inject, injectable } from 'inversify';
import { TYPES } from '@/types';
import { MusicGameRepository } from '@/modules/musicGame/music-game.repository';
import { MemberService } from '@/modules/common/member.service';
import { TextService } from '@/modules/common/text.service';
import { IBotContext } from '@/context/context.interface';
import { GameConfig } from '@/modules/musicGame/config/game-config';
import { GameStatus, RoundPhase } from '@prisma/client';
import prisma from '@/prisma/client';

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

      // Find or create LOBBY game
      let game = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
      if (!game || game.status !== GameStatus.LOBBY) {
        game = await this.gameRepository.createEmptyLobby(ctx.chat.id);
      }
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
      console.log('[GameLifecycle] start called for chatId:', ctx.chat.id);
      console.log('[GameLifecycle] ctx.chat:', {
        id: ctx.chat.id,
        type: ctx.chat.type,
        title: 'title' in ctx.chat ? ctx.chat.title : undefined,
      });
      const activeGame = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
      console.log('[GameLifecycle] activeGame from getCurrentGameByChatId:', {
        found: !!activeGame,
        id: activeGame?.id,
        status: activeGame?.status,
      });

      // If there's an ACTIVE game, return error
      if (activeGame && activeGame.status === GameStatus.ACTIVE) {
        console.log('[GameLifecycle] Game is already ACTIVE');
        return 'ALREADY_ACTIVE';
      }

      // Check if there are tracks first (even if no LOBBY game exists yet)
      const users = await this.memberService.getSubmissionUsers(ctx.chat.id);
      console.log('[GameLifecycle] Found submission users:', users.length);
      if (!users.length) {
        // If no tracks, check if LOBBY game exists
        console.log('[GameLifecycle] No tracks found. Checking for LOBBY game...', {
          hasActiveGame: !!activeGame,
          activeGameStatus: activeGame?.status,
        });
        if (!activeGame || activeGame.status !== GameStatus.LOBBY) {
          console.log('[GameLifecycle] Returning NO_LOBBY');
          return 'NO_LOBBY';
        }
        console.log('[GameLifecycle] Returning NO_TRACKS');
        return 'NO_TRACKS';
      }

      // If there are tracks, find the LOBBY game
      // First try getCurrentGameByChatId, but also search directly if needed
      let lobbyGame = activeGame;
      console.log('[GameLifecycle] Initial lobbyGame:', {
        found: !!lobbyGame,
        id: lobbyGame?.id,
        status: lobbyGame?.status,
      });

      if (!lobbyGame || lobbyGame.status !== GameStatus.LOBBY) {
        console.log('[GameLifecycle] Re-fetching game via getCurrentGameByChatId...');
        // Re-fetch to get LOBBY game
        lobbyGame = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
        console.log('[GameLifecycle] After re-fetch:', {
          found: !!lobbyGame,
          id: lobbyGame?.id,
          status: lobbyGame?.status,
        });

        // If still not found, search directly for LOBBY game with DRAFT rounds
        if (!lobbyGame || lobbyGame.status !== GameStatus.LOBBY) {
          console.log('[GameLifecycle] Searching directly for LOBBY game with DRAFT rounds...');
          const directLobbyGame = await prisma.game.findFirst({
            where: {
              chatId: BigInt(ctx.chat.id),
              status: GameStatus.LOBBY,
            },
            include: {
              rounds: {
                where: {
                  phase: RoundPhase.DRAFT,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          console.log('[GameLifecycle] Direct search result:', {
            found: !!directLobbyGame,
            id: directLobbyGame?.id,
            roundsCount: directLobbyGame?.rounds.length,
          });

          if (directLobbyGame && directLobbyGame.rounds.length > 0) {
            console.log(
              '[GameLifecycle] Found LOBBY game with DRAFT rounds, fetching full data...',
            );
            // Re-fetch with full game data
            lobbyGame = await this.gameRepository.getGameById(directLobbyGame.id);
          } else {
            console.log('[GameLifecycle] No LOBBY game found, creating new one...');
            // If still no LOBBY game but tracks exist, create one
            // This should not happen if tracks are uploaded via saveSubmission,
            // but handle it as a fallback
            lobbyGame = await this.gameRepository.createEmptyLobby(ctx.chat.id);
            console.log('[GameLifecycle] Created new LOBBY game:', lobbyGame.id);
          }
        }
      }

      // Start the lobby game
      if (!lobbyGame) {
        return 'ERROR';
      }
      const started = await this.gameRepository.startGameFromLobby(lobbyGame.id);
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

      // Otherwise, check if there are tracks and create lobby if needed
      const users = await this.memberService.getSubmissionUsers(ctx.chat.id);
      if (!users.length) return 'NO_TRACKS';

      // Find or create LOBBY game
      let lobby = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
      if (!lobby || lobby.status !== GameStatus.LOBBY) {
        lobby = await this.gameRepository.createEmptyLobby(ctx.chat.id);
      }

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
