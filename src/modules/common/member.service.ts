import { Chat, User, GameRound } from '@prisma/client';
import { injectable } from 'inversify';
import prisma from '@/prisma/client';
import { inject } from 'inversify';
import { TYPES } from '@/types';
import { MusicGameRepository } from '../musicGame/music-game.repository';

/**
 * Service for managing Member, Chat, and User entities
 */
@injectable()
export class MemberService {
  constructor(@inject(TYPES.GameRepository) private gameRepository: MusicGameRepository) {}

  async upsertUser(userData: { id: number; username?: string | null; firstName: string }) {
    const normalizedName = userData.firstName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

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

  /**
   * Get users who have submitted DRAFT rounds in the current lobby
   */
  async getSubmissionUsers(chatId: number): Promise<User[]> {
    return this.gameRepository.getDraftSubmissionUsers(chatId);
  }

  /**
   * Add or update hint for a user's DRAFT round
   */
  async addMusicHint(
    memberUserId: number,
    memberChatId: number,
    hintChatId: number,
    hintMessageId: number,
  ): Promise<void> {
    const game = await this.gameRepository.getCurrentGameByChatId(memberChatId);
    if (!game) {
      throw new Error('No lobby game found');
    }

    const round = await prisma.gameRound.findUnique({
      where: {
        gameId_userId: {
          gameId: game.id,
          userId: BigInt(memberUserId),
        },
      },
    });

    if (!round) {
      throw new Error('No draft round found for user');
    }

    await prisma.gameRound.update({
      where: { id: round.id },
      data: {
        hintChatId: BigInt(hintChatId),
        hintMessageId: BigInt(hintMessageId),
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

  /**
   * Get a user's DRAFT round submission
   */
  async getSubmission(userId: number, chatId: number): Promise<GameRound | null> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) {
      return null;
    }

    return prisma.gameRound.findUnique({
      where: {
        gameId_userId: {
          gameId: game.id,
          userId: BigInt(userId),
        },
      },
    });
  }

  /**
   * Save or update a user's DRAFT round submission
   * FLOW OPTION 1: Auto-create lobby game if none exists
   */
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
    // Get or create LOBBY game
    let game = await this.gameRepository.getCurrentGameByChatId(submission.chatId);
    
    if (!game) {
      // OPTION 1: Auto-create lobby
      game = await this.gameRepository.createEmptyLobby(submission.chatId);
      
      // OPTION 2: Require admin to create lobby first
      // throw new Error('No lobby game exists. Admin must create one first');
    }

    // Upsert DRAFT round
    await this.gameRepository.upsertDraftRound(game.id, {
      userId: submission.userId,
      musicFileId: submission.fileId,
      hintChatId: upload.uploadChatId,
      hintMessageId: upload.uploadHintMessageId,
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
      formattedNames.push(batch.map((p) => this.formatParticipantName(p)).join('\n'));
    }

    return formattedNames;
  }

  private formatParticipantName(user: User): string {
    const formattedUser = this.getFormattedUser(user);
    return `[${formattedUser}](tg://user?id=${Number(user.id)})`;
  }

  private getFormattedUser(user: User) {
    return `${user.name}${user.tag ? ` (${user.tag})` : ''}`;
  }
}
