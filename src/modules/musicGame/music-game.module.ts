import { Composer } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { inject, injectable } from "inversify";
import { TYPES } from "@/types";
import { GameModule } from "./game/game.module";
import { RoundModule } from "./round/round.module";
import { GuessModule } from "./guess/guess.module";
import { LeaderboardModule } from "./leaderboard/leaderboard.module";

/**
 * MusicGameModule - Main entry point for the music guessing game
 *
 * This module combines all submodules to create a complete game experience:
 * - GameModule: Game lifecycle (create, start, end)
 * - RoundModule: Round progression and hints
 * - GuessModule: Player guesses and scoring
 * - LeaderboardModule: Scoring and stats
 */
@injectable()
export class MusicGameModule extends Composer<IBotContext> {
  constructor(
    @inject(TYPES.GameModule) gameModule: GameModule,
    @inject(TYPES.RoundModule) roundModule: RoundModule,
    @inject(TYPES.GuessModule) guessModule: GuessModule,
    @inject(TYPES.LeaderboardModule) leaderboardModule: LeaderboardModule,
  ) {
    super();

    // Register all submodules
    this.use(gameModule);
    this.use(roundModule);
    this.use(guessModule);
    this.use(leaderboardModule);
  }
}
