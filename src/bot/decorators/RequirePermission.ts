import { RoleService } from "@/bot/services/RoleService";
import { TextService } from "@/bot/services/TextService";
import { IBotContext } from "@/context/context.interface";
import { CommandContext, TYPES } from "@/types";
import { Permission } from "@/bot/services/PermissionService";
import { container } from "@/container";

export function RequirePermission(permission: Permission) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (ctx: IBotContext, ...args: any[]) {
      const roleService = container.get<RoleService>(TYPES.RoleService);
      const textService = container.get<TextService>(TYPES.TextService);

      const userId = ctx.from?.id;
      const chatId = ctx.chat?.id;

      if (!userId || !chatId) {
        await ctx.reply(textService.get("permissions.chatOnly"));
        return;
      }

      const hasPermission = await roleService.hasPermission(
        BigInt(userId),
        BigInt(chatId),
        permission,
      );

      if (!hasPermission) {
        await ctx.reply(textService.get("permissions.denied"));
        return;
      }

      return originalMethod.apply(this, [ctx, ...args]);
    };

    return descriptor;
  };
}
