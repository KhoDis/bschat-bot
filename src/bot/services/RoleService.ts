import prisma from "@/prisma/client";
import {
  Permission,
  PERMISSIONS,
  PermissionService,
} from "./PermissionService";
import { Role, User } from "@prisma/client";
import { inject, injectable } from "inversify";
import { TYPES } from "@/types";

@injectable()
export class RoleService {
  constructor(
    @inject(TYPES.PermissionService)
    private permissionService: PermissionService,
  ) {}

  /**
   * Checks if a user has a specific permission in a chat
   * by aggregating permissions from all their roles in that chat
   */
  async hasPermission(
    userId: bigint,
    chatId: bigint,
    permission: Permission,
  ): Promise<boolean> {
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        role: {
          chatId,
        },
      },
      include: {
        role: true,
      },
    });

    // Combine all permissions from all roles using bitwise OR
    const combinedPermissions = userRoles.reduce(
      (acc, userRole) => acc | userRole.role.permissions,
      0,
    );

    // If combinedPermissions is ADMIN, return true
    if (combinedPermissions & PERMISSIONS.ADMIN) return true;

    return (combinedPermissions & PERMISSIONS[permission]) !== 0;
  }

  /**
   * Assigns a role to a user in a specific chat
   */
  async assignRole(
    userId: number,
    chatId: number,
    roleName: string,
  ): Promise<void> {
    const role = await prisma.role.findUnique({
      where: { name_chatId: { name: roleName, chatId } },
    });

    if (!role) return;

    const userRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId: role.id } },
    });

    if (userRole) {
      await prisma.userRole.delete({
        where: { userId_roleId: { userId, roleId: role.id } },
      });
    }

    await prisma.userRole.create({
      data: {
        userId: BigInt(userId),
        roleId: role.id,
      },
    });
  }

  /**
   * Adds a role to a chat.
   */
  async createRole(roleName: string, chatId: number): Promise<Role> {
    return prisma.role.create({
      data: {
        name: roleName,
        chatId: BigInt(chatId),
      },
    });
  }

  /**
   * Removes a role from a user in a specific chat
   */
  async revokeRole(
    userId: number,
    chatId: number,
    roleName: string,
  ): Promise<void> {
    const role = await prisma.role.findUnique({
      where: { name_chatId: { name: roleName, chatId } },
    });

    if (!role) return;

    await prisma.userRole.deleteMany({
      where: { userId, roleId: role.id },
    });
  }

  async removeRole(roleName: string, chatId: number) {
    await prisma.role.delete({
      where: { name_chatId: { name: roleName, chatId: BigInt(chatId) } },
    });
  }

  /**
   * Lists all permissions a user has in a specific chat
   */
  async listPermissions(userId: bigint, chatId: bigint): Promise<Permission[]> {
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        role: {
          chatId,
        },
      },
      include: {
        role: true,
      },
    });

    const combinedPermissions = userRoles.reduce(
      (acc, userRole) => acc | userRole.role.permissions,
      0,
    );

    return (Object.keys(PERMISSIONS) as Permission[]).filter((perm) => {
      return (combinedPermissions & PERMISSIONS[perm]) !== 0;
    });
  }

  /**
   * Gets all roles for a user in a specific chat
   */
  async getUserRoles(
    userId: bigint,
    chatId: bigint,
  ): Promise<Array<{ id: number; name: string }>> {
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        role: {
          chatId,
        },
      },
      include: {
        role: true,
      },
    });

    return userRoles.map((userRole) => ({
      id: userRole.role.id,
      name: userRole.role.name,
    }));
  }

  /**
   * Gets a specific role in a specific chat
   */
  async getRole(roleName: string, chatId: number): Promise<Role | null> {
    return prisma.role.findUnique({
      where: { name_chatId: { name: roleName, chatId: BigInt(chatId) } },
    });
  }

  /**
   * Gets all users with a specific role in a specific chat
   */
  async getRoleUsers(roleName: string, chatId: number): Promise<User[]> {
    const users = await prisma.userRole.findMany({
      where: {
        role: {
          name: roleName,
          chatId: chatId,
        },
      },
      include: {
        user: true, // Include the related User data
      },
    });

    return users.map((userRole) => userRole.user); // Extract the User objects
  }

  /**
   * Gets all roles for a specific chat
   * @param chatId The ID of the chat
   * @returns Array of roles in the chat
   */
  async getChatRoles(chatId: bigint) {
    return prisma.role.findMany({
      where: {
        chatId: chatId,
      },
    });
  }
}
