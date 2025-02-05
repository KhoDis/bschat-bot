import { message } from "telegraf/filters";
import { IBotContext } from "../../context/context.interface";
import { Composer, NarrowedContext } from "telegraf";
import { Message, Update } from "telegraf/types";
import { UserService } from "../services/UserService";
import { BotResponses, getRandomResponse } from "../../config/botResponses";
import { MusicGameService } from "../services/musicGameService";

type MessageContext<T extends Message = Message> = NarrowedContext<
  IBotContext,
  Update.MessageUpdate<T>
>;
type AudioMessageContext = MessageContext<Message.AudioMessage>;
type TextMessageContext = MessageContext<Message.TextMessage>;

export class PrivateComposer extends Composer<IBotContext> {
  constructor(
    private readonly userService: UserService,
    private readonly musicGuessService: MusicGameService,
    private readonly _: BotResponses,
  ) {
    super();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.on(message("audio"), this.handleAudioMessage.bind(this));
    this.on(message("text"), this.handleTextMessage.bind(this));
  }

  private async handleAudioMessage(ctx: AudioMessageContext): Promise<void> {
    await this.saveUser(ctx);
    await this.processAudioSubmission(ctx);
  }

  private async handleTextMessage(ctx: TextMessageContext): Promise<void> {
    await this.processHintSubmission(ctx);
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
      await this.handleInvalidSubmission(ctx, userId, fileId);
      return;
    }

    await this.userService.saveOrUpdateSubmission({
      userId,
      fileId,
    });

    await ctx.reply(
      "Ого, ты отправил трек! А теперь попробуй написать к нему подсказку. Или не пиши. Мне-то что.",
    );
  }

  private isValidSubmission(userId: number, fileId: string): boolean {
    return Boolean(userId && fileId);
  }

  private async handleInvalidSubmission(
    ctx: AudioMessageContext,
    userId: number,
    fileId: string,
  ): Promise<void> {
    await ctx.reply(
      `Ой-ой, что-то сломалось. Может, это твоя карма? Ладно, напиши @khodis: userId: ${userId}, fileId: ${fileId}`,
    );
  }

  private async processHintSubmission(ctx: TextMessageContext): Promise<void> {
    const submission = await this.userService.getSubmissionByUserId(
      ctx.from.id,
    );

    if (!submission) {
      await this.handleSubmissionNotFound(ctx);
      return;
    }

    await this.musicGuessService.addHint(submission.id, ctx.message.text);
    await this.sendHintConfirmation(ctx);
  }

  private async handleSubmissionNotFound(
    ctx: TextMessageContext,
  ): Promise<void> {
    const errorResponses = [
      "Гениальный ход! Попытаться дать подсказку к треку, которого нет. Может, попробуешь сначала его загрузить?",
      "Ого, невидимый трек! Жаль, я ещё не научился считывать мысли. Попробуй отправить его по-настоящему.",
      "Ты пытаешься дать подсказку к воздуху? Интересный эксперимент! А теперь загрузи трек, как нормальные люди.",
      "Может, я, конечно, и волшебный бот, но даже мне нужен хотя бы намёк на музыку. Давай без фокусов, отправляй трек!",
    ];
    await ctx.reply(getRandomResponse(errorResponses));
  }

  private async sendHintConfirmation(ctx: TextMessageContext): Promise<void> {
    const successResponses = [
      "Подсказка сохранена! Надеюсь, она лучше, чем твои предыдущие попытки быть полезным.",
      "О, ты всё-таки придумал(а) подсказку! А я уже начал(а) терять надежду.",
      "Подсказка принята. Не то чтобы она была гениальной, но сойдёт.",
      "Ура! Теперь у нас есть подсказка. Осталось только найти кого-то, кто сможет её понять...",
    ];
    await ctx.reply(getRandomResponse(successResponses));
  }
}
