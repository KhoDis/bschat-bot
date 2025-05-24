import { Chat, MusicSubmission, User } from "@prisma/client";
import { injectable } from "inversify";
import prisma from "@/prisma/client";

/**
 * Service for managing Member, Chat, User, and MusicSubmission entities
 */
@injectable()
export class MemberService {
  constructor() {}

  async upsertUser(userData: {
    id: number;
    username?: string | null;
    firstName: string;
  }) {
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

  async upsertChat(chatData: { id: number; title: string }) {
    return prisma.chat.upsert({
      where: { id: chatData.id },
      create: {
        id: chatData.id,
        title: chatData.title,
      },
      update: {
        title: chatData.title,
      },
    });
  }

  async addMember(userId: number, chatId: number): Promise<void> {
    await prisma.member.create({
      data: {
        userId: userId,
        chatId: chatId,
      },
    });
  }

  async getSubmissionUsers(chatId: number): Promise<User[]> {
    const submissions = await prisma.musicSubmission.findMany({
      where: {
        memberChatId: chatId,
      },
      include: {
        member: {
          include: {
            user: true,
          },
        },
      },
    });

    return submissions.map((submission) => submission.member.user);
  }

  async addMusicHint(
    memberUserId: number,
    memberChatId: number,
    hintChatId: number,
    hintMessageId: number,
  ): Promise<void> {
    await prisma.musicSubmission.update({
      where: {
        memberUserId_memberChatId: {
          memberUserId,
          memberChatId,
        },
      },
      data: {
        uploadHintMessageId: hintMessageId,
        uploadChatId: hintChatId,
      },
    });
  }

  async getUsersByChatId(chatId: number): Promise<User[]> {
    return prisma.user.findMany({
      where: { members: { some: { chatId: chatId } } },
    });
  }

  async getChatsByUserId(userId: number): Promise<Chat[]> {
    return prisma.chat.findMany({
      where: { members: { some: { userId: userId } } },
    });
  }

  async existsMember(userId: number, chatId: number): Promise<boolean> {
    const member = await prisma.member.findFirst({
      where: {
        userId: userId,
        chatId: chatId,
      },
    });
    return member !== null;
  }

  async getSubmission(
    userId: number,
    chatId: number,
  ): Promise<MusicSubmission | null> {
    return prisma.musicSubmission.findUnique({
      where: {
        memberUserId_memberChatId: {
          memberUserId: userId,
          memberChatId: chatId,
        },
      },
    });
  }

  async saveSubmission(
    submission: {
      userId: number;
      chatId: number;
      fileId: string;
    },
    upload: {
      uploadChatId: number;
      uploadHintMessageId?: number;
    },
  ) {
    // Upsert musicSubmission
    await prisma.musicSubmission.upsert({
      where: {
        memberUserId_memberChatId: {
          memberUserId: submission.userId,
          memberChatId: submission.chatId,
        },
      },
      create: {
        memberUserId: submission.userId,
        memberChatId: submission.chatId,
        fileId: submission.fileId,
        uploadChatId: upload.uploadChatId,
        uploadHintMessageId: upload.uploadHintMessageId || null,
      },
      update: {
        fileId: submission.fileId,
      },
    });
  }

  // NOTE: https://limits.tginfo.me/en
  // Mentions number in a single message is limited up to 50,
  // only first 5 from list will receive notification
  formatPingNames(participants: User[]): string[] {
    const formattedNames: string[] = [];
    const participantsCopy = [...participants];

    while (participantsCopy.length > 0) {
      const batch = participantsCopy.splice(0, 5);
      formattedNames.push(
        batch.map((p) => this.formatParticipantName(p)).join("\n"),
      );
    }

    return formattedNames;
  }

  private formatParticipantName(user: User): string {
    const formattedUser = this.getFormattedUser(user);
    return `[${formattedUser}](tg://user?id=${user.id})`;
  }

  private getFormattedUser(user: User) {
    return `${user.name}${user.tag ? ` (${user.tag})` : ""}`;
  }
}
