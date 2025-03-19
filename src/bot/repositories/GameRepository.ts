import { Game, GameStatus, Guess, Prisma, User } from "@prisma/client";
import prisma from "../../prisma/client";
import { MusicSubmission } from "@prisma/client";
import { injectable } from "inversify";

const gameWithData = Prisma.validator<Prisma.GameInclude>()({
  rounds: {
    include: {
      submission: {
        include: {
          user: true,
        },
      },
      guesses: {
        include: {
          user: true,
        },
      },
    },
  },
});

export type GameWithData = Prisma.GameGetPayload<{
  include: typeof gameWithData;
}>;

const roundWithGuesses = Prisma.validator<Prisma.GameRoundInclude>()({
  guesses: {
    include: {
      user: true,
    },
  },
  submission: {
    include: {
      user: true,
    },
  },
});

export type RoundWithGuesses = Prisma.GameRoundGetPayload<{
  include: typeof roundWithGuesses;
}>;

@injectable()
export class GameRepository {
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

  async deleteGame(id: number): Promise<void> {
    // Remove guesses
    await prisma.guess.deleteMany({
      where: { round: { gameId: id } },
    });
    // Remove rounds
    await prisma.gameRound.deleteMany({
      where: { gameId: id },
    });
    // Remove game
    await prisma.game.delete({
      where: { id },
    });
  }

  async getCurrentGame(): Promise<GameWithData | null> {
    return prisma.game.findFirst({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        createdAt: "desc",
      },
      include: gameWithData,
    });
  }

  async getCurrentRound(): Promise<RoundWithGuesses | null> {
    const game = await prisma.game.findFirst({
      include: gameWithData,
      orderBy: { createdAt: "desc" },
    });

    // NOTE: rounds are not sorted by id!!!!!!!!!
    return (
      game?.rounds.find((round) => round.index === game.currentRound) || null
    );
  }

  async createGame(submissions: MusicSubmission[]): Promise<GameWithData> {
    return prisma.game.create({
      data: {
        rounds: {
          create: submissions.map((track, index) => ({
            index,
            submissionId: track.id,
          })),
        },
      },
      include: gameWithData,
    });
  }

  async updateGameRound(
    gameId: number,
    currentRound: number,
  ): Promise<GameWithData> {
    return prisma.game.update({
      where: { id: gameId },
      data: { currentRound },
      include: gameWithData,
    });
  }

  async updateRoundHint(roundId: number, hintShown: boolean): Promise<void> {
    await prisma.gameRound.update({
      where: { id: roundId },
      data: { hintShown },
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
    return prisma.guess.create({
      data: {
        roundId: data.roundId,
        userId: data.userId,
        guessedId: data.guessedId,
        isCorrect: data.isCorrect,
        points: data.points,
        isLateGuess: data.isLateGuess,
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
        musicSubmission: {
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
        musicSubmission: {
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

  async updateRoundMessageInfo(
    roundId: number,
    messageId: number,
    chatId: number,
  ) {
    await prisma.gameRound.update({
      where: { id: roundId },
      data: { infoMessageId: messageId, chatId },
    });
  }

  async updateGameStatus(gameId: number, status: GameStatus): Promise<Game> {
    return prisma.game.update({
      where: { id: gameId },
      data: { status },
    });
  }

  async getAllGames(): Promise<Game[]> {
    return prisma.game.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
