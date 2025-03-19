import { Context } from "telegraf";
import { GameRepository } from "../repositories/GameRepository";
import { GuessValidationService } from "./GuessValidationService";
import { inject, injectable } from "inversify";
import { TYPES } from "@/types";

@injectable()
export class GuessService {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: GameRepository,
    @inject(TYPES.GuessValidationService)
    private validationService: GuessValidationService,
  ) {}

  async processGuess(
    ctx: Context,
    roundId: number,
    guessedUserId: number,
    onSuccess?: () => Promise<void>,
  ) {
    const round = await this.gameRepository.findRoundById(roundId);
    const validationResult = await this.validationService.validateGuess(
      ctx,
      roundId,
      guessedUserId,
    );

    return validationResult.match(
      async (context) => {
        const { game, round, guessingUserId } = context;
        const isLateGuess = round.index < game.currentRound;
        const isCorrect = Number(round.submission.userId) === guessedUserId;
        // If it's a person guessing themselves, they get no points
        const points = this.calculatePoints(
          isCorrect,
          isLateGuess,
          round.hintShown,
          guessingUserId === guessedUserId,
          isCorrect,
        );

        await this.gameRepository.createGuess({
          roundId: round.id,
          userId: guessingUserId,
          guessedId: guessedUserId,
          isCorrect,
          points,
          isLateGuess,
        });

        await ctx.answerCbQuery(
          isCorrect
            ? "getRandomResponse(this.botResponses.guessing.correctGuess(points))"
            : "getRandomResponse(this.botResponses.guessing.wrongGuess)",
        );

        if (onSuccess) {
          await onSuccess();
        }
      },
      async (error) => {
        await ctx.answerCbQuery(error);
      },
    );
  }

  private calculatePoints(
    isCorrect: boolean,
    isLateGuess: boolean,
    hintShown: boolean,
    isSelfGuess: boolean,
    isCorrectGuess: boolean,
  ): number {
    if (isSelfGuess) return 0;
    if (!isCorrect) return -2;
    if (isLateGuess) return 1;
    return hintShown ? 2 : 4;
  }
}
