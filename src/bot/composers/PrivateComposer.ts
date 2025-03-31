import { message } from "telegraf/filters";
import { IBotContext } from "@/context/context.interface";
import { Composer, NarrowedContext } from "telegraf";
import { Message, Update } from "telegraf/types";
import { MemberService } from "../services/MemberService";
import { TextService } from "@/bot/services/TextService";
import { inject, injectable } from "inversify";
import { CallbackQueryContext, CommandContext, TYPES } from "@/types";
import { callbackData } from "@/utils/filters";

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

@injectable()
export class PrivateComposer extends Composer<IBotContext> {
  constructor(
    @inject(TYPES.MemberService) private readonly memberService: MemberService,
    @inject(TYPES.TextService) private readonly text: TextService,
  ) {
    super();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.command("start", this.handleStartCommand.bind(this)); // Chat selection command
    this.on(
      callbackData(/^chat_select_(.+)$/),
      this.handleChatSelectAction.bind(this),
    ); // Handle chat selection via inline buttons
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

  // Handle /start command to allow users to select a chat
  private async handleStartCommand(ctx: CommandContext): Promise<void> {
    const chats = await this.memberService.getChatsByUserId(ctx.from.id); // Fetch the chats the user is part of

    if (chats.length === 0) {
      await ctx.reply(this.text.get("chat.noChats"));
      return;
    }

    // Create inline keyboard buttons for chat selection
    const buttons = chats.map((chat) => ({
      text: chat.title || `Chat ${Number(chat.id)}`,
      callback_data: `chat_select_${Number(chat.id)}`,
    }));

    await ctx.reply(this.text.get("chat.chooseChat"), {
      reply_markup: {
        inline_keyboard: buttons.map((button) => [button]), // Display each chat as a separate button
      },
    });
  }

  // Handle chat selection and store it in the session
  private async handleChatSelectAction(
    ctx: CallbackQueryContext,
  ): Promise<void> {
    const action = ctx.callbackQuery.data.split("_")[2];
    if (!action) {
      await ctx.reply(this.text.get("chat.invalidSelection"));
      return;
    }
    const chatId = parseInt(action, 10);

    // Check if the chat is valid for the user
    const chats = await this.memberService.getChatsByUserId(ctx.from.id);
    const selectedChat = chats.find((chat) => Number(chat.id) === chatId);

    if (!selectedChat) {
      await ctx.reply(this.text.get("chat.invalidSelection"));
      return;
    }

    // Store selected chat in the session
    ctx.session.selectedChatId = chatId;
    await ctx.reply(this.text.get("chat.chatSelected", { chatId }));
  }

  private async handleHintMessage(ctx: AnyMediaMessageContext): Promise<void> {
    const chatId = ctx.session.selectedChatId;
    if (!chatId) {
      await ctx.reply(this.text.get("chat.noChatSelected"));
      return;
    }

    const submission = await this.memberService.getSubmission(
      ctx.from.id,
      chatId,
    );
    if (!submission) {
      await ctx.reply(this.text.get("chat.trackNotFound"));
      return;
    }

    await this.memberService.addMusicHint(
      ctx.from.id,
      chatId,
      ctx.message.chat.id,
      ctx.message.message_id,
    );

    await ctx.reply(this.text.get("chat.hintSent"));
  }

  // Handle audio submission
  private async handleAudioMessage(ctx: AudioMessageContext): Promise<void> {
    const chatId = ctx.session.selectedChatId; // Get selected chat from the session
    if (!chatId) {
      await ctx.reply(this.text.get("chat.noChatSelected"));
      return;
    }

    const userId = ctx.from.id;
    const exists = await this.memberService.existsMember(userId, chatId);
    if (!exists) {
      await ctx.reply(this.text.get("chat.notAMember", { userId, chatId }));
      return;
    }

    await this.processAudioSubmission(ctx, chatId);
  }

  private async processAudioSubmission(
    ctx: AudioMessageContext,
    chatId: number,
  ): Promise<void> {
    const userId = ctx.from.id;
    const fileId = ctx.message.audio.file_id;

    if (!this.isValidSubmission(userId, fileId)) {
      await ctx.reply(this.text.get("chat.trackInvalid", { userId, fileId }));
      return;
    }

    await this.memberService.saveSubmission({
      userId,
      chatId,
      fileId,
    });

    await ctx.reply(this.text.get("chat.trackSent"));
  }

  private isValidSubmission(userId: number, fileId: string): boolean {
    return Boolean(userId && fileId);
  }
}
