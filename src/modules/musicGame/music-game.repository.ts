import { Guess, Prisma, User, GameStatus, RoundPhase } from '@prisma/client';
import prisma from '../../prisma/client';
import { injectable } from 'inversify';
import { GameConfig } from '@/modules/musicGame/config/game-config';

const roundWithGuesses = Prisma.validator<Prisma.GameRoundInclude>()({
  guesses: {
    include: {
      user: true,
    },
  },
  user: true,
  game: true,
});

const gameWithData = Prisma.validator<Prisma.GameInclude>()({
  rounds: {
    include: roundWithGuesses,
  },
  activeInChat: true,
});

export type GameWithData = Prisma.GameGetPayload<{
  include: typeof gameWithData;
}>;

export type RoundWithGuesses = Prisma.GameRoundGetPayload<{
  include: typeof roundWithGuesses;
}>;

@injectable()
export class MusicGameRepository {
  async getGameById(id: number): Promise<GameWithData | null> {
    return prisma.game.findUnique({
      where: { id },
      include: gameWithData,
    });
  }

  async findRoundById(id: number): Promise<RoundWithGuesses | null> {
    return prisma.gameRound.findUnique({
      where: { id },
      include: roundWithGuesses,
    });
  }

  async getCurrentGameByChatId(chatId: number): Promise<GameWithData | null> {
    const chat = await prisma.chat.findUnique({
      where: { id: BigInt(chatId) },
      include: {
        activeGame: {
          include: gameWithData,
        },
      },
    });

    // Extract the active game from the chat
    const activeGame = chat?.activeGame;

    return activeGame || null;
  }

  async endGame(gameId: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Set all LIVE rounds to COMPLETED
      await tx.gameRound.updateMany({
        where: {
          gameId: gameId,
          phase: RoundPhase.LIVE,
        },
        data: {
          phase: RoundPhase.COMPLETED,
          endedAt: new Date(),
        },
      });

      // Update game status and remove from active
      await tx.game.update({
        where: { id: gameId },
        data: {
          status: GameStatus.COMPLETED,
          chat: {
            update: {
              activeGameId: null,
            },
          },
        },
      });
    });
  }

  async getRoundByDatabaseId(roundId: number): Promise<RoundWithGuesses | null> {
    return prisma.gameRound.findUnique({
      where: { id: roundId },
      include: roundWithGuesses,
    });
  }

  async getRoundBySequence(gameId: number, gameSequence: number) {
    return prisma.gameRound.findUnique({
      where: {
        gameId_roundIndex: {
          gameId: gameId,
          roundIndex: gameSequence,
        },
      },
      include: roundWithGuesses,
    });
  }

  /**
   * Creates an empty LOBBY game for a chat
   */
  async createEmptyLobby(chatId: number): Promise<GameWithData> {
    const game = await prisma.game.create({
      data: {
        status: GameStatus.LOBBY,
        chatId: BigInt(chatId),
      },
      include: gameWithData,
    });

    return game;
  }

  /**
   * Upserts a DRAFT round for a user in a lobby game
   */
  async upsertDraftRound(
    gameId: number,
    data: {
      userId: number;
      musicFileId: string;
      hintChatId?: number;
      hintMessageId?: number;
    },
  ): Promise<void> {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { rounds: { where: { phase: RoundPhase.DRAFT } } },
    });

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== GameStatus.LOBBY) {
      throw new Error('Can only add tracks to LOBBY games');
    }

    // Check if user already has a DRAFT round
    const existingRound = await prisma.gameRound.findUnique({
      where: {
        gameId_userId: {
          gameId,
          userId: BigInt(data.userId),
        },
      },
    });

    if (existingRound) {
      // Update existing DRAFT round
      await prisma.gameRound.update({
        where: { id: existingRound.id },
        data: {
          musicFileId: data.musicFileId,
          hintChatId: data.hintChatId ? BigInt(data.hintChatId) : null,
          hintMessageId: data.hintMessageId ? BigInt(data.hintMessageId) : null,
        },
      });
    } else {
      // Create new DRAFT round with next roundIndex
      const maxIndex =
        game.rounds.length > 0 ? Math.max(...game.rounds.map((r) => r.roundIndex)) : -1;

      await prisma.gameRound.create({
        data: {
          gameId,
          userId: BigInt(data.userId),
          roundIndex: maxIndex + 1,
          musicFileId: data.musicFileId,
          hintChatId: data.hintChatId ? BigInt(data.hintChatId) : null,
          hintMessageId: data.hintMessageId ? BigInt(data.hintMessageId) : null,
          phase: RoundPhase.DRAFT,
        },
      });
    }
  }

  /**
   * Deletes a user's DRAFT round from a lobby game
   */
  async deleteDraftRound(gameId: number, userId: number): Promise<void> {
    await prisma.gameRound.deleteMany({
      where: {
        gameId,
        userId: BigInt(userId),
        phase: RoundPhase.DRAFT,
      },
    });

    // Reindex remaining DRAFT rounds
    const draftRounds = await prisma.gameRound.findMany({
      where: {
        gameId,
        phase: RoundPhase.DRAFT,
      },
      orderBy: { createdAt: 'asc' },
    });

    for (let i = 0; i < draftRounds.length; i++) {
      await prisma.gameRound.update({
        where: { id: draftRounds[i]!.id },
        data: { roundIndex: i },
      });
    }
  }

  /**
   * Gets all users who have DRAFT rounds in a lobby game
   */
  async getDraftSubmissionUsers(chatId: number): Promise<User[]> {
    const game = await this.getCurrentGameByChatId(chatId);
    if (!game || game.status !== GameStatus.LOBBY) {
      return [];
    }

    return prisma.user.findMany({
      where: {
        gameRounds: {
          some: {
            gameId: game.id,
            phase: RoundPhase.DRAFT,
          },
        },
      },
    });
  }

  /**
   * Transitions a game from LOBBY to ACTIVE:
   * - Shuffles DRAFT rounds
   * - Flips all DRAFT rounds to LIVE
   * - Sets game status to ACTIVE
   * - Sets game as active in chat
   */
  async startGameFromLobby(gameId: number, config?: GameConfig): Promise<GameWithData> {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { rounds: { where: { phase: RoundPhase.DRAFT } } },
    });

    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== GameStatus.LOBBY) {
      throw new Error('Game is not in LOBBY state');
    }

    if (game.rounds.length === 0) {
      throw new Error('Cannot start game with no tracks');
    }

    const chatId = game.chatId;

    // Shuffle DRAFT rounds
    const shuffledRounds = this.shuffleArray([...game.rounds]);

    // Transaction: shuffle, flip rounds to LIVE, set game to ACTIVE, set as active game
    const updatedGame = await prisma.$transaction(async (tx) => {
      // Update round indices to shuffle
      for (let i = 0; i < shuffledRounds.length; i++) {
        await tx.gameRound.update({
          where: { id: shuffledRounds[i]!.id },
          data: {
            roundIndex: i,
            phase: RoundPhase.LIVE,
            startedAt: new Date(),
          },
        });
      }

      // Update game status
      const updated = await tx.game.update({
        where: { id: gameId },
        data: {
          status: GameStatus.ACTIVE,
          config: config ? (config as unknown as Prisma.InputJsonValue) : undefined,
        },
        include: gameWithData,
      });

      // Set as active game in chat
      await tx.chat.update({
        where: { id: chatId },
        data: {
          activeGameId: gameId,
        },
      });

      return updated;
    });

    return updatedGame;
  }

  shuffleArray<T>(array: T[]): T[] {
    if (array.length < 2) {
      return [...array];
    }
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j]!, newArray[i]!];
    }
    return newArray;
  }

  async updateGameRound(gameId: number, currentRound: number): Promise<GameWithData> {
    return prisma.game.update({
      where: { id: gameId },
      data: { currentRound },
      include: gameWithData,
    });
  }

  async updateGameConfig(
    gameId: number,
    data: { status?: GameStatus; config?: GameConfig },
  ): Promise<void> {
    const updateData: Prisma.GameUpdateInput = {};
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.config !== undefined) {
      updateData.config = data.config as unknown as Prisma.InputJsonValue;
    }
    await prisma.game.update({
      where: { id: gameId },
      data: updateData,
    });
  }

  async showHint(roundId: number): Promise<void> {
    await prisma.gameRound.update({
      where: { id: roundId },
      data: { hintShownAt: new Date() },
    });
  }

  async createGuess(data: {
    roundId: number;
    userId: number;
    guessedId: number;
    isCorrect: boolean;
    points: number;
    isLateGuess: boolean;
  }): Promise<Guess> {
    return prisma.guess.upsert({
      where: {
        roundId_userId: {
          roundId: data.roundId,
          userId: BigInt(data.userId),
        },
      },
      create: {
        roundId: data.roundId,
        userId: BigInt(data.userId),
        guessedId: BigInt(data.guessedId),
        points: data.points,
      },
      update: {
        guessedId: BigInt(data.guessedId),
        points: data.points,
      },
    });
  }

  async findGuess(roundId: number, userId: number): Promise<Guess | null> {
    return prisma.guess.findUnique({
      where: {
        roundId_userId: {
          roundId,
          userId: BigInt(userId),
        },
      },
    });
  }

  async getParticipants(gameId: number): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        gameRounds: {
          some: {
            gameId: gameId,
          },
        },
      },
    });
  }

  async getUsersNotGuessed(roundId: number): Promise<User[]> {
    const round = await prisma.gameRound.findUnique({
      where: { id: roundId },
      select: { gameId: true },
    });

    if (!round) {
      throw new Error(`Round with ID ${roundId} not found`);
    }

    return prisma.user.findMany({
      where: {
        gameRounds: {
          some: {
            gameId: round.gameId,
          },
        },
        AND: {
          NOT: {
            guesses: {
              some: {
                roundId,
              },
            },
          },
        },
      },
    });
  }

  async updateRoundMessageInfo(roundId: number, messageId: number) {
    await prisma.gameRound.update({
      where: { id: roundId },
      data: { infoMessageId: BigInt(messageId) },
    });
  }

  async getGamesOfChat(chatId: number): Promise<GameWithData[]> {
    return prisma.game.findMany({
      where: { chatId: BigInt(chatId) },
      orderBy: {
        createdAt: 'desc',
      },
      include: gameWithData,
    });
  }

  /**
   * Get LIVE rounds count for a game
   */
  async getLiveRoundsCount(gameId: number): Promise<number> {
    return prisma.gameRound.count({
      where: {
        gameId,
        phase: RoundPhase.LIVE,
      },
    });
  }

  /**
   * Get current LIVE round by game sequence
   */
  async getLiveRoundBySequence(gameId: number, gameSequence: number) {
    return prisma.gameRound.findFirst({
      where: {
        gameId,
        roundIndex: gameSequence,
        phase: RoundPhase.LIVE,
      },
      include: roundWithGuesses,
    });
  }
}
