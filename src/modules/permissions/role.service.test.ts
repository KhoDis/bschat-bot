import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoleService } from './role.service';
import prisma from '@/prisma/client';

describe('RoleService BigInt conversions', () => {
  const roleService = new RoleService({} as any);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('assignRole converts chatId and userId to BigInt and creates userRole', async () => {
    const userId = 1111;
    const chatId = 2222;
    const role = {
      id: 10,
      name: 'admin',
      chatId: BigInt(chatId),
      permissions: 0,
    } as any;

    const findRole = vi.spyOn(prisma.role, 'findUnique').mockResolvedValue(role);
    const findUserRole = vi.spyOn(prisma.userRole, 'findUnique').mockResolvedValue(null as any);
    const createUserRole = vi.spyOn(prisma.userRole, 'create').mockResolvedValue({} as any);

    await roleService.assignRole(userId, chatId, 'admin');

    expect(findRole).toHaveBeenCalledWith({
      where: { name_chatId: { name: 'admin', chatId: BigInt(chatId) } },
    });
    expect(findUserRole).toHaveBeenCalledWith({
      where: { userId_roleId: { userId: BigInt(userId), roleId: role.id } },
    });
    expect(createUserRole).toHaveBeenCalledWith({
      data: { userId: BigInt(userId), roleId: role.id },
    });
  });

  it('assignRole deletes existing mapping using BigInt ids', async () => {
    const userId = 1;
    const chatId = 2;
    const role = {
      id: 5,
      name: 'moderator',
      chatId: BigInt(chatId),
      permissions: 0,
    } as any;

    vi.spyOn(prisma.role, 'findUnique').mockResolvedValue(role);
    vi.spyOn(prisma.userRole, 'findUnique').mockResolvedValue({
      userId: BigInt(userId),
      roleId: role.id,
    } as any);
    const deleteUserRole = vi.spyOn(prisma.userRole, 'delete').mockResolvedValue({} as any);
    vi.spyOn(prisma.userRole, 'create').mockResolvedValue({} as any);

    await roleService.assignRole(userId, chatId, 'moderator');

    expect(deleteUserRole).toHaveBeenCalledWith({
      where: { userId_roleId: { userId: BigInt(userId), roleId: role.id } },
    });
  });

  it('revokeRole uses BigInt ids in deleteMany', async () => {
    const userId = 7;
    const chatId = 9;
    const role = {
      id: 3,
      name: 'member',
      chatId: BigInt(chatId),
      permissions: 0,
    } as any;

    vi.spyOn(prisma.role, 'findUnique').mockResolvedValue(role);
    const deleteMany = vi
      .spyOn(prisma.userRole, 'deleteMany')
      .mockResolvedValue({ count: 1 } as any);

    await roleService.revokeRole(userId, chatId, 'member');

    expect(deleteMany).toHaveBeenCalledWith({
      where: { userId: BigInt(userId), roleId: role.id },
    });
  });

  it('getRoleUsers filters by chatId BigInt', async () => {
    const findMany = vi.spyOn(prisma.userRole, 'findMany').mockResolvedValue([] as any);
    await roleService.getRoleUsers('x', 123);
    expect(findMany).toHaveBeenCalledWith({
      where: { role: { name: 'x', chatId: BigInt(123) } },
      include: { user: true },
    });
  });

  it('getRole looks up composite with chatId BigInt', async () => {
    const findRole = vi.spyOn(prisma.role, 'findUnique').mockResolvedValue(null as any);
    await roleService.getRole('any', 555);
    expect(findRole).toHaveBeenCalledWith({
      where: { name_chatId: { name: 'any', chatId: BigInt(555) } },
    });
  });
});
