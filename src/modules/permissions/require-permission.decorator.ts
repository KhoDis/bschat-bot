import { RoleService } from "@/modules/permissions/role.service";
import { TextService } from "@/modules/common/text.service";
import { IBotContext } from "@/context/context.interface";
import { TYPES } from "@/types";
import { Permission } from "@/modules/permissions/permission.service";
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
