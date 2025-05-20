import { IBotContext } from "@/context/context.interface";
import { Composer, NarrowedContext } from "telegraf";
import { Update } from "telegraf/types";
import { inject, injectable } from "inversify";
import { CommandContext, TYPES } from "@/types";
import { TextService } from "@/modules/common/text.service";
import { LeaderboardService } from "@/modules/musicGame/leaderboard/leaderboard.service";

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
    this.command("chatid", this.handleChatId.bind(this));
    this.command("polls", this.handleShortPoll.bind(this));
    this.command("pollf", this.handleFullPoll.bind(this));
  }

  private async handleChatId(
    ctx: NarrowedContext<IBotContext, Update.MessageUpdate>,
  ): Promise<void> {
    await ctx.reply(JSON.stringify(ctx.chat.id));
  }

  private async handleShortPoll(ctx: CommandContext): Promise<void> {
    const text = ctx.message.text.replace(/^\/polls\s*/i, "").trim();
    if (!text) {
      await ctx.reply("Please provide a poll title after /polls command");
      return;
    }

    try {
      await ctx.replyWithPoll(text, ["да", "хз", "нет", "тык"], {
        is_anonymous: false,
      });
    } catch (error) {
      console.error("Error creating short poll:", error);
      await ctx.reply("Failed to create the poll");
    }
  }

  private async handleFullPoll(ctx: CommandContext): Promise<void> {
    const text = ctx.message.text.replace(/^\/pollf\s*/i, "").trim();
    if (!text) {
      await ctx.reply("Please provide a poll title after /pollf command");
      return;
    }

    try {
      await ctx.replyWithPoll(
        text,
        ["да", "наверно да", "хз", "наверно нет", "нет", "тык"],
        { is_anonymous: false },
      );
    } catch (error) {
      console.error("Error creating full poll:", error);
      await ctx.reply("Failed to create the poll");
    }
  }
}
