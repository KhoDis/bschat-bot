import { Telegraf } from "telegraf/typings/telegraf";
import { IBotContext } from "../../context/context.interface";

export abstract class Command {
  constructor(public bot: Telegraf<IBotContext>) {}

  abstract handle(): void;
}
