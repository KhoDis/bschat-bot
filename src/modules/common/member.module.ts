import { Composer } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { MemberService } from "@/modules/common/member.service";
import { TextService } from "@/modules/common/text.service";
import { inject, injectable } from "inversify";
import { CommandContext, TYPES } from "@/types";

// TODO: add @Group decorator (class-scoped or function-scoped)
@injectable()
export class MemberModule extends Composer<IBotContext> {
  constructor(
    @inject(TYPES.MemberService) private memberService: MemberService,
    @inject(TYPES.TextService) private text: TextService,
  ) {
    super();

    this.command("joinbs", this.handleJoin.bind(this));
  }

  private async handleJoin(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id;
    let userId = ctx.from.id;
    let username = ctx.from.username || null;
    let firstName = ctx.from.first_name;

    if (ctx.chat.type === "private") {
      await ctx.reply("member.groupOnly");
      return;
    }

    // Check reply of the context
    if (ctx.message.reply_to_message && ctx.message.reply_to_message.from) {
      userId = ctx.message.reply_to_message.from.id;
      username = ctx.message.reply_to_message.from.username || null;
      firstName = ctx.message.reply_to_message.from.first_name;
    }

    // Sync user and chat
    await this.memberService.upsertUser({
      id: userId,
      username: username,
      firstName: firstName,
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
}
