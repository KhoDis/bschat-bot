import { Composer } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { MemberService } from "@/bot/services/MemberService";
import { TextService } from "@/bot/services/TextService";
import { inject, injectable } from "inversify";
import { CommandContext, TYPES } from "@/types";

// TODO: add @Group decorator (class-scoped or function-scoped)
@injectable()
export class ParticipantComposer extends Composer<IBotContext> {
  constructor(
    @inject(TYPES.MemberService) private memberService: MemberService,
    @inject(TYPES.TextService) private text: TextService,
  ) {
    super();

    this.command("ping_participants", this.handlePingParticipants.bind(this));
    this.command("check_music", this.handleCheckMusic.bind(this));
    this.command("joinbs", this.handleJoin.bind(this));
  }

  private async handleJoin(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id;
    let userId = ctx.from.id;

    if (ctx.chat.type === "private") {
      await ctx.reply("member.groupOnly");
      return;
    }

    // Check reply of the context
    if (ctx.message.reply_to_message && ctx.message.reply_to_message.from) {
      userId = ctx.message.reply_to_message.from.id;
    }

    // Sync user and chat
    await this.memberService.upsertUser({
      id: userId,
      username: ctx.from.username || null,
      firstName: ctx.from.first_name,
    });
    await this.memberService.upsertChat({
      id: chatId,
      title: ctx.chat.title,
    });
    if (await this.memberService.existsMember(userId, chatId)) {
      await ctx.reply(this.text.get("member.alreadyJoined", { name: userId }));
      return;
    }
    await this.memberService.addMember(userId, chatId);
    await ctx.reply(this.text.get("member.joined", { name: userId }));
  }

  async handlePingParticipants(ctx: CommandContext): Promise<void> {
    const users = await this.memberService.getSubmissionUsers(ctx.chat.id);

    if (!users.length) {
      await ctx.reply("musicGame.noPlayers");
      return;
    }

    this.memberService.formatPingNames(users).forEach((batch) => {
      ctx.replyWithMarkdown(batch);
    });
  }

  private async handleCheckMusic(ctx: CommandContext): Promise<void> {
    const submissionUsers = await this.memberService.getSubmissionUsers(
      ctx.chat.id,
    );

    if (!submissionUsers.length) {
      await ctx.reply("musicGame.noPlayers");
      return;
    }

    const users = this.memberService
      .formatPingNames(submissionUsers)
      .join("\n");

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
