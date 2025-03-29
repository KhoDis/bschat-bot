import { IBotContext } from "@/context/context.interface";
import { Composer, NarrowedContext } from "telegraf";
import { LeaderboardService } from "../services/LeaderboardService";
import { Update } from "telegraf/types";
import { inject, injectable } from "inversify";
import { CommandContext, TYPES } from "@/types";
import { TextService } from "@/bot/services/TextService";

@injectable()
export class GlobalComposer extends Composer<IBotContext> {
  constructor(
    @inject(TYPES.LeaderboardService)
    private leaderboardService: LeaderboardService,
    @inject(TYPES.TextService) private text: TextService,
  ) {
    super();

    this.setupHandlers();
  }

  private setupHandlers() {
    this.command("show_leaderboards", this.handleShowLeaderboard.bind(this));

    this.command("chatid", this.handleChatId.bind(this));
  }

  private async handleShowLeaderboard(ctx: CommandContext): Promise<void> {
    const response = await this.leaderboardService.showLeaderboard(ctx.chat.id);
    await ctx.reply(response ?? this.text.get("gameState.noGame"));
  }

  private async handleChatId(
    ctx: NarrowedContext<IBotContext, Update.MessageUpdate>,
  ): Promise<void> {
    await ctx.reply(JSON.stringify(ctx.chat.id));
  }
}
