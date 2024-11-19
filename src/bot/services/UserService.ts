import { MusicSubmission } from "@prisma/client";
import prisma from "../../prisma/client";

export class UserService {
  async saveOrUpdateUser(userData: {
    id: number;
    username?: string | null;
    firstName: string;
  }) {
    return await prisma.user.upsert({
      where: { id: userData.id },
      create: {
        id: userData.id,
        tag: userData.username || null,
        name: userData.firstName,
      },
      update: {
        tag: userData.username || null,
        name: userData.firstName,
      },
    });
  }

  async getUser(userId: number) {
    return await prisma.user.findUnique({ where: { id: userId } });
  }

  async getFormattedUser(userId: number) {
    const user = await this.getUser(userId);

    if (!user) return null;

    return `${user.name} ${user.tag ? `(${user.tag})` : ""}`;
  }

  async getUserSubmissions() {
    const musicSubmissions = await prisma.musicSubmission.findMany({});
    const uniqueUsers = new Set(musicSubmissions.map((s) => s.userId));

    return await prisma.user.findMany({
      where: { id: { in: [...uniqueUsers] } },
    });
  }

  async getUserSubmission(userId: number) {
    return await prisma.musicSubmission.findMany({ where: { userId } });
  }

  async saveOrUpdateSubmission(submission: { userId: number; fileId: string }) {
    return await prisma.musicSubmission.upsert({
      where: { userId: submission.userId },
      create: submission,
      update: submission,
    });
  }
}
