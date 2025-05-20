import { Composer } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { inject, injectable } from "inversify";
import { CallbackQueryContext, TYPES } from "@/types";
import { GameService } from "./game.service";
import { RequirePermission } from "@/modules/permissions/require-permission.decorator";
import { CommandContext } from "@/types";
import { dataAction } from "@/utils/filters";

/**
 * GameModule - Manages game lifecycle (create, start, end)
 *
 * Responsibilities:
 * - Creating new games
 * - Starting games
 * - Listing existing games
 * - Retrieving active game information
 */
@injectable()
export class GameModule extends Composer<IBotContext> {
  constructor(@inject(TYPES.GameService) private gameService: GameService) {
    super();

    // Commands
    this.command("music_guess", this.handleMusicGuessCommand.bind(this));
    this.command("list_games", this.handleListGamesCommand.bind(this));
    this.command("active_game", this.handleActiveGameCommand.bind(this));
    this.command("ping_players", this.handlePingPlayers.bind(this));
    this.command("list_players", this.handleListPlayers.bind(this));

    // Actions
    this.on(dataAction(/^game:(.+)$/), this.handleGameAction.bind(this));
  }

  /**
   * Main entry point for starting a music guessing game
   */
  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleMusicGuessCommand(ctx: CommandContext): Promise<void> {
    await this.gameService.initiateGameSetup(ctx);
  }

  /**
   * Lists all games for the current chat
   */
  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleListGamesCommand(ctx: CommandContext): Promise<void> {
    await this.gameService.listGames(ctx);
  }

  /**
   * Sends a message to all game participants that pings them
   */
  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handlePingPlayers(ctx: CommandContext): Promise<void> {
    await this.gameService.pingPlayers(ctx);
  }

  /**
   * Lists all game participants
   */
  private async handleListPlayers(ctx: CommandContext): Promise<void> {
    await this.gameService.listPlayers(ctx);
  }

  /**
   * Displays information about the current active game
   */
  private async handleActiveGameCommand(ctx: CommandContext): Promise<void> {
    await this.gameService.showActiveGameInfo(ctx);
  }

  /**
   * Handles game-related button actions
   */
  private async handleGameAction(ctx: CallbackQueryContext): Promise<void> {
    if (!ctx.callbackQuery) return;

    const actionData = ctx.callbackQuery.data.split(":")[1];

    switch (actionData) {
      case "start":
        await this.gameService.startGame(ctx); // TODO: doesn't initiate round
        break;
      // case "end":
      //   await this.gameService.endGame(ctx);
      //   break;
      default:
        await ctx.answerCbQuery("Unknown game action");
    }
  }
}
