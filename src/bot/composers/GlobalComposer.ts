import { IBotContext } from "@/context/context.interface";
import { Composer, NarrowedContext } from "telegraf";
import { BotTemplates, getRandomResponse } from "@/config/botTemplates";
import { LeaderboardService } from "../services/LeaderboardService";
import { Update } from "telegraf/types";

export class GlobalComposer extends Composer<IBotContext> {
  constructor(
    private leaderboardService: LeaderboardService,
    private botResponses: BotTemplates,
  ) {
    super();

    this.setupHandlers();
  }

  private setupHandlers() {
    this.command("show_leaderboards", this.handleShowLeaderboard.bind(this));

    this.command("chatid", this.handleChatId.bind(this));
  }

  private async handleShowLeaderboard(ctx: IBotContext): Promise<void> {
    const response = await this.leaderboardService.showLeaderboard();
    await ctx.reply(
      response ?? getRandomResponse(this.botResponses.gameState.noGame),
    );
  }

  private async handleChatId(
    ctx: NarrowedContext<IBotContext, Update.MessageUpdate>,
  ): Promise<void> {
    await ctx.reply(JSON.stringify(ctx.chat.id));
  }
}
