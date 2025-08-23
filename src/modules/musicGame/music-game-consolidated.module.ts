import { Composer } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { inject, injectable } from "inversify";
import { TYPES } from "@/types";
import { MusicGameService } from "./music-game.service";
import { RequirePermission } from "@/modules/permissions/require-permission.decorator";

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
export class MusicGameConsolidatedModule extends Composer<IBotContext> {
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

    // Game action handlers
    this.action(/^game:start$/, this.handleGameStart.bind(this));
    this.action(/^guess:(.+)_(.+)$/, this.handleGuess.bind(this));
    this.action(/^round:hint:(.+)$/, this.handleRoundHint.bind(this));
    this.action(/^round:replay:(.+)$/, this.handleRoundReplay.bind(this));
    this.action(/^round:skip:(.+)$/, this.handleRoundSkip.bind(this));
    this.action(/^round:reveal:(.+)$/, this.handleRoundReveal.bind(this));

    // Lobby action handlers
    this.action(/^lobby:(.+)$/, this.handleLobbyAction.bind(this));
  }

  // ==================== COMMAND HANDLERS ====================

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleMusicGame(ctx: IBotContext) {
    await this.musicGameService.initiateGameSetup(ctx as any);
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleMusicLobby(ctx: IBotContext) {
    // This will be handled by the lobby action handler
    await this.renderLobby(ctx);
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleMusicStart(ctx: IBotContext) {
    await this.musicGameService.startGame(ctx);
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleMusicEnd(ctx: IBotContext) {
    await this.musicGameService.endGame(ctx);
  }

  private async handleMusicInfo(ctx: IBotContext) {
    console.log("handleMusicInfo", ctx);
    await this.musicGameService.showActiveGameInfo(ctx as any);
  }

  private async handleMusicList(ctx: IBotContext) {
    await this.musicGameService.listGames(ctx as any);
  }

  private async handleMusicPlayers(ctx: IBotContext) {
    // This functionality will be added to the MusicGameService
    await ctx.reply("Функция в разработке");
  }

  // ==================== ACTION HANDLERS ====================

  private async handleGameStart(ctx: IBotContext) {
    await this.musicGameService.startGame(ctx);
  }

  private async handleGuess(ctx: IBotContext) {
    const data = (ctx.callbackQuery as any)?.data as string;
    const [, roundId, guessedUserId] = data.split(":");

    if (!roundId || !guessedUserId) {
      await ctx.answerCbQuery("Invalid guess data");
      return;
    }

    await this.musicGameService.processGuess(
      ctx as any,
      parseInt(roundId),
      parseInt(guessedUserId),
    );
  }

  private async handleRoundHint(ctx: IBotContext) {
    const data = (ctx.callbackQuery as any)?.data as string;
    const [, , roundId] = data.split(":");

    if (ctx.chat) {
      await this.musicGameService.showHint(ctx, ctx.chat.id);
    }
    await ctx.answerCbQuery();
  }

  private async handleRoundReplay(ctx: IBotContext) {
    // This functionality will be added to the MusicGameService
    await ctx.answerCbQuery("Функция в разработке");
  }

  private async handleRoundSkip(ctx: IBotContext) {
    // This functionality will be added to the MusicGameService
    await ctx.answerCbQuery("Функция в разработке");
  }

  private async handleRoundReveal(ctx: IBotContext) {
    // This functionality will be added to the MusicGameService
    await ctx.answerCbQuery("Функция в разработке");
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

  private async handleLobbyAction(ctx: IBotContext) {
    const data = (ctx.callbackQuery as any)?.data as string;
    const [, action] = data.split(":");

    switch (action) {
      case "start":
        await this.musicGameService.startGame(ctx);
        break;
      case "settings":
        await ctx.reply("⚙️ Settings panel - coming soon!");
        break;
      case "info":
        await this.musicGameService.showActiveGameInfo(ctx as any);
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
