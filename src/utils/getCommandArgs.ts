import { CommandContext } from "@/types";

function getCommandArgs(ctx: CommandContext): string[] {
  return ctx.message.text.trim().split(/\s+/);
}

export default getCommandArgs;
