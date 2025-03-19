import { Composer, Context } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { UserService } from "@/bot/services/UserService";
import { TextService } from "@/bot/services/TextService";
import { inject, injectable } from "inversify";
import { TYPES } from "@/types";

// TODO: add @Group decorator (class-scoped or function-scoped)
@injectable()
export class ParticipantComposer extends Composer<IBotContext> {
  constructor(
    @inject(TYPES.UserService) private userService: UserService,
    @inject(TYPES.TextService) private text: TextService,
  ) {
    super();

    this.command("ping_participants", this.handlePingParticipants.bind(this));
    this.command("check_music", this.handleCheckMusic.bind(this));
  }

  async handlePingParticipants(ctx: Context): Promise<void> {
    const users = await this.userService.getSubmissionUsers();

    if (!users.length) {
      await ctx.reply("Никого нет, как я игру то начну :(");
      return;
    }

    this.userService.formatPingNames(users).forEach((batch) => {
      ctx.replyWithMarkdown(batch);
    });
  }

  private async handleCheckMusic(ctx: IBotContext): Promise<void> {
    const submissionUsers = await this.userService.getSubmissionUsers();

    if (!submissionUsers.length) {
      await ctx.reply("Никого нет, как я игру то начну :(");
      return;
    }

    const users = this.userService.formatPingNames(submissionUsers).join("\n");

    await ctx.reply(
      this.text.get("musicGame.listPlayers", {
        playersCount: submissionUsers.length,
        playersList: users,
      }),
      {
        parse_mode: "Markdown",
        disable_notification: true,
      },
    );
  }
}
