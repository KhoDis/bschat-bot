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

  async updateHint(submissionId: number, hint: string): Promise<void> {
    await prisma.musicSubmission.update({
      where: { id: submissionId },
      data: { hint },
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

  async deleteAll() {
    await prisma.musicSubmission.deleteMany();
  }

  async create(data: {
    fileId: string;
    userId: number;
  }): Promise<MusicSubmission> {
    return prisma.musicSubmission.create({
      data: {
        fileId: data.fileId,
        userId: BigInt(data.userId),
      },
      include: {
        user: true,
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
