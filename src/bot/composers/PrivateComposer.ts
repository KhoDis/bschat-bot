import { message } from "telegraf/filters";
import { IBotContext } from "../../context/context.interface";
import { Composer } from "telegraf";
import { UserService } from "../services/UserService";
import { BotResponses, getRandomResponse } from "../../config/botResponses";
import { MusicGameService } from "../services/musicGameService";

export class PrivateComposer extends Composer<IBotContext> {
  constructor(
    private userService: UserService,
    private musicGuessService: MusicGameService,
    private botResponses: BotResponses,
  ) {
    super();

    this.setupHandlers();
  }

  private setupHandlers() {
    this.on(message("audio"), async (ctx) => {
      // Check if it's private message
      if (ctx.chat.type !== "private") {
        await ctx.reply(
          "А, ну конечно, кидать музыку в чат — гениальная идея. Нет, правда, никто до этого не додумался. Отправь её в личку, умник.",
        );
        return;
      }

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
          `Ой-ой, что-то сломалось. Может, это твоя карма? Ладно, напиши @khodis: userId: ${userId}, fileId: ${fileId}`,
        );
        return;
      }

      await this.userService.saveOrUpdateSubmission({
        userId,
        fileId,
      });

      ctx.session.waitingForHint = true;

      await ctx.reply(
        "Ого, ты отправил трек! А теперь попробуй написать к нему подсказку. Или не пиши. Мне-то что.",
      );
    });

    // Enhanced message handling with more sarcastic responses
    this.on(message("text"), async (ctx) => {
      if (!ctx.from) return;

      // Handle hint submission
      if (ctx.session.waitingForHint) {
        const submission = await this.userService.getSubmissionByUserId(
          ctx.from.id,
        );
        if (!submission) {
          const responses = [
            "Упс! Что-то пошло не так... Может, это знак, что не стоит продолжать?",
            "Ошибка? У меня? Невозможно! Наверное, это ты что-то сделал(а) не так.",
            "Знаешь, некоторые отношения просто не предназначены быть. Как наше с этой подсказкой.",
          ];
          await ctx.reply(getRandomResponse(responses));
          return;
        }

        await this.musicGuessService.addHint(submission.id, ctx.message.text);
        ctx.session.waitingForHint = false;

        const responses = [
          "Подсказка сохранена! Надеюсь, она лучше, чем твои предыдущие попытки быть полезным.",
          "О, ты всё-таки придумал(а) подсказку! А я уже начал(а) терять надежду.",
          "Подсказка принята. Не то чтобы она была гениальной, но сойдёт.",
          "Ура! Теперь у нас есть подсказка. Осталось только найти кого-то, кто сможет её понять...",
        ];
        await ctx.reply(getRandomResponse(responses));
      }
    });
  }
}
