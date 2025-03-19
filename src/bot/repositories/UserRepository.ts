import prisma from "@/prisma/client";
import { MusicSubmission, User } from "@prisma/client";
import { injectable } from "inversify";

@injectable()
export class UserRepository {
  async upsertUser(userData: {
    id: number;
    username?: string | null;
    firstName: string;
  }): Promise<User> {
    const normalizedName = userData.firstName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");

    return prisma.user.upsert({
      where: { id: userData.id },
      create: {
        id: userData.id,
        tag: userData.username || null,
        name: normalizedName,
      },
      update: {
        tag: userData.username || null,
        name: normalizedName,
      },
    });
  }

  async findUserById(userId: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id: userId } });
  }

  async findUsersByIds(userIds: number[]): Promise<User[]> {
    return prisma.user.findMany({ where: { id: { in: userIds } } });
  }

  async findUsersWithSubmissions(): Promise<User[]> {
    const musicSubmissions = await prisma.musicSubmission.findMany({});
    const uniqueUserIds = [...new Set(musicSubmissions.map((s) => s.userId))];

    return prisma.user.findMany({ where: { id: { in: uniqueUserIds } } });
  }

  async findSubmissionByUserId(
    userId: number,
  ): Promise<MusicSubmission | null> {
    return prisma.musicSubmission.findUnique({ where: { userId } });
  }

  async upsertSubmission(submission: {
    userId: number;
    fileId: string;
  }): Promise<MusicSubmission> {
    return prisma.musicSubmission.upsert({
      where: { userId: submission.userId },
      create: submission,
      update: submission,
    });
  }
}
