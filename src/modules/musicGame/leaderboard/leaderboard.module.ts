import { Composer } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { inject, injectable } from "inversify";
import { CommandContext, TYPES } from "@/types";
import { RoundService } from "../round/round.service";
import { LeaderboardService } from "@/modules/musicGame/leaderboard/leaderboard.service";
import { GuessService } from "@/modules/musicGame/guess/guess.service";

/**
 * LeaderboardModule - Handles leaderboard interactions
 *
 * Responsibilities:
 * - Generating scoring and stats
 * - Showing leaderboard
 */
@injectable()
export class LeaderboardModule extends Composer<IBotContext> {
  constructor(
    @inject(TYPES.GuessService) private guessService: GuessService,
    @inject(TYPES.RoundService) private roundService: RoundService,
    @inject(TYPES.LeaderboardService)
    private leaderboardService: LeaderboardService,
  ) {
    super();

    this.command("leaderboard", this.handleLeaderboard.bind(this));
  }

  /**
   * Displays leaderboard
   */
  private async handleLeaderboard(ctx: CommandContext): Promise<void> {
    await this.leaderboardService.showLeaderboard(ctx, ctx.chat.id);
  }
}
