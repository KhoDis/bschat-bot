import { Context } from "telegraf";
import { Chat, ChatFromGetChat } from "telegraf/typings/core/types/typegram";

export const hasUsername = (
  chat: ChatFromGetChat
): chat is Chat.PrivateGetChat => {
  return "username" in chat;
};

export const getName = async (ctx: Context, userId: number) => {
  const person = await ctx.telegram.getChat(userId);
  if (!hasUsername(person)) {
    return;
  }
  const name = person.username || person.first_name; // TODO: make clickable link (ex: [Adis](https://t.me/khodis))
  return name;
};
