import { Context } from "telegraf";
import { Game, GameRound, Guess } from "../../schemas";
import { GameRepository } from "../repositories/GameRepository";
import { Result } from "../../utils/Result";
import { BotResponses, getRandomResponse } from "../../config/botResponses";

interface GuessContext {
  game: Game;
  round: GameRound;
  guessingUserId: number;
  existingGuess: Guess | null;
}

export class GuessValidationService {
  constructor(
    private gameRepository: GameRepository,
    private readonly botResponses: BotResponses,
  ) {}

  async validateGuess(
    ctx: Context,
    roundIndex: number,
    guessedUserId: number,
  ): Promise<Result<GuessContext, string>> {
    const game = await this.validateGame();
    return game
      .andThen((game) => this.validateRound(game, roundIndex))
      .andThen((context) => this.validateUser(context, ctx.from?.id))
      .andThenAsync(
        async (context) =>
          await this.validateExistingGuess(context, context.guessingUserId),
      );
  }

  private async validateGame(): Promise<Result<Game, string>> {
    const game: Game | null = await this.gameRepository.getCurrentGame();
    return game
      ? Result.ok(game)
      : Result.err(getRandomResponse(this.botResponses.gameState.noGame));
  }

  private validateRound(
    game: Game,
    roundIndex: number,
  ): Result<{ game: Game; round: GameRound }, string> {
    const round = game.rounds.find((r) => r.index === roundIndex);
    return round
      ? Result.ok({ game, round })
      : Result.err(getRandomResponse(this.botResponses.rounds.noSuchRound));
  }

  private validateUser(
    context: { game: Game; round: GameRound },
    userId?: number,
  ): Result<
    Omit<GuessContext, "existingGuess"> & { guessingUserId: number },
    string
  > {
    return userId
      ? Result.ok({ ...context, guessingUserId: userId })
      : Result.err(getRandomResponse(this.botResponses.user.notFound));
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
      ? Result.err(getRandomResponse(this.botResponses.guessing.alreadyGuessed))
      : Result.ok({ ...context, existingGuess: null });
  }
}
