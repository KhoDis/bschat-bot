import prisma from "@/prisma/client";

export const PERMISSIONS = {
  ADMIN: 1 << 0, // 0001 = 1
  MANAGE_MUSIC_GAME: 1 << 1, // 0010 = 2
  MANAGE_ROLES: 1 << 2, // 0100 = 4
} as const;

export type Permission = keyof typeof PERMISSIONS;

export class PermissionService {
  constructor() {}

  /**
   * Checks if a role has a specific permission.
   */
  async hasPermission(
    roleId: number,
    permission: Permission,
  ): Promise<boolean> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { permissions: true },
    });

    if (!role) return false;

    return (role.permissions & PERMISSIONS[permission]) !== 0;
  }

  /**
   * Grants a permission to a role.
   */
  async grantPermission(roleId: number, permission: Permission): Promise<void> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { permissions: true },
    });

    if (!role) throw new Error("Role not found");

    await prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: role.permissions | PERMISSIONS[permission], // Bitwise OR to add permission
      },
    });
  }

  /**
   * Revokes a permission from a role.
   */
  async revokePermission(
    roleId: number,
    permission: Permission,
  ): Promise<void> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { permissions: true },
    });

    if (!role) throw new Error("Role not found");

    await prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: role.permissions & ~PERMISSIONS[permission], // Bitwise AND + NOT to remove
      },
    });
  }

  /**
   * Lists all granted permissions for a role.
   */
  async listPermissions(roleId: number): Promise<Permission[]> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { permissions: true },
    });

    if (!role) return [];

    return (Object.keys(PERMISSIONS) as Permission[]).filter((perm) => {
      return (role.permissions & PERMISSIONS[perm]) !== 0;
    });
  }
}
