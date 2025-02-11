import prisma from "../../prisma/client";
import {
  AppGame,
  AppGameRound,
  AppGuess,
  AppMusicSubmission,
  AppUser,
  schemas,
} from "../../schemas";

export class GameRepository {
  async getGameById(id: number): Promise<AppGame> {
    const game = await prisma.game.findUnique({
      where: { id },
      include: {
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
      },
    });

    return schemas.app.game.parse(game);
  }

  async updateRoundMessageInfo(
    roundId: number,
    messageId: number,
    chatId: number,
  ): Promise<void> {
    await prisma.gameRound.update({
      where: { id: roundId },
      data: {
        infoMessageId: messageId,
        chatId: chatId,
      },
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

  async getCurrentGame(): Promise<AppGame | null> {
    const game = await prisma.game.findFirst({
      where: { status: "ACTIVE" },
      include: {
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
      },
      orderBy: { createdAt: "desc" },
    });

    // If the game is null, find latest game
    if (!game) {
      const latestGame = await prisma.game.findFirst({
        include: {
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
        },
        orderBy: { createdAt: "desc" },
      });

      return latestGame ? schemas.app.game.parse(latestGame) : null;
    }

    return game ? schemas.app.game.parse(game) : null;
  }

  async getCurrentRound(): Promise<AppGameRound | null> {
    const game = await prisma.game.findFirst({
      where: { status: "ACTIVE" },
      include: {
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
      },
      orderBy: { createdAt: "desc" },
    });

    // console.log("getCurrentRound", game);

    if (!game) {
      return null;
    }

    if (game.currentRound >= game.rounds.length) {
      return null;
    }

    return game
      ? schemas.app.gameRound.parse(game.rounds[game.currentRound])
      : null;
  }

  async createGame(submissions: AppMusicSubmission[]): Promise<AppGame> {
    const game = await prisma.game.create({
      data: {
        rounds: {
          create: submissions.map((track, index) => ({
            index,
            submissionId: track.id,
          })),
        },
      },
      include: {
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
      },
    });

    // console.dir(game, { depth: null });

    return schemas.app.game.parse(game);
  }

  async updateGameRound(
    gameId: number,
    currentRound: number,
  ): Promise<AppGame> {
    const game = await prisma.game.update({
      where: { id: gameId },
      data: { currentRound },
      include: {
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
      },
    });

    return schemas.app.game.parse(game);
  }

  async updateRoundHint(
    roundId: number,
    hintShown: boolean,
  ): Promise<AppGameRound> {
    const round = await prisma.gameRound.update({
      where: { id: roundId },
      data: { hintShown },
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
    });

    return schemas.app.gameRound.parse(round);
  }

  async createGuess(data: {
    roundId: number;
    userId: number;
    guessedId: number;
    isCorrect: boolean;
    points: number;
    isLateGuess: boolean;
  }): Promise<AppGuess> {
    const guess = await prisma.guess.create({
      data: {
        roundId: data.roundId,
        userId: BigInt(data.userId),
        guessedId: BigInt(data.guessedId),
        isCorrect: data.isCorrect,
        points: data.points,
        isLateGuess: data.isLateGuess,
      },
      include: {
        user: true,
      },
    });

    return schemas.app.guess.parse(guess);
  }

  async findGuess(roundId: number, userId: number): Promise<AppGuess | null> {
    const guess = await prisma.guess.findUnique({
      where: {
        roundId_userId: {
          roundId,
          userId: BigInt(userId),
        },
      },
      include: {
        user: true,
      },
    });

    return guess ? schemas.app.guess.parse(guess) : null;
  }

  async finishGame(gameId: number): Promise<AppGame> {
    const game = await prisma.game.update({
      where: { id: gameId },
      data: { status: "FINISHED" },
      include: {
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
      },
    });

    return schemas.app.game.parse(game);
  }

  async getParticipants(): Promise<AppUser[]> {
    const users = await prisma.user.findMany({
      where: {
        musicSubmission: {
          isNot: null,
        },
      },
    });

    return users.map((user) => schemas.app.user.parse(user));
  }

  async getUsersNotGuessed(roundId: number): Promise<AppUser[]> {
    const users = await prisma.user.findMany({
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

    return users.map((user) => schemas.app.user.parse(user));
  }
}
