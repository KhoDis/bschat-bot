import { describe, it, expect, vi, beforeEach } from "vitest";
import { PermissionService, PERMISSIONS } from "./permission.service";
import prisma from "@/prisma/client";

// Mock Prisma Client
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    role: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  })),
}));

describe("PermissionService", () => {
  let permissionService: PermissionService;
  beforeEach(() => {
    permissionService = new PermissionService();
    vi.clearAllMocks();
  });

  it("should return true if a role has a specific permission in a chat", async () => {
    const roleId = 1;
    const chatId = 123n;
    vi.mocked(prisma.role.findUnique).mockResolvedValue({
      id: roleId,
      permissions: PERMISSIONS.ADMIN,
      name: "test role",
      chatId: chatId,
    });

    const result = await permissionService.hasPermission(roleId, "ADMIN");

    expect(result).toBe(true);
    expect(prisma.role.findUnique).toHaveBeenCalledWith({
      where: { id: roleId },
      select: { permissions: true },
    });
  });

  it("should return false if a role does not have the permission in a chat", async () => {
    const roleId = 1;
    const chatId = 123n;
    vi.mocked(prisma.role.findUnique).mockResolvedValue({
      permissions: 0,
      id: roleId,
      name: "test role",
      chatId: chatId,
    });

    const result = await permissionService.hasPermission(roleId, "ADMIN");

    expect(result).toBe(false);
  });

  it("should return false if role does not exist in a chat", async () => {
    const roleId = 1;
    vi.mocked(prisma.role.findUnique).mockResolvedValue(null);

    const result = await permissionService.hasPermission(roleId, "ADMIN");

    expect(result).toBe(false);
  });

  it("should grant a permission to a role in a specific chat", async () => {
    const roleId = 1;
    const chatId = 123n;
    vi.mocked(prisma.role.findUnique).mockResolvedValue({
      id: roleId,
      permissions: 0,
      name: "Test Role",
      chatId: chatId,
    });

    await permissionService.grantPermission(roleId, "MANAGE_ROLES");

    expect(prisma.role.update).toHaveBeenCalledWith({
      where: { id: roleId },
      data: { permissions: PERMISSIONS.MANAGE_ROLES },
    });
  });

  it("should not grant a permission if role does not exist in a chat", async () => {
    const roleId = 1;
    vi.mocked(prisma.role.findUnique).mockResolvedValue(null);

    await expect(
      permissionService.grantPermission(roleId, "MANAGE_ROLES"),
    ).rejects.toThrow("Role not found");
  });

  it("should revoke a permission from a role in a specific chat", async () => {
    const roleId = 1;
    const chatId = 123n;
    vi.mocked(prisma.role.findUnique).mockResolvedValue({
      id: roleId,
      permissions: PERMISSIONS.MANAGE_ROLES,
      name: "Test Role",
      chatId: chatId,
    });

    await permissionService.revokePermission(roleId, "MANAGE_ROLES");

    expect(prisma.role.update).toHaveBeenCalledWith({
      where: { id: roleId },
      data: { permissions: 0 }, // Removed permission
    });
  });

  it("should not revoke a permission if role does not exist in a chat", async () => {
    const roleId = 1;
    vi.mocked(prisma.role.findUnique).mockResolvedValue(null);

    await expect(
      permissionService.revokePermission(roleId, "MANAGE_ROLES"),
    ).rejects.toThrow("Role not found");
  });

  it("should list all granted permissions for a role in a specific chat", async () => {
    const roleId = 1;
    const chatId = 123n;
    vi.mocked(prisma.role.findUnique).mockResolvedValue({
      permissions: PERMISSIONS.MANAGE_ROLES | PERMISSIONS.MANAGE_MUSIC_GAME,
      id: roleId,
      name: "Test Role",
      chatId: chatId,
    });

    const result = await permissionService.listPermissions(roleId);

    expect(result).toEqual(["MANAGE_MUSIC_GAME", "MANAGE_ROLES"]);
  });

  it("should return an empty array if role has no permissions in a chat", async () => {
    const roleId = 1;
    const chatId = 123n;
    vi.mocked(prisma.role.findUnique).mockResolvedValue({
      permissions: 0,
      id: roleId,
      name: "Test Role",
      chatId: chatId,
    });

    const result = await permissionService.listPermissions(roleId);

    expect(result).toEqual([]);
  });

  it("should return an empty array if role does not exist in a chat", async () => {
    const roleId = 1;
    vi.mocked(prisma.role.findUnique).mockResolvedValue(null);

    const result = await permissionService.listPermissions(roleId);

    expect(result).toEqual([]);
  });

  it("should handle permissions for roles in different chats independently", async () => {
    const roleId1 = 1;
    const roleId2 = 2;
    const chatId1 = 123n;
    const chatId2 = 456n;

    // Mock roles in different chats
    vi.mocked(prisma.role.findUnique)
      .mockResolvedValueOnce({
        id: roleId1,
        permissions: PERMISSIONS.ADMIN,
        name: "Test Role 1",
        chatId: chatId1,
      })
      .mockResolvedValueOnce({
        id: roleId2,
        permissions: PERMISSIONS.MANAGE_ROLES,
        name: "Test Role 2",
        chatId: chatId2,
      });

    // Check permissions for role in chat 1
    const result1 = await permissionService.hasPermission(roleId1, "ADMIN");
    expect(result1).toBe(true);

    // Check permissions for role in chat 2
    const result2 = await permissionService.hasPermission(
      roleId2,
      "MANAGE_ROLES",
    );
    expect(result2).toBe(true);
  });
});
