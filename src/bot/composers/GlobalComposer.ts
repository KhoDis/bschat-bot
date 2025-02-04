import { message } from "telegraf/filters";
import { IBotContext } from "../../context/context.interface";
import { Composer } from "telegraf";
import { UserService } from "../services/UserService";
import handleCheckMusic from "../handlers/handleCheckMusic";
import { BotResponses, getRandomResponse } from "../../config/botResponses";
import { LeaderboardService } from "../services/LeaderboardService";

export class GlobalComposer extends Composer<IBotContext> {
  constructor(
    private userService: UserService,
    private leaderboardService: LeaderboardService,
    private botResponses: BotResponses,
  ) {
    super();

    this.setupHandlers();
  }

  private setupHandlers() {
    this.command("check_music", async (ctx) => {
      await ctx.reply(
        "О, давайте проверим музыку! Я просто в восторге от перспективы...",
      );
      await handleCheckMusic(ctx, this.userService);
    });

    this.command("show_leaderboards", async (ctx) => {
      await this.leaderboardService.showLeaderboard(ctx);
    });

    this.command("ping_participants", async (ctx) => {
      await this.userService.pingParticipants(ctx);
    });

    this.command("chatid", async (ctx) => {
      await ctx.reply(JSON.stringify(ctx.chat.id));
    });
  }
}
