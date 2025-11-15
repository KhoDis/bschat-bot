import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameLifecycleService } from './game-lifecycle.service';
import { GameStatus } from '@prisma/client';

// Mock dependencies
const mockGameRepository = {
  getCurrentGameByChatId: vi.fn(),
  startGameFromLobby: vi.fn(),
  createEmptyLobby: vi.fn(),
};

const mockMemberService = {
  getSubmissionUsers: vi.fn(),
};

const mockTextService = {
  get: vi.fn((key: string) => key),
};

describe('GameLifecycleService', () => {
  let service: GameLifecycleService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GameLifecycleService(
      mockGameRepository as any,
      mockMemberService as any,
      mockTextService as any,
    );
  });

  describe('start', () => {
    it('should return ALREADY_ACTIVE if active game exists', async () => {
      const mockActiveGame = {
        id: 1,
        status: GameStatus.ACTIVE,
        chatId: BigInt(123),
      };

      mockGameRepository.getCurrentGameByChatId.mockResolvedValue(mockActiveGame);

      const ctx = { chat: { id: 123 } } as any;
      const result = await service.start(ctx);

      expect(result).toBe('ALREADY_ACTIVE');
      expect(mockMemberService.getSubmissionUsers).not.toHaveBeenCalled();
    });

    it('should return NO_LOBBY if no tracks and no LOBBY game', async () => {
      mockGameRepository.getCurrentGameByChatId.mockResolvedValue(null);
      mockMemberService.getSubmissionUsers.mockResolvedValue([]);

      const ctx = { chat: { id: 123 } } as any;
      const result = await service.start(ctx);

      expect(result).toBe('NO_LOBBY');
    });

    it('should return NO_TRACKS if LOBBY game exists but no tracks', async () => {
      const mockLobbyGame = {
        id: 1,
        status: GameStatus.LOBBY,
        chatId: BigInt(123),
      };

      mockGameRepository.getCurrentGameByChatId.mockResolvedValue(mockLobbyGame);
      mockMemberService.getSubmissionUsers.mockResolvedValue([]);

      const ctx = { chat: { id: 123 } } as any;
      const result = await service.start(ctx);

      expect(result).toBe('NO_TRACKS');
    });

    it('should find LOBBY game and start it when tracks exist', async () => {
      const mockLobbyGame = {
        id: 1,
        status: GameStatus.LOBBY,
        chatId: BigInt(123),
      };

      const mockStartedGame = {
        id: 1,
        chatId: BigInt(123),
      };

      const mockUsers = [{ id: BigInt(1), name: 'User1' }];

      mockGameRepository.getCurrentGameByChatId
        .mockResolvedValueOnce(null) // First call - no active game
        .mockResolvedValueOnce(mockLobbyGame); // Second call - finds LOBBY game
      mockMemberService.getSubmissionUsers.mockResolvedValue(mockUsers);
      mockGameRepository.startGameFromLobby.mockResolvedValue(mockStartedGame);

      const ctx = { chat: { id: 123 } } as any;
      const result = await service.start(ctx);

      expect(result).toEqual({ chatId: 123 });
      expect(mockGameRepository.startGameFromLobby).toHaveBeenCalledWith(1);
    });

    it('should create LOBBY game if tracks exist but no game found', async () => {
      const mockNewLobbyGame = {
        id: 2,
        status: GameStatus.LOBBY,
        chatId: BigInt(123),
      };

      const mockStartedGame = {
        id: 2,
        chatId: BigInt(123),
      };

      const mockUsers = [{ id: BigInt(1), name: 'User1' }];

      mockGameRepository.getCurrentGameByChatId
        .mockResolvedValueOnce(null) // First call - no active game
        .mockResolvedValueOnce(null); // Second call - still no LOBBY game
      mockMemberService.getSubmissionUsers.mockResolvedValue(mockUsers);
      mockGameRepository.createEmptyLobby.mockResolvedValue(mockNewLobbyGame);
      mockGameRepository.startGameFromLobby.mockResolvedValue(mockStartedGame);

      const ctx = { chat: { id: 123 } } as any;
      const result = await service.start(ctx);

      expect(result).toEqual({ chatId: 123 });
      expect(mockGameRepository.createEmptyLobby).toHaveBeenCalledWith(123);
      expect(mockGameRepository.startGameFromLobby).toHaveBeenCalledWith(2);
    });

    it('should handle COMPLETED game and find LOBBY game with tracks', async () => {
      const mockCompletedGame = {
        id: 1,
        status: GameStatus.COMPLETED,
        chatId: BigInt(123),
      };

      const mockLobbyGame = {
        id: 2,
        status: GameStatus.LOBBY,
        chatId: BigInt(123),
      };

      const mockStartedGame = {
        id: 2,
        chatId: BigInt(123),
      };

      const mockUsers = [{ id: BigInt(1), name: 'User1' }];

      mockGameRepository.getCurrentGameByChatId
        .mockResolvedValueOnce(mockCompletedGame) // First call - completed game
        .mockResolvedValueOnce(mockLobbyGame); // Second call - finds LOBBY game
      mockMemberService.getSubmissionUsers.mockResolvedValue(mockUsers);
      mockGameRepository.startGameFromLobby.mockResolvedValue(mockStartedGame);

      const ctx = { chat: { id: 123 } } as any;
      const result = await service.start(ctx);

      expect(result).toEqual({ chatId: 123 });
      expect(mockGameRepository.startGameFromLobby).toHaveBeenCalledWith(2);
    });
  });
});
