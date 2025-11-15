import { Chat, User, GameRound, ChatMembership } from '@prisma/client';
import { injectable } from 'inversify';
import prisma from '@/prisma/client';
import { inject } from 'inversify';
import { TYPES } from '@/types';
import { MusicGameRepository } from '../musicGame/music-game.repository';

/**
 * Service for managing ChatMembership, Chat, and User entities
 *
 * Handles automatic membership syncing from Telegram activity
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

  /**
   * Auto-syncs membership when user sends a message in a group chat.
   * Called automatically by middleware in app.ts.
   *
   * This is the ONLY way users join chats now - no manual command needed.
   */
  async autoSyncMembership(userId: number, chatId: number): Promise<void> {
    await prisma.chatMembership.upsert({
      where: {
        userId_chatId: {
          userId: BigInt(userId),
          chatId: BigInt(chatId),
        },
      },
      create: {
        userId: BigInt(userId),
        chatId: BigInt(chatId),
        lastSeen: new Date(),
        isActive: true,
      },
      update: {
        lastSeen: new Date(),
        isActive: true,
      },
    });
  }

  /**
   * Mark member as inactive (e.g., when they leave the chat)
   * Can be called from bot event handlers if needed
   */
  async deactivateMember(userId: number, chatId: number): Promise<void> {
    await prisma.chatMembership.updateMany({
      where: {
        userId: BigInt(userId),
        chatId: BigInt(chatId),
      },
      data: {
        isActive: false,
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
      where: {
        memberships: {
          some: {
            chatId: BigInt(chatId),
            isActive: true,
          },
        },
      },
    });
  }

  async getChatsByUserId(userId: number): Promise<Chat[]> {
    return prisma.chat.findMany({
      where: {
        memberships: {
          some: {
            userId: BigInt(userId),
            isActive: true,
          },
        },
      },
    });
  }

  async existsMember(userId: number, chatId: number): Promise<boolean> {
    const member = await prisma.chatMembership.findFirst({
      where: {
        userId: BigInt(userId),
        chatId: BigInt(chatId),
        isActive: true,
      },
    });
    return member !== null;
  }

  /**
   * Get active memberships for a user with their chats
   */
  async getActiveMemberships(userId: number): Promise<(ChatMembership & { chat: Chat })[]> {
    return prisma.chatMembership.findMany({
      where: {
        userId: BigInt(userId),
        isActive: true,
      },
      include: {
        chat: true,
      },
      orderBy: {
        lastSeen: 'desc',
      },
    });
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
    console.log('[MemberService] saveSubmission called:', {
      userId: submission.userId,
      chatId: submission.chatId,
      uploadChatId: upload.uploadChatId,
      fileId: submission.fileId.substring(0, 20) + '...',
    });
    
    // Get or create LOBBY game
    let game = await this.gameRepository.getCurrentGameByChatId(submission.chatId);
    console.log('[MemberService] Found game:', {
      found: !!game,
      id: game?.id,
      status: game?.status,
    });

    if (!game) {
      console.log('[MemberService] No game found, creating new LOBBY game for chatId:', submission.chatId);
      // OPTION 1: Auto-create lobby
      game = await this.gameRepository.createEmptyLobby(submission.chatId);
      console.log('[MemberService] Created new LOBBY game:', game.id);

      // OPTION 2: Require admin to create lobby first
      // throw new Error('No lobby game exists. Admin must create one first');
    }

    // Upsert DRAFT round
    console.log('[MemberService] Upserting DRAFT round for game:', game.id);
    await this.gameRepository.upsertDraftRound(game.id, {
      userId: submission.userId,
      musicFileId: submission.fileId,
      hintChatId: upload.uploadChatId,
      hintMessageId: upload.uploadHintMessageId ?? undefined,
    });
    console.log('[MemberService] DRAFT round saved successfully');
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
