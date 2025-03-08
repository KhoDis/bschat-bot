import { NarrowedContext } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { Message, Update } from "telegraf/types";

export type CommandContext = NarrowedContext<
  IBotContext,
  Update.MessageUpdate<Message.TextMessage>
>;
