import { Update } from "telegraf/types";
import { callbackQuery } from "telegraf/filters";
import { CallbackQuery } from "@telegraf/types";

export function dataAction(pattern: RegExp) {
  return (
    update: Update,
  ): update is Update.CallbackQueryUpdate<CallbackQuery.DataQuery> => {
    // First check if it's a DataQuery
    if (!callbackQuery("data")(update)) return false;

    // Then check the data pattern
    const data = update.callback_query.data;
    return pattern.test(data);
  };
}
