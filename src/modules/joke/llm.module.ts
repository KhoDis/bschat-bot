import { Composer, NarrowedContext } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { inject, injectable } from "inversify";
import { OpenAI } from "openai";
import { CommandContext, TYPES } from "@/types";
import { Message } from "telegraf/typings/core/types/typegram";
import { ChatCompletionMessageParam } from "openai/resources/chat";
import { Update } from "telegraf/types";
import { ConfigService } from "@/modules/common/config.service";

@injectable()
export class LlmModule extends Composer<IBotContext> {
  private openai: OpenAI;
  private availableModel = "nousresearch/deephermes-3-mistral-24b-preview:free";
  private conversationHistory = new Map<
    number,
    {
      messages: ChatCompletionMessageParam[];
      botMessageIds: number[];
      timeout?: NodeJS.Timeout;
    }
  >();

  constructor(
    @inject(TYPES.ConfigService) private readonly configService: ConfigService,
  ) {
    super();

    // Initialize OpenAI client for OpenRouter
    this.openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: this.configService.get("OPENROUTER_API_KEY"),
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    // Initial trigger handler
    this.hears(
      /^(бися|бисруз|ботяра)/i,
      this.handleTriggeredMessage.bind(this),
    );

    // Handle replies to bot messages
    this.on("message", async (ctx, next) => {
      const message = ctx.message as Message.TextMessage;
      const replyToMessage = message.reply_to_message;

      // Check if this is a reply to one of our bot's messages
      if (replyToMessage && message.text) {
        const chatId = ctx.chat.id;
        const conversation = this.conversationHistory.get(chatId);

        if (
          conversation &&
          conversation.botMessageIds.includes(replyToMessage.message_id)
        ) {
          // This is a reply to our bot, continue the conversation
          await this.handleConversationContinuation(ctx, message.text);
          return; // Don't call next() to prevent other handlers from processing
        }
      }

      // Not a reply to our bot, let other handlers process it
      await next();
    });
  }

  private async handleTriggeredMessage(ctx: CommandContext) {
    const text = ctx.message.text;
    const chatId = ctx.chat.id;

    try {
      await ctx.sendChatAction("typing");

      // Initialize conversation with system message
      const conversation = {
        messages: [
          {
            role: "system",
            content:
              "Тебя зовут Бися, Бисруз или Ботяра. Шути над пользователем, сарказм. Отвечай не как ИИ (с грамматикой и развёрнуто), а как человек (с опечатками, ошибками, без точек в конце, без грамматики и без структуры). Ответы должны быть короткими",
          },
          {
            role: "user",
            content: text,
          },
        ] as ChatCompletionMessageParam[],
        botMessageIds: [] as number[],
      };

      // Get response from LLM
      const completion = await this.openai.chat.completions.create({
        model: this.availableModel,
        messages: conversation.messages,
      });

      const responseText =
        completion.choices[0]?.message.content ||
        "Что-то пошло не так... как обычно";

      // Add assistant message to history
      conversation.messages.push({
        role: "assistant",
        content: responseText,
      });

      // Send message and save its ID
      const sentMessage = await ctx.reply(responseText);
      conversation.botMessageIds.push(sentMessage.message_id);

      // Store conversation history
      this.conversationHistory.set(chatId, conversation);

      // Clean up old conversations periodically
      this.scheduleConversationCleanup(chatId);
    } catch (error) {
      console.error("OpenRouter API error:", error);
      await ctx.reply("Ой, я сломался... Попробуй ещё раз, может починюсь");
    }
  }

  private async handleConversationContinuation(
    ctx: NarrowedContext<IBotContext, Update.MessageUpdate<Message>>,
    text: string,
  ) {
    const chatId = ctx.chat.id;
    const conversation = this.conversationHistory.get(chatId);

    if (!conversation) return;

    try {
      await ctx.sendChatAction("typing");

      // Add user message to conversation history
      conversation.messages.push({
        role: "user",
        content: text,
      });

      // Get response from LLM with full conversation history
      const completion = await this.openai.chat.completions.create({
        model: this.availableModel,
        messages: conversation.messages,
      });

      const responseText =
        completion.choices[0]?.message.content ||
        "Что-то пошло не так... как обычно";

      // Add assistant response to history
      conversation.messages.push({
        role: "assistant",
        content: responseText,
      });

      // Send response and track message ID
      const sentMessage = await ctx.reply(responseText);
      conversation.botMessageIds.push(sentMessage.message_id);

      // Update conversation in storage
      this.conversationHistory.set(chatId, conversation);

      // Reset conversation cleanup timer
      this.scheduleConversationCleanup(chatId);
    } catch (error) {
      console.error("OpenRouter API error:", error);
      await ctx.reply("Ой, я сломался... Попробуй ещё раз, может починюсь");
    }
  }

  // Clean up conversations after 30 minutes of inactivity
  private scheduleConversationCleanup(chatId: number) {
    // Clear any existing timeout for this chat
    if (this.conversationHistory.get(chatId)?.timeout) {
      clearTimeout(this.conversationHistory.get(chatId)?.timeout);
    }

    // Set new timeout
    const timeout = setTimeout(
      () => {
        this.conversationHistory.delete(chatId);
      },
      30 * 60 * 1000,
    ); // 30 minutes

    // Store timeout reference
    const conversation = this.conversationHistory.get(chatId);
    if (conversation) {
      this.conversationHistory.set(chatId, {
        ...conversation,
        timeout,
      });
    }
  }
}
