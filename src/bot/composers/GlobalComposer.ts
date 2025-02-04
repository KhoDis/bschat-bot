import { IBotContext } from "../../context/context.interface";
import { Composer, NarrowedContext } from "telegraf";
import { UserService } from "../services/UserService";
import { BotResponses, getRandomResponse } from "../../config/botResponses";
import { LeaderboardService } from "../services/LeaderboardService";
import { Update } from "telegraf/types";

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
    this.command("check_music", this.handleCheckMusic.bind(this));

    this.command("show_leaderboards", this.handleShowLeaderboard.bind(this));

    this.command("ping_participants", this.handlePingParticipants.bind(this));

    this.command("chatid", this.handleChatId.bind(this));
  }

  private async handleCheckMusic(ctx: IBotContext): Promise<void> {
    const submissionUsers = await this.userService.getSubmissionUsers();
    // TODO: instead of doing this, findMany with joins, so we can get the names
    const formattedUsers: (string | null)[] = await Promise.all(
      submissionUsers.map((u) => this.userService.getFormattedUser(u.id)),
    );
    const users = formattedUsers.filter((u): u is string => u !== null);

    await ctx.reply(
      getRandomResponse(this.botResponses.musicGame.listPlayers(users)),
    );
  }

  private async handleShowLeaderboard(ctx: IBotContext): Promise<void> {
    await this.leaderboardService.showLeaderboard(ctx);
  }

  private async handlePingParticipants(ctx: IBotContext): Promise<void> {
    await this.userService.pingParticipants(ctx);
  }

  private async handleChatId(
    ctx: NarrowedContext<IBotContext, Update.MessageUpdate>,
  ): Promise<void> {
    await ctx.reply(JSON.stringify(ctx.chat.id));
  }
}
