import { Guess, Prisma, User } from "@prisma/client";
import prisma from "../../prisma/client";
import { MusicSubmission } from "@/types";

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

export class GameRepository {
  async getGameById(id: number): Promise<GameWithData | null> {
    return prisma.game.findUnique({
      where: { id },
      include: gameWithData,
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
      include: gameWithData,
      orderBy: { createdAt: "desc" },
    });
  }

  async getCurrentRound(): Promise<RoundWithGuesses | null> {
    const game = await prisma.game.findFirst({
      include: gameWithData,
      orderBy: { createdAt: "desc" },
    });

    return game?.rounds[game.currentRound] || null;
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

  async getParticipants(): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        musicSubmission: {
          isNot: null,
        },
      },
    });
  }

  async getUsersNotGuessed(roundId: number): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        musicSubmission: { isNot: null },
        NOT: {
          guesses: {
            some: {
              roundId,
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
}
