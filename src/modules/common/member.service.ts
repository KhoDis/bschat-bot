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
      where: { id: BigInt(userData.id) },
      create: {
        id: BigInt(userData.id),
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
      where: { id: BigInt(chatData.id) },
      create: {
        id: BigInt(chatData.id),
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
        userId: BigInt(userId),
        chatId: BigInt(chatId),
      },
    });
  }

  async getSubmissionUsers(chatId: number): Promise<User[]> {
    const submissions = await prisma.musicSubmission.findMany({
      where: {
        memberChatId: BigInt(chatId),
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
          memberUserId: BigInt(memberUserId),
          memberChatId: BigInt(memberChatId),
        },
      },
      data: {
        uploadHintMessageId: BigInt(hintMessageId),
        uploadChatId: BigInt(hintChatId),
      },
    });
  }

  async getUsersByChatId(chatId: number): Promise<User[]> {
    return prisma.user.findMany({
      where: { members: { some: { chatId: BigInt(chatId) } } },
    });
  }

  async getChatsByUserId(userId: number): Promise<Chat[]> {
    return prisma.chat.findMany({
      where: { members: { some: { userId: BigInt(userId) } } },
    });
  }

  async existsMember(userId: number, chatId: number): Promise<boolean> {
    const member = await prisma.member.findFirst({
      where: {
        userId: BigInt(userId),
        chatId: BigInt(chatId),
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
          memberUserId: BigInt(userId),
          memberChatId: BigInt(chatId),
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
          memberUserId: BigInt(submission.userId),
          memberChatId: BigInt(submission.chatId),
        },
      },
      create: {
        memberUserId: BigInt(submission.userId),
        memberChatId: BigInt(submission.chatId),
        fileId: submission.fileId,
        uploadChatId: BigInt(upload.uploadChatId),
        uploadHintMessageId:
          upload.uploadHintMessageId !== undefined
            ? BigInt(upload.uploadHintMessageId)
            : null,
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
    return `[${formattedUser}](tg://user?id=${Number(user.id)})`;
  }

  private getFormattedUser(user: User) {
    return `${user.name}${user.tag ? ` (${user.tag})` : ""}`;
  }
}
