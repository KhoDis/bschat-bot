import { message } from "telegraf/filters";
import { IBotContext } from "@/context/context.interface";
import { Composer, NarrowedContext } from "telegraf";
import { Message, Update } from "telegraf/types";
import { UserService } from "../services/UserService";
import { MusicGameService } from "../services/MusicGameService";
import { TextService } from "@/bot/services/TextService";

type MessageContext<T extends Message = Message> = NarrowedContext<
  IBotContext,
  Update.MessageUpdate<T>
>;
type AudioMessageContext = MessageContext<Message.AudioMessage>;
type AnyMediaMessageContext = MessageContext<
  | Message.AnimationMessage
  | Message.ContactMessage
  | Message.DiceMessage
  | Message.DocumentMessage
  | Message.GameMessage
  | Message.LocationMessage
  | Message.PhotoMessage
  | Message.PollMessage
  | Message.StickerMessage
  | Message.StoryMessage
  | Message.TextMessage
  | Message.VenueMessage
  | Message.VideoMessage
  | Message.VideoNoteMessage
  | Message.VoiceMessage
>;

export class PrivateComposer extends Composer<IBotContext> {
  constructor(
    private readonly userService: UserService,
    private readonly musicGuessService: MusicGameService,
    private readonly text: TextService,
  ) {
    super();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.on(message("audio"), this.handleAudioMessage.bind(this));
    this.on(
      [
        message("animation"),
        message("contact"),
        message("dice"),
        message("document"),
        message("game"),
        message("location"),
        message("photo"),
        message("poll"),
        message("sticker"),
        message("story"),
        message("text"),
        message("venue"),
        message("video"),
        message("video_note"),
        message("voice"),
      ],
      this.handleHintMessage.bind(this),
    );
  }

  private async handleHintMessage(ctx: AnyMediaMessageContext): Promise<void> {
    const submission = await this.userService.getSubmissionByUserId(
      ctx.from.id,
    );

    if (!submission) {
      await ctx.reply(this.text.get("preparation.trackNotFound"));
      return;
    }

    await this.musicGuessService.addMediaHint(
      submission.id,
      ctx.message.message_id,
    );

    await ctx.reply(this.text.get("preparation.hintSent"));
  }

  private async handleAudioMessage(ctx: AudioMessageContext): Promise<void> {
    await this.saveUser(ctx);
    await this.processAudioSubmission(ctx);
  }

  private async saveUser(ctx: AudioMessageContext): Promise<void> {
    await this.userService.saveOrUpdateUser({
      id: ctx.from.id,
      username: ctx.from.username || null,
      firstName: ctx.from.first_name,
    });
  }

  private async processAudioSubmission(
    ctx: AudioMessageContext,
  ): Promise<void> {
    const userId = ctx.from.id;
    const fileId = ctx.message.audio.file_id;

    if (!this.isValidSubmission(userId, fileId)) {
      await ctx.reply(
        this.text.get("preparation.trackInvalid", { userId, fileId }),
      );
      return;
    }

    await this.userService.saveOrUpdateSubmission({
      userId,
      fileId,
    });

    await ctx.reply(this.text.get("preparation.trackSent"));
  }

  private isValidSubmission(userId: number, fileId: string): boolean {
    return Boolean(userId && fileId);
  }
}
