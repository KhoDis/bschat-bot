import prisma from "../../prisma/client";
import { MusicSubmission } from "@prisma/client";
import { injectable } from "inversify";

@injectable()
export class MusicSubmissionRepository {
  async findById(id: number): Promise<MusicSubmission | null> {
    return prisma.musicSubmission.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  async findUnassignedTracks(): Promise<MusicSubmission[]> {
    return prisma.musicSubmission.findMany({
      where: {
        gameId: null,
      },
      include: {
        user: true,
      },
    });
  }

  async findTracksByGameId(gameId: number): Promise<MusicSubmission[]> {
    return prisma.musicSubmission.findMany({
      where: {
        gameId: gameId,
      },
      include: {
        user: true,
      },
    });
  }

  async updateMediaHint(
    submissionId: number,
    hintChatId: number,
    hintMessageId: number,
  ): Promise<void> {
    await prisma.musicSubmission.update({
      where: { id: submissionId },
      data: { mediaHintMessageId: hintMessageId, mediaHintChatId: hintChatId },
    });
  }

  async findByUserId(userId: number): Promise<MusicSubmission | null> {
    return prisma.musicSubmission.findFirst({
      where: { userId: BigInt(userId) },
      include: {
        user: true,
      },
    });
  }

  async assignTracksToGame(
    submissionIds: number[],
    gameId: number,
  ): Promise<void> {
    await prisma.$transaction(
      submissionIds.map((id) =>
        prisma.musicSubmission.update({
          where: { id },
          data: { gameId },
        }),
      ),
    );
  }

  async createSubmission(
    userId: bigint,
    fileId: string,
    gameId?: number,
  ): Promise<MusicSubmission> {
    return prisma.musicSubmission.create({
      data: {
        userId,
        fileId,
        gameId: gameId || null,
      },
    });
  }

  async update(
    id: number,
    data: { fileId?: string },
  ): Promise<MusicSubmission> {
    return prisma.musicSubmission.update({
      where: { id },
      data,
      include: {
        user: true,
      },
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.musicSubmission.delete({
      where: { id },
    });
  }

  async findAll(): Promise<MusicSubmission[]> {
    return prisma.musicSubmission.findMany({
      include: {
        user: true,
      },
    });
  }

  async findByFileId(fileId: string): Promise<MusicSubmission | null> {
    return prisma.musicSubmission.findFirst({
      where: { fileId },
      include: {
        user: true,
      },
    });
  }
}
