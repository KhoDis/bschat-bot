import { MusicSubmission } from "@prisma/client";
import prisma from "../../prisma/client";
import { Context } from "telegraf";

type DBUser = {
  id: bigint;
  tag: string | null;
  name: string;
};

export type AppUser = {
  id: number;
  tag: string | null;
  name: string;
};

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

  async getSubmissionUsers() {
    const musicSubmissions = await prisma.musicSubmission.findMany({});
    const uniqueUserIds = [...new Set(musicSubmissions.map((s) => s.userId))];

    const users = await prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
    });

    return users.map(
      (user) =>
        ({
          id: Number(user.id),
          tag: user.tag,
          name: user.name,
        } as AppUser)
    );
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

  async pingParticipants(ctx: Context): Promise<boolean> {
    const participants = await this.getSubmissionUsers();

    if (!participants.length) {
      await ctx.reply("Никто не решился учавствовать :(");
      return false;
    }

    const formattedNames = await Promise.all(
      participants.map(async (p) => this.formatParticipantName(p.id))
    );

    await ctx.replyWithMarkdown(formattedNames.join("\n"));
    return true;
  }

  private async formatParticipantName(userId: number): Promise<string> {
    const formattedUser = await this.getFormattedUser(userId);
    return `[${formattedUser}](tg://user?id=${userId})`;
  }
}
