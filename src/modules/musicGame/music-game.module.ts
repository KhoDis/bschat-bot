import { Composer } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { inject, injectable } from "inversify";
import { CallbackQueryContext, CommandContext, TYPES } from "@/types";
import { MusicGameService } from "./music-game.service";
import { RequirePermission } from "@/modules/permissions/require-permission.decorator";
import { ActionHelper } from "@/modules/common/action.helper";
import { callbackQuery } from "telegraf/filters";

/**
 * MusicGameConsolidatedModule - Single module for the entire music game
 *
 * This module consolidates all game functionality into one place, eliminating
 * the complexity of multiple fragmented modules and circular dependencies.
 *
 * All game commands and actions flow through this single module, making
 * the code much easier to understand and maintain.
 */
@injectable()
export class MusicGameModule extends Composer<IBotContext> {
  private actions = new ActionHelper<CallbackQueryContext>();

  constructor(
    @inject(TYPES.MusicGameService) private musicGameService: MusicGameService,
  ) {
    super();

    // Game lifecycle commands
    this.command("music_game", this.handleMusicGame.bind(this));
    this.command("music_lobby", this.handleMusicLobby.bind(this));
    this.command("music_start", this.handleMusicStart.bind(this));
    this.command("music_end", this.handleMusicEnd.bind(this));
    this.command("music_info", this.handleMusicInfo.bind(this));
    this.command("music_list", this.handleMusicList.bind(this));
    this.command("music_players", this.handleMusicPlayers.bind(this));
    this.command("music_stats", this.handleMusicStats.bind(this));
    this.command("music_ping", this.handleMusicPing.bind(this));

    // ==================== REGISTER ACTIONS ====================

    this.actions.handle("game_start", async (ctx) => {
      await this.musicGameService.startGame(ctx);
    });

    this.actions.handle("guess", async (ctx, roundId, guessedUserId) => {
      await this.musicGameService.processGuess(
        ctx,
        parseInt(roundId),
        parseInt(guessedUserId),
      );
    });

    this.actions.handle("round_hint", async (ctx, roundId) => {
      if (ctx.chat) {
        await this.musicGameService.showHint(ctx, ctx.chat.id);
      }
    });

    this.actions.handle("round_replay", async (ctx, roundId) => {
      if (ctx.chat) {
        await this.musicGameService.replayCurrentRound(ctx, ctx.chat.id);
      }
    });

    this.actions.handle("round_skip", async (ctx, roundId) => {
      if (ctx.chat) {
        await this.musicGameService.skipCurrentRound(ctx, ctx.chat.id);
      }
    });

    this.actions.handle("round_reveal", async (ctx, roundId) => {
      if (ctx.chat) {
        await this.musicGameService.revealCurrentRound(ctx, ctx.chat.id);
      }
    });

    this.actions.handle("lobby", async (ctx, action) => {
      await this.handleLobbyAction(ctx, action);
    });

    // One dispatcher for all callback queries
    this.on(callbackQuery("data"), async (ctx) => {
      const handled = await this.actions.dispatch(ctx);
      if (!handled) {
        await ctx.answerCbQuery("Unknown action");
      } else {
        await ctx.answerCbQuery();
      }
    });
  }

  // ==================== COMMAND HANDLERS ====================

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleMusicGame(ctx: CommandContext) {
    await this.musicGameService.initiateGameSetup(ctx);
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleMusicLobby(ctx: CommandContext) {
    await this.renderLobby(ctx);
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleMusicStart(ctx: CommandContext) {
    await this.musicGameService.startGame(ctx);
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleMusicEnd(ctx: CommandContext) {
    await this.musicGameService.endGame(ctx);
  }

  private async handleMusicInfo(ctx: CommandContext) {
    await this.musicGameService.showActiveGameInfo(ctx);
  }

  private async handleMusicList(ctx: CommandContext) {
    await this.musicGameService.listGames(ctx);
  }

  private async handleMusicPlayers(ctx: CommandContext) {
    await this.musicGameService.listPlayers(ctx);
  }

  private async handleMusicStats(ctx: CommandContext) {
    await this.musicGameService.getGameStats(ctx);
  }

  private async handleMusicPing(ctx: CommandContext) {
    await this.musicGameService.pingPlayers(ctx);
  }

  // ==================== LOBBY HANDLERS ====================

  private async renderLobby(ctx: IBotContext) {
    if (!ctx.chat) return;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "🎮 Start Game",
            callback_data: this.actions.encode("lobby", "start"),
          },
          {
            text: "⚙️ Settings",
            callback_data: this.actions.encode("lobby", "settings"),
          },
        ],
        [
          {
            text: "📊 Game Info",
            callback_data: this.actions.encode("lobby", "info"),
          },
          {
            text: "👥 Players",
            callback_data: this.actions.encode("lobby", "players"),
          },
        ],
      ],
    };

    await ctx.reply("🎵 Music Game Lobby\n\nChoose an option:", {
      reply_markup: keyboard,
    });
  }

  private async handleLobbyAction(ctx: CallbackQueryContext, action: string) {
    switch (action) {
      case "start":
        await this.musicGameService.startGame(ctx);
        break;
      case "settings":
        await ctx.reply("⚙️ Settings panel - coming soon!");
        break;
      case "info":
        await this.musicGameService.showActiveGameInfo(ctx);
        break;
      case "players":
        await ctx.reply("👥 Player management - coming soon!");
        break;
      default:
        await ctx.reply("Unknown action");
    }
  }
}
