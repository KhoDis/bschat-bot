import { Composer, Markup } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { inject, injectable } from "inversify";
import { TYPES } from "@/types";
import { LobbyService } from "./lobby.service";
import { RequirePermission } from "@/modules/permissions/require-permission.decorator";
import { GameService } from "@/modules/musicGame/game/game.service";

@injectable()
export class LobbyModule extends Composer<IBotContext> {
  constructor(
    @inject(TYPES.LobbyService) private lobby: LobbyService,
    @inject(TYPES.GameService) private gameService: GameService,
  ) {
    super();

    this.command("music_lobby", this.handleOpenLobby.bind(this));
    this.action(/^lobby:(.+)$/, this.handleAction.bind(this));
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleOpenLobby(ctx: IBotContext) {
    if (!ctx.chat) return;
    await this.renderLobby(ctx, ctx.chat.id);
  }

  private async renderLobby(ctx: IBotContext, chatId: number) {
    const cfg = this.lobby.getDraft(chatId);
    const summary = [
      `⏱️ Hint delay: ${cfg.hintDelaySec}s`,
      `⏭️ Auto-advance: ${cfg.autoAdvance ? "On" : "Off"}`,
      `⏳ Advance delay: ${cfg.advanceDelaySec}s`,
      `🙅 Self-guess: ${cfg.allowSelfGuess ? "Allowed" : "Blocked"}`,
      `🔀 Shuffle: ${cfg.shuffle ? "On" : "Off"}`,
      `🏁 Scoring: ${cfg.scoringPreset}`,
    ].join("\n");

    const kb = Markup.inlineKeyboard([
      [
        Markup.button.callback("-10s", `lobby:hint:-10`),
        Markup.button.callback(`Hint ${cfg.hintDelaySec}s`, `noop`),
        Markup.button.callback("+10s", `lobby:hint:+10`),
      ],
      [
        Markup.button.callback(
          cfg.autoAdvance ? "Auto ⏭️ On" : "Auto ⏭️ Off",
          `lobby:auto:${cfg.autoAdvance ? "off" : "on"}`,
        ),
      ],
      [
        Markup.button.callback("-10s", `lobby:adv:-10`),
        Markup.button.callback(`Advance ${cfg.advanceDelaySec}s`, `noop`),
        Markup.button.callback("+10s", `lobby:adv:+10`),
      ],
      [
        Markup.button.callback(
          cfg.allowSelfGuess ? "Self ✔" : "Self ✖",
          `lobby:self:${cfg.allowSelfGuess ? "off" : "on"}`,
        ),
        Markup.button.callback(
          cfg.shuffle ? "Shuffle 🔀" : "Order",
          `lobby:shuffle:toggle`,
        ),
        Markup.button.callback(
          `Scoring: ${cfg.scoringPreset}`,
          `lobby:score:cycle`,
        ),
      ],
      [Markup.button.callback("Start Game", `lobby:start`)],
    ]);

    await ctx.reply(`🎮 Music Game Lobby\n\n${summary}`, kb);
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  private async handleAction(ctx: IBotContext) {
    if (!ctx.chat) return;
    const data = (ctx.callbackQuery as any)?.data as string;
    const [, action, value] = data.split(":");

    const chatId = ctx.chat.id;
    const cfg = this.lobby.getDraft(chatId);
    switch (action) {
      case "hint": {
        const delta = value === "+10" ? 10 : -10;
        const next = Math.max(0, cfg.hintDelaySec + delta);
        this.lobby.updateDraft(chatId, { hintDelaySec: next });
        break;
      }
      case "auto": {
        this.lobby.updateDraft(chatId, { autoAdvance: value === "on" });
        break;
      }
      case "adv": {
        const delta = value === "+10" ? 10 : -10;
        const next = Math.max(0, cfg.advanceDelaySec + delta);
        this.lobby.updateDraft(chatId, { advanceDelaySec: next });
        break;
      }
      case "self": {
        this.lobby.updateDraft(chatId, { allowSelfGuess: value === "on" });
        break;
      }
      case "shuffle": {
        this.lobby.updateDraft(chatId, { shuffle: !cfg.shuffle });
        break;
      }
      case "score": {
        const order = ["classic", "aggressive", "gentle"] as const;
        const idx = order.indexOf(cfg.scoringPreset);
        const next = order[(idx + 1) % order.length]!;
        this.lobby.updateDraft(chatId, { scoringPreset: next });
        break;
      }
      case "start": {
        await this.gameService.startGameWithConfig(
          ctx,
          this.lobby.getDraft(chatId),
        );
        this.lobby.clearDraft(chatId);
        break;
      }
      default:
        break;
    }

    await ctx.answerCbQuery();
    await this.renderLobby(ctx, chatId);
  }
}
