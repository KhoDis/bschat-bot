import { Guess, Prisma, User } from "@prisma/client";
import prisma from "../../prisma/client";
import { injectable } from "inversify";

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

  async getCurrentGameByChatId(chatId: number): Promise<GameWithData | null> {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
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

  async finishGame(gameId: number): Promise<void> {
    await prisma.game.update({
      where: { id: gameId },
      data: {
        chat: {
          update: {
            activeGameId: null,
          },
        },
      },
    });
  }

  async getCurrentRound(chatId: number): Promise<RoundWithGuesses | null> {
    return prisma.gameRound.findFirst({
      where: { endedAt: null, game: { chatId } },
      include: roundWithGuesses,
    });
  }

  async transferSubmissions(chatId: number): Promise<GameWithData> {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: {
          include: {
            user: true,
            musicSubmission: true,
          },
        },
      },
    });
    if (!chat) {
      throw new Error("Chat not found");
    }
    const submissions = chat.members
      .map((member) => member.musicSubmission)
      .filter((submission) => submission !== null);
    const game = await prisma.game.create({
      data: {
        rounds: {
          create: submissions.map((track, index) => ({
            roundIndex: index,
            musicFileId: track.fileId,
            hintChatId: track.uploadChatId,
            hintMessageId: track.uploadHintMessageId,
            userId: track.memberUserId,
          })),
        },
        chatId,
      },
      include: gameWithData,
    });

    // Add game as active game in the chat
    await prisma.chat.update({
      where: { id: chatId },
      data: {
        activeGameId: game.id,
      },
    });

    // Remove the member's music submission
    await prisma.musicSubmission.deleteMany({
      where: {
        memberUserId: {
          in: submissions.map((submission) => submission.memberUserId),
        },
      },
    });
    return game;
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
    return prisma.guess.create({
      data: {
        roundId: data.roundId,
        userId: data.userId,
        guessedId: data.guessedId,
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
      data: { infoMessageId: messageId },
    });
  }

  async getAllGames(): Promise<GameWithData[]> {
    return prisma.game.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: gameWithData,
    });
  }
}
