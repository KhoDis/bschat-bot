import { User } from "@prisma/client";
import prisma from "../../prisma/client";
import { IUserService } from "./user.interface";

export class UserService implements IUserService {
  async registerUser(userId: number, username: string) {
    await prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, username },
      update: { username },
    });
  }

  async getUser(userId: number) {
    return await prisma.user.findUnique({ where: { id: userId } });
  }
}
