import { MusicSubmission } from "@prisma/client";
import prisma from "../../prisma/client";
import { Context } from "telegraf";
import { AppUser } from "../../schemas";

type DBUser = {
  id: bigint;
  tag: string | null;
  name: string;
};

export class UserService {
  async saveOrUpdateUser(userData: {
    id: number;
    username?: string | null;
    firstName: string;
  }) {
    return prisma.user.upsert({
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
    return prisma.user.findUnique({ where: { id: userId } });
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
        }) as AppUser,
    );
  }

  async getSubmissionByUserId(userId: number) {
    return prisma.musicSubmission.findUnique({ where: { userId } });
  }

  async saveOrUpdateSubmission(submission: { userId: number; fileId: string }) {
    return prisma.musicSubmission.upsert({
      where: { userId: submission.userId },
      create: submission,
      update: submission,
    });
  }

  async pingParticipants(ctx: Context): Promise<boolean> {
    const participants = await this.getSubmissionUsers();

    if (!participants.length) {
      await ctx.reply("Никого нет, как я игру то начну :(");
      return false;
    }

    const formattedNames = await Promise.all(
      participants.map(async (p) => this.formatParticipantName(p.id)),
    );

    await ctx.replyWithMarkdown(formattedNames.join("\n"));
    return true;
  }

  private async formatParticipantName(userId: number): Promise<string> {
    const formattedUser = await this.getFormattedUser(userId);
    return `[${formattedUser}](tg://user?id=${userId})`;
  }
}
