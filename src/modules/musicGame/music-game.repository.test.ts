import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MusicGameRepository } from './music-game.repository';
import { GameStatus, RoundPhase } from '@prisma/client';
import prisma from '@/prisma/client';

// Mock Prisma client
vi.mock('@/prisma/client', () => ({
  default: {
    chat: {
      findUnique: vi.fn(),
    },
    game: {
      findFirst: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

describe('MusicGameRepository', () => {
  let repo: MusicGameRepository;

  beforeEach(() => {
    repo = new MusicGameRepository();
    vi.clearAllMocks();
  });

  describe('getCurrentGameByChatId', () => {
    it('should return active game if exists', async () => {
      const mockActiveGame = {
        id: 1,
        status: GameStatus.ACTIVE,
        chatId: BigInt(123),
        rounds: [],
        activeInChat: null,
      };

      (prisma.chat.findUnique as any).mockResolvedValue({
        id: BigInt(123),
        activeGame: mockActiveGame,
      });

      const result = await repo.getCurrentGameByChatId(123);

      expect(result).toEqual(mockActiveGame);
      expect(prisma.chat.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(123) },
        include: {
          activeGame: {
            include: expect.any(Object),
          },
        },
      });
    });

    it('should return LOBBY game if no active game exists', async () => {
      const mockLobbyGame = {
        id: 2,
        status: GameStatus.LOBBY,
        chatId: BigInt(123),
        rounds: [],
        activeInChat: null,
      };

      (prisma.chat.findUnique as any).mockResolvedValue({
        id: BigInt(123),
        activeGame: null,
      });

      (prisma.game.findFirst as any).mockResolvedValue(mockLobbyGame);

      const result = await repo.getCurrentGameByChatId(123);

      expect(result).toEqual(mockLobbyGame);
      expect(prisma.game.findFirst).toHaveBeenCalledWith({
        where: {
          chatId: BigInt(123),
          status: GameStatus.LOBBY,
        },
        include: expect.any(Object),
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return null if no game exists', async () => {
      (prisma.chat.findUnique as any).mockResolvedValue({
        id: BigInt(123),
        activeGame: null,
      });

      (prisma.game.findFirst as any).mockResolvedValue(null);

      const result = await repo.getCurrentGameByChatId(123);

      expect(result).toBeNull();
    });

    it('should prioritize ACTIVE game over LOBBY game', async () => {
      const mockActiveGame = {
        id: 1,
        status: GameStatus.ACTIVE,
        chatId: BigInt(123),
        rounds: [],
        activeInChat: null,
      };

      (prisma.chat.findUnique as any).mockResolvedValue({
        id: BigInt(123),
        activeGame: mockActiveGame,
      });

      const result = await repo.getCurrentGameByChatId(123);

      expect(result).toEqual(mockActiveGame);
      expect(prisma.game.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('getDraftSubmissionUsers', () => {
    it('should return users with DRAFT rounds in LOBBY game', async () => {
      const mockLobbyGame = {
        id: 1,
        status: GameStatus.LOBBY,
        chatId: BigInt(123),
        rounds: [],
        activeInChat: null,
      };

      const mockUsers = [
        { id: BigInt(1), name: 'User1', tag: 'user1' },
        { id: BigInt(2), name: 'User2', tag: 'user2' },
      ];

      (prisma.chat.findUnique as any).mockResolvedValue({
        id: BigInt(123),
        activeGame: mockLobbyGame,
      });

      (prisma.user.findMany as any).mockResolvedValue(mockUsers);

      const result = await repo.getDraftSubmissionUsers(123);

      expect(result).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          gameRounds: {
            some: {
              gameId: 1,
              phase: RoundPhase.DRAFT,
            },
          },
        },
      });
    });

    it('should search for DRAFT rounds in any game if no LOBBY game exists', async () => {
      const mockUsers = [
        { id: BigInt(1), name: 'User1', tag: 'user1' },
      ];

      (prisma.chat.findUnique as any).mockResolvedValue({
        id: BigInt(123),
        activeGame: null,
      });

      (prisma.game.findFirst as any).mockResolvedValue(null);
      (prisma.user.findMany as any).mockResolvedValue(mockUsers);

      const result = await repo.getDraftSubmissionUsers(123);

      expect(result).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          gameRounds: {
            some: {
              game: {
                chatId: BigInt(123),
              },
              phase: RoundPhase.DRAFT,
            },
          },
        },
      });
    });

    it('should return empty array if no DRAFT rounds exist', async () => {
      const mockLobbyGame = {
        id: 1,
        status: GameStatus.LOBBY,
        chatId: BigInt(123),
        rounds: [],
        activeInChat: null,
      };

      (prisma.chat.findUnique as any).mockResolvedValue({
        id: BigInt(123),
        activeGame: mockLobbyGame,
      });

      (prisma.user.findMany as any).mockResolvedValue([]);

      const result = await repo.getDraftSubmissionUsers(123);

      expect(result).toEqual([]);
    });
  });
});

