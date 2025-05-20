import { Composer } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { inject, injectable } from "inversify";
import { TYPES } from "@/types";
import { RoundService } from "./round.service";
import { RequirePermission } from "@/modules/permissions/require-permission.decorator";
import { CommandContext } from "@/types";
import { ArgsService } from "@/modules/common/args.service";

/**
 * RoundModule - Manages game rounds and hints
 *
 * Responsibilities:
 * - Advancing to next round
 * - Showing hints
 * - Managing round progression
 */
@injectable()
export class RoundModule extends Composer<IBotContext> {
  constructor(
    @inject(TYPES.RoundService) private roundService: RoundService,
    @inject(TYPES.ArgsService) private args: ArgsService,
  ) {
    super();

    // Commands
    this.command("next_round", this.handleNextRoundCommand.bind(this));
    this.command("show_hint", this.handleShowHintCommand.bind(this));
    this.command("play_current", this.handlePlayCurrentCommand.bind(this));
  }

  /**
   * Advances the game to the next round
   */
  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleNextRoundCommand(ctx: CommandContext): Promise<void> {
    if (!ctx.chat) return;

    const [_, gameIdString] = this.args.parse(ctx.message.text);
    const gameId = gameIdString ? Number(gameIdString) : undefined;

    if (gameId && isNaN(gameId)) {
      await ctx.reply("Некорректный ID игры.");
      return;
    }

    await this.roundService.nextRound(ctx, gameId);
  }

  /**
   * Shows a hint for the current round
   */
  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleShowHintCommand(ctx: CommandContext): Promise<void> {
    if (!ctx.chat) return;
    await this.roundService.showHint(ctx, ctx.chat.id);
  }

  /**
   * Plays the current round's music track again
   */
  private async handlePlayCurrentCommand(ctx: CommandContext): Promise<void> {
    if (!ctx.chat) return;
    await this.roundService.playCurrentRound(ctx, ctx.chat.id);
  }
}
