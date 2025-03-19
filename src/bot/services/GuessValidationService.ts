import { Context } from "telegraf";
import {
  GameRepository,
  GameWithData,
  RoundWithGuesses,
} from "../repositories/GameRepository";
import { Result } from "@/utils/Result";
import { GameRound, Guess } from "@prisma/client";
import { inject, injectable } from "inversify";
import { TYPES } from "@/types";

interface GuessContext {
  game: GameWithData;
  round: RoundWithGuesses;
  guessingUserId: number;
  existingGuess: Guess | null;
}

@injectable()
export class GuessValidationService {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: GameRepository,
  ) {}

  async validateGuess(
    ctx: Context,
    roundId: number,
    guessedUserId: number,
  ): Promise<Result<GuessContext, string>> {
    const game = await this.validateGame();
    return game
      .andThen((game) => this.validateRound(game, roundId))
      .andThen((context) => this.validateUser(context, ctx.from?.id))
      .andThenAsync(
        async (context) =>
          await this.validateExistingGuess(context, context.guessingUserId),
      );
  }

  private async validateGame(): Promise<Result<GameWithData, string>> {
    const game: GameWithData | null =
      await this.gameRepository.getCurrentGame();
    return game
      ? Result.ok(game)
      : Result.err("getRandomResponse(this.botResponses.gameState.noGame)");
  }

  private validateRound(
    game: GameWithData,
    roundId: number,
  ): Result<{ game: GameWithData; round: GameRound }, string> {
    const round = game.rounds.find((r) => r.id === roundId);
    return round
      ? Result.ok({ game, round } as { game: GameWithData; round: GameRound })
      : Result.err("getRandomResponse(this.botResponses.rounds.noSuchRound)");
  }

  private validateUser(
    context: { game: GameWithData; round: GameRound },
    userId?: number,
  ): Result<
    Omit<GuessContext, "existingGuess"> & { guessingUserId: number },
    string
  > {
    return userId
      ? Result.ok({ ...context, guessingUserId: userId } as Omit<
          GuessContext,
          "existingGuess"
        > & { guessingUserId: number })
      : Result.err("getRandomResponse(this.botResponses.user.notFound)");
  }

  private async validateExistingGuess(
    context: Omit<GuessContext, "existingGuess">,
    userId: number,
  ): Promise<Result<GuessContext, string>> {
    const existingGuess = await this.gameRepository.findGuess(
      context.round.id,
      userId,
    );
    return existingGuess
      ? Result.err(
          "getRandomResponse(this.botResponses.guessing.alreadyGuessed)",
        )
      : Result.ok({ ...context, existingGuess: null });
  }
}
