import { Composer } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { inject, injectable } from "inversify";
import { CallbackQueryContext, CommandContext, TYPES } from "@/types";
import { MusicGameService } from "./music-game.service";
import { RequirePermission } from "@/modules/permissions/require-permission.decorator";
import { dataAction } from "@/utils/filters";

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

    // Game action handlers
    this.on(dataAction(/^game:start$/), this.handleGameStart.bind(this));
    this.on(dataAction(/^guess:(.+)_(.+)$/), this.handleGuess.bind(this));
    this.on(dataAction(/^round:hint:(.+)$/), this.handleRoundHint.bind(this));
    this.on(
      dataAction(/^round:replay:(.+)$/),
      this.handleRoundReplay.bind(this),
    );
    this.on(dataAction(/^round:skip:(.+)$/), this.handleRoundSkip.bind(this));
    this.on(
      dataAction(/^round:reveal:(.+)$/),
      this.handleRoundReveal.bind(this),
    );

    // Lobby action handlers
    this.on(dataAction(/^lobby:(.+)$/), this.handleLobbyAction.bind(this));
  }

  // ==================== COMMAND HANDLERS ====================

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleMusicGame(ctx: CommandContext) {
    await this.musicGameService.initiateGameSetup(ctx);
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleMusicLobby(ctx: CommandContext) {
    // This will be handled by the lobby action handler
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

  // ==================== ACTION HANDLERS ====================

  private async handleGameStart(ctx: IBotContext) {
    await this.musicGameService.startGame(ctx);
  }

  private async handleGuess(ctx: CallbackQueryContext) {
    const data = ctx.callbackQuery.data as string;
    const [, roundId, guessedUserId] = data.split(":");

    if (!roundId || !guessedUserId) {
      await ctx.answerCbQuery("Invalid guess data");
      return;
    }

    await this.musicGameService.processGuess(
      ctx,
      parseInt(roundId),
      parseInt(guessedUserId),
    );
  }

  private async handleRoundHint(ctx: CallbackQueryContext) {
    const data = ctx.callbackQuery.data as string;
    const [, , roundId] = data.split(":");

    if (ctx.chat) {
      await this.musicGameService.showHint(ctx, ctx.chat.id);
    }
    await ctx.answerCbQuery();
  }

  private async handleRoundReplay(ctx: CallbackQueryContext) {
    const data = ctx.callbackQuery.data as string;
    const [, , roundId] = data.split(":");

    if (ctx.chat) {
      await this.musicGameService.replayCurrentRound(ctx, ctx.chat.id);
    }
    await ctx.answerCbQuery();
  }

  private async handleRoundSkip(ctx: CallbackQueryContext) {
    const data = ctx.callbackQuery.data as string;
    const [, , roundId] = data.split(":");

    if (ctx.chat) {
      await this.musicGameService.skipCurrentRound(ctx, ctx.chat.id);
    }
    await ctx.answerCbQuery();
  }

  private async handleRoundReveal(ctx: CallbackQueryContext) {
    const data = ctx.callbackQuery.data as string;
    const [, , roundId] = data.split(":");

    if (ctx.chat) {
      await this.musicGameService.revealCurrentRound(ctx, ctx.chat.id);
    }
    await ctx.answerCbQuery();
  }

  // ==================== LOBBY HANDLERS ====================

  private async renderLobby(ctx: IBotContext) {
    if (!ctx.chat) return;

    // Simple lobby interface - can be enhanced later
    const keyboard = {
      inline_keyboard: [
        [
          { text: "🎮 Start Game", callback_data: "lobby:start" },
          { text: "⚙️ Settings", callback_data: "lobby:settings" },
        ],
        [
          { text: "📊 Game Info", callback_data: "lobby:info" },
          { text: "👥 Players", callback_data: "lobby:players" },
        ],
      ],
    };

    await ctx.reply("🎵 Music Game Lobby\n\nChoose an option:", {
      reply_markup: keyboard,
    });
  }

  private async handleLobbyAction(ctx: CallbackQueryContext) {
    const data = ctx.callbackQuery.data as string;
    const [, action] = data.split(":");

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

    await ctx.answerCbQuery();
  }
}
