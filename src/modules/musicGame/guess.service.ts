import { Context } from "telegraf";
import { GameRepository } from "@/bot/repositories/GameRepository";
import { inject, injectable } from "inversify";
import { TYPES } from "@/types";
import { TextService } from "@/modules/common/text.service";

@injectable()
export class GuessService {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: GameRepository,
    @inject(TYPES.TextService) private text: TextService,
  ) {}

  async processGuess(
    ctx: Context,
    roundId: number,
    chatId: number,
    guessedUserId: number,
    onSuccess?: () => Promise<void>,
  ) {
    // Validate game exists
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) {
      await ctx.answerCbQuery(this.text.get("musicGame.noGame"));
      return;
    }

    // Validate round exists
    const round = game.rounds.find((r) => r.id === roundId);
    if (!round) {
      await ctx.answerCbQuery(this.text.get("rounds.noSuchRound"));
      return;
    }

    // Validate user exists
    const guessingUserId = ctx.from?.id;
    if (!guessingUserId) {
      await ctx.answerCbQuery(this.text.get("user.notFound"));
      return;
    }

    // Validate no existing guess
    const existingGuess = await this.gameRepository.findGuess(
      round.id,
      guessingUserId,
    );
    if (existingGuess) {
      await ctx.answerCbQuery(this.text.get("guessing.alreadyGuessed"));
      return;
    }

    // Process the guess
    const isLateGuess = round.roundIndex < game.currentRound;
    const isCorrect = Number(round.userId) === guessedUserId;
    const isSelfGuess = guessingUserId === guessedUserId;
    const points = this.calculatePoints(
      isCorrect,
      isLateGuess,
      !!round.hintShownAt,
      isSelfGuess,
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
        ? this.text.get("guessing.correctGuess", { points })
        : this.text.get("guessing.wrongGuess"),
    );

    if (onSuccess) {
      await onSuccess();
    }
  }

  private calculatePoints(
    isCorrect: boolean,
    isLateGuess: boolean,
    hintShown: boolean,
    isSelfGuess: boolean,
  ): number {
    if (isSelfGuess) return 0;
    if (!isCorrect) return -2;
    if (isLateGuess) return 1;
    return hintShown ? 2 : 4;
  }
}
