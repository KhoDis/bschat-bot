import { Markup, Telegraf } from "telegraf";
import { IBotContext } from "../../context/context.interface";
import { Command } from "./command.class";

export class StartCommand extends Command {
  constructor(bot: Telegraf<IBotContext>) {
    super(bot);
  }

  handle(): void {
    this.bot.start((ctx) =>
      ctx.reply(
        "Hi!",
        Markup.inlineKeyboard([
          Markup.button.callback("Like", "start_like"),
          Markup.button.callback("Dislike", "start_dislike"),
        ])
      )
    );

    this.bot.action("start_(like|dislike)", async (ctx) => {
      const action = ctx.match[1];

      if (action === "like") {
        ctx.session.likeCount = (ctx.session.likeCount || 0) + 1;
        ctx.answerCbQuery("👍");
      } else if (action === "dislike") {
        ctx.session.likeCount = (ctx.session.likeCount || 0) - 1;
        ctx.answerCbQuery("👎");
      }

      ctx.editMessageText(`Like count: ${ctx.session.likeCount}`);
    });
  }
}
