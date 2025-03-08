import { Composer, NarrowedContext } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { RoleService } from "@/bot/services/RoleService";
import { Message, Update } from "telegraf/types";
import { UserService } from "@/bot/services/UserService";
import {
  Permission,
  PERMISSIONS,
  PermissionService,
} from "@/bot/services/PermissionService";
import { TextService } from "@/bot/services/TextService";

type CommandContext = NarrowedContext<
  IBotContext,
  Update.MessageUpdate<Message.TextMessage>
>;

export class RoleComposer extends Composer<IBotContext> {
  constructor(
    private roleService: RoleService,
    private permissionService: PermissionService,
    private userService: UserService,
    private text: TextService,
  ) {
    super();

    // Register commands
    this.command("assign_role", this.handleAssignRole.bind(this));
    this.command("revoke_role", this.handleRevokeRole.bind(this));
    this.command("list_roles", this.handleListRoles.bind(this));
    this.command("list_permissions", this.handleListPermissions.bind(this));

    this.command("add_role", this.handleAddRole.bind(this));
    this.command("remove_role", this.handleRemoveRole.bind(this));
    this.command("ping_role", this.handlePingRole.bind(this));

    this.command("reset_admin", this.handleResetAdmin.bind(this));

    this.command(
      "list_role_permissions",
      this.handleListRolePermissions.bind(this),
    );
    this.command("grant_permission", this.handleGrantPermission.bind(this));
    this.command("revoke_permission", this.handleRevokePermission.bind(this));
    this.command("list_all_roles", this.handleListAllRoles.bind(this));
    this.command(
      "list_available_permissions",
      this.handleListAvailablePermissions.bind(this),
    );
  }

  /**
   * Lists all roles in the current chat
   */
  private async handleListAllRoles(ctx: CommandContext) {
    await this.checkPermissions(ctx, async () => {
      const chatId = ctx.chat?.id;

      if (!chatId) {
        await ctx.reply(this.text.get("roles.chatOnly"));
        return;
      }

      try {
        const roles = await this.roleService.getChatRoles(BigInt(chatId));

        if (roles.length === 0) {
          await ctx.reply(this.text.get("roles.noRoles"));
          return;
        }

        const roleList = roles.map((role) => `- ${role.name}`).join("\n");
        await ctx.reply(this.text.get("roles.list.success", { roleList }));
      } catch (error) {
        if (error instanceof Error) {
          await ctx.reply(
            this.text.get("roles.list.error", { error: error.message }),
          );
          return;
        }
      }
    });
  }

  /**
   * Lists all permissions for a specific role
   */
  private async handleListRolePermissions(ctx: CommandContext) {
    await this.checkPermissions(ctx, async () => {
      const [_, roleName] = ctx.message.text.split(" ");

      if (!roleName) {
        await ctx.reply(this.text.get("roles.nameNotSpecified"));
        return;
      }

      try {
        const role = await this.roleService.getRole(roleName, ctx.chat.id);

        if (!role) {
          await ctx.reply(this.text.get("roles.roleNotFound", { roleName }));
          return;
        }

        const permissions = await this.permissionService.listPermissions(
          role.id,
        );

        if (permissions.length === 0) {
          await ctx.reply(this.text.get("roles.noPermissions"));
          return;
        }

        const permissionList = permissions.join(", ");
        await ctx.reply(
          this.text.get("roles.permissions.success", {
            roleName,
            permissions: permissionList,
          }),
        );
      } catch (error) {
        if (error instanceof Error) {
          await ctx.reply(
            this.text.get("roles.permissions.error", {
              roleName,
              error: error.message,
            }),
          );
          return;
        }
      }
    });
  }

  /**
   * Lists all available permissions in the system
   */
  private async handleListAvailablePermissions(ctx: CommandContext) {
    await this.checkPermissions(ctx, async () => {
      try {
        const permissions = Object.keys(PERMISSIONS);
        const permissionList = permissions.join("\n");
        await ctx.reply(
          this.text.get("roles.availablePermissions.success", {
            permissions: permissionList,
          }),
        );
      } catch (error) {
        if (error instanceof Error) {
          await ctx.reply(
            this.text.get("roles.availablePermissions.error", {
              error: error.message,
            }),
          );
          return;
        }
      }
    });
  }

  /**
   * Grants a permission to a role
   */
  private async handleGrantPermission(ctx: CommandContext) {
    await this.checkPermissions(ctx, async () => {
      const parts = ctx.message.text.split(" ");

      if (parts.length !== 3) {
        await ctx.reply(this.text.get("roles.grant.usage"));
        return;
      }

      const roleName = parts[1];
      const permissionName = parts[2] as Permission;

      try {
        // Validate permission name
        if (!Object.keys(PERMISSIONS).includes(permissionName)) {
          await ctx.reply(
            this.text.get("roles.grant.invalidPermission", { permissionName }),
          );
          return;
        }

        const role = await this.roleService.getRole(
          roleName || "",
          ctx.chat.id,
        );

        if (!role) {
          await ctx.reply(this.text.get("roles.roleNotFound", { roleName }));
          return;
        }

        await this.permissionService.grantPermission(role.id, permissionName);
        await ctx.reply(
          this.text.get("roles.grant.success", { roleName, permissionName }),
        );
      } catch (error) {
        if (error instanceof Error) {
          await ctx.reply(
            this.text.get("roles.grant.error", { error: error.message }),
          );
          return;
        }
      }
    });
  }

  /**
   * Revokes a permission from a role
   */
  private async handleRevokePermission(ctx: CommandContext) {
    await this.checkPermissions(ctx, async () => {
      const parts = ctx.message.text.split(" ");

      if (parts.length !== 3) {
        await ctx.reply(this.text.get("roles.revoke.usage"));
        return;
      }

      const roleName = parts[1];
      const permissionName = parts[2] as Permission;

      try {
        // Validate permission name
        if (!Object.keys(PERMISSIONS).includes(permissionName)) {
          await ctx.reply(
            this.text.get("roles.revoke.invalidPermission", { permissionName }),
          );
          return;
        }

        const role = await this.roleService.getRole(
          roleName || "",
          ctx.chat.id,
        );

        if (!role) {
          await ctx.reply(this.text.get("roles.roleNotFound", { roleName }));
          return;
        }

        await this.permissionService.revokePermission(role.id, permissionName);
        await ctx.reply(
          this.text.get("roles.revoke.success", { roleName, permissionName }),
        );
      } catch (error) {
        if (error instanceof Error) {
          await ctx.reply(
            this.text.get("roles.revoke.error", { error: error.message }),
          );
          return;
        }
      }
    });
  }

  /**
   * Middleware to check if the user has the MANAGE_ROLES permission
   */
  private async checkPermissions(ctx: IBotContext, next: () => Promise<void>) {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;

    if (!userId || !chatId) {
      await ctx.reply(this.text.get("roles.chatOnly"));
      return;
    }

    const hasPermission = await this.roleService.hasPermission(
      BigInt(userId),
      BigInt(chatId),
      "MANAGE_ROLES",
    );

    if (hasPermission) {
      await next();
    } else {
      await ctx.reply(this.text.get("permissions.denied"));
    }
  }

  isAdmin(chatId: number, userId: number, ctx: IBotContext): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Get user information first
      ctx.telegram
        .getChatMember(chatId, userId)
        .then((user) => {
          // Then check if user is admin (or creator)
          resolve(user.status == "creator");
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  async upsertAdminRole(ctx: CommandContext) {
    let role = await this.roleService.getRole("admin", ctx.chat.id);

    if (!role) {
      role = await this.roleService.createRole("admin", ctx.chat.id);
    }

    return role;
  }

  async handleResetAdmin(ctx: CommandContext): Promise<void> {
    // Check if the user is a main admin using Telegraf api
    if (await this.isAdmin(ctx.chat.id, ctx.from.id, ctx)) {
      // Add "admin" role if it doesn't exist
      const role = await this.upsertAdminRole(ctx);

      // Modify "admin" role permissions
      await this.permissionService.grantPermission(role.id, "ADMIN");

      // Assign "admin" role to the user
      await this.roleService.assignRole(ctx.from.id, ctx.chat.id, "admin");

      // Reply to the user
      await ctx.reply(this.text.get("roles.admin.reset"));
    } else {
      // Reply to the user
      await ctx.reply(this.text.get("roles.admin.denied"));
    }
  }

  /**
   * Pings all users in a role
   */
  async handlePingRole(ctx: CommandContext): Promise<void> {
    await this.checkPermissions(ctx, async () => {
      const [_, roleName] = ctx.message.text.split(" ");

      if (!roleName) {
        await ctx.reply(this.text.get("roles.nameNotSpecified"));
        return;
      }

      try {
        const users = await this.roleService.getRoleUsers(
          roleName,
          ctx.chat.id,
        );

        if (users.length === 0) {
          await ctx.reply(this.text.get("roles.ping.noUsers", { roleName }));
          return;
        }

        this.userService.formatPingNames(users).forEach((batch) => {
          ctx.replyWithMarkdown(batch);
        });
      } catch (error) {
        if (error instanceof Error) {
          await ctx.reply(
            this.text.get("roles.ping.error", { error: error.message }),
          );
          return;
        }
      }
    });
  }

  /**
   * Adds a role to a chat.
   */
  private async handleAddRole(ctx: CommandContext) {
    await this.checkPermissions(ctx, async () => {
      const [_, roleName] = ctx.message.text.split(" ");
      if (!roleName) {
        await ctx.reply(this.text.get("roles.nameNotSpecified"));
        return;
      }

      try {
        // Check if role already exists
        const role = await this.roleService.getRole(roleName, ctx.chat.id);

        if (role) {
          await ctx.reply(this.text.get("roles.add.exists", { roleName }));
          return;
        }
        await this.roleService.createRole(roleName, ctx.chat.id);
        await ctx.reply(this.text.get("roles.add.success", { roleName }));
      } catch (error) {
        if (error instanceof Error) {
          await ctx.reply(
            this.text.get("roles.add.error", { error: error.message }),
          );
          return;
        }
      }
    });
  }

  /**
   * Removes a role from a chat completely.
   */
  private async handleRemoveRole(ctx: CommandContext) {
    await this.checkPermissions(ctx, async () => {
      const [_, roleName] = ctx.message.text.split(" ");
      if (!roleName) {
        await ctx.reply(this.text.get("roles.nameNotSpecified"));
        return;
      }

      try {
        await this.roleService.removeRole(roleName, ctx.chat.id);
        await ctx.reply(this.text.get("roles.remove.success", { roleName }));
      } catch (error) {
        if (error instanceof Error) {
          await ctx.reply(
            this.text.get("roles.remove.error", { error: error.message }),
          );
          return;
        }
      }
    });
  }

  /**
   * Assigns a role to a user in the current chat
   */
  private async handleAssignRole(ctx: CommandContext) {
    await this.checkPermissions(ctx, async () => {
      const chatId = ctx.chat?.id;
      const targetUser = ctx.message?.reply_to_message?.from;
      const roleName = ctx.message?.text?.split(" ")[1]; // e.g., /assign_role MODERATOR

      if (!chatId || !targetUser || !roleName) {
        await ctx.reply(this.text.get("roles.assign.usage"));
        return;
      }

      try {
        await this.roleService.assignRole(targetUser.id, chatId, roleName);
        await ctx.reply(
          this.text.get("roles.assign.success", {
            roleName,
            username: targetUser.username || targetUser.first_name,
          }),
        );
      } catch (error) {
        if (error instanceof Error) {
          await ctx.reply(
            this.text.get("roles.assign.error", { error: error.message }),
          );
          return;
        }
      }
    });
  }

  /**
   * Revokes a role from a user in the current chat
   */
  private async handleRevokeRole(ctx: CommandContext) {
    await this.checkPermissions(ctx, async () => {
      const chatId = ctx.chat?.id;
      const targetUser = ctx.message?.reply_to_message?.from;
      const roleName = ctx.message?.text?.split(" ")[1]; // e.g., /revoke_role MODERATOR

      if (!chatId || !targetUser || !roleName) {
        await ctx.reply(this.text.get("roles.revoke.usage"));
        return;
      }

      try {
        await this.roleService.revokeRole(targetUser.id, chatId, roleName);
        await ctx.reply(
          this.text.get("roles.revoke.success", {
            roleName,
            username: targetUser.username || targetUser.first_name,
          }),
        );
      } catch (error) {
        if (error instanceof Error) {
          await ctx.reply(
            this.text.get("roles.revoke.error", { error: error.message }),
          );
          return;
        }
      }
    });
  }

  /**
   * Lists all roles for a user in the current chat
   */
  private async handleListRoles(ctx: CommandContext) {
    await this.checkPermissions(ctx, async () => {
      const chatId = ctx.chat?.id;
      const targetUser = ctx.message?.reply_to_message?.from;

      if (!chatId || !targetUser) {
        await ctx.reply(this.text.get("roles.userRoles.usage"));
        return;
      }

      try {
        const roles = await this.roleService.getUserRoles(
          BigInt(targetUser.id),
          BigInt(chatId),
        );

        if (roles.length === 0) {
          await ctx.reply(
            this.text.get("roles.userRoles.none", {
              username: targetUser.username || targetUser.first_name,
            }),
          );
          return;
        }

        const roleList = roles.map((role) => `- ${role.name}`).join("\n");
        await ctx.reply(
          this.text.get("roles.userRoles.success", {
            username: targetUser.username || targetUser.first_name,
            roleList,
          }),
        );
      } catch (error) {
        if (error instanceof Error) {
          await ctx.reply(
            this.text.get("roles.userRoles.error", { error: error.message }),
          );
          return;
        }
      }
    });
  }

  /**
   * Lists all permissions for a user in the current chat
   */
  private async handleListPermissions(ctx: CommandContext) {
    await this.checkPermissions(ctx, async () => {
      const chatId = ctx.chat?.id;
      const targetUser = ctx.message?.reply_to_message?.from;

      if (!chatId || !targetUser) {
        await ctx.reply(this.text.get("roles.userPermissions.usage"));
        return;
      }

      try {
        const permissions = await this.roleService.listPermissions(
          BigInt(targetUser.id),
          BigInt(chatId),
        );

        if (permissions.length === 0) {
          await ctx.reply(
            this.text.get("roles.userPermissions.none", {
              username: targetUser.username || targetUser.first_name,
            }),
          );
          return;
        }

        const permissionList = permissions.join(", ");
        await ctx.reply(
          this.text.get("roles.userPermissions.success", {
            username: targetUser.username || targetUser.first_name,
            permissions: permissionList,
          }),
        );
      } catch (error) {
        if (error instanceof Error) {
          await ctx.reply(
            this.text.get("roles.userPermissions.error", {
              error: error.message,
            }),
          );
          return;
        }
      }
    });
  }
}
