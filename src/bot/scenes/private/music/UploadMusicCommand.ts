import { NarrowedContext } from "telegraf";
import { Update, Message } from "telegraf/typings/core/types/typegram";
import { IBotContext } from "../../../../context/context.interface";
import { UserService } from "../../../services/UserService";
import { AudioCommand } from "../../../temp/Commands";

class UploadMusicCommand extends AudioCommand {
  constructor(private userService: UserService) {
    super();
  }

  public override async execute(
    ctx: NarrowedContext<
      IBotContext,
      Update.MessageUpdate<Record<"audio", {}> & Message.AudioMessage>
    >
  ): Promise<void> {
    // Save User
    await this.userService.saveOrUpdateUser({
      id: ctx.from.id,
      username: ctx.from.username || null,
      firstName: ctx.from.first_name,
    });

    const userId = ctx.from.id;
    const fileId = ctx.message.audio.file_id;

    if (!userId || !fileId) {
      await ctx.reply(
        `Что-то пошло не так :(, попробуйте ещё. Отправьте это сообщение @khodis:\nuserId: ${userId}, fileId: ${fileId}`
      );
      return;
    }

    await this.userService.saveOrUpdateSubmission({
      userId,
      fileId,
    });

    await ctx.reply("Спасибо за трек! Ждите эвент :)");
  }
}

export default UploadMusicCommand;
