import { Composer } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { inject, injectable } from "inversify";
import { TYPES } from "@/types";
import { GuessService } from "./guess.service";
import { CallbackQueryContext } from "@/types";
import { dataAction } from "@/utils/filters";
import { RoundService } from "../round/round.service";

/**
 * GuessModule - Handles player guesses
 *
 * Responsibilities:
 * - Processing player guesses
 * - Managing guess-related interactions
 */
@injectable()
export class GuessModule extends Composer<IBotContext> {
  constructor(
    @inject(TYPES.GuessService) private guessService: GuessService,
    @inject(TYPES.RoundService) private roundService: RoundService,
  ) {
    super();

    // Register callback query handlers
    this.on(dataAction(/^guess:(.+)$/), this.handleGuess.bind(this));
  }

  /**
   * Processes a player's guess from callback query
   */
  private async handleGuess(ctx: CallbackQueryContext): Promise<void> {
    if (!ctx.chat) return;

    const action = ctx.callbackQuery.data.split(":")[1];
    if (!action) return;

    const [roundIdStr, guessIdStr] = action.split("_");
    const roundId = Number(roundIdStr);
    const guessId = Number(guessIdStr);

    if (isNaN(roundId) || isNaN(guessId)) {
      await ctx.reply(`Не смог распознать данные: ${action}`);
      return;
    }

    try {
      // Process the guess and update round info on success
      await this.guessService.processGuess(
        ctx,
        roundId,
        ctx.chat.id,
        guessId,
        async () => await this.roundService.sendRoundInfo(ctx, roundId),
      );
    } catch (error) {
      console.error("Error processing guess:", error);
      await ctx.answerCbQuery("Что-то пошло не так... Наверное, это карма!");
    }
  }
}
