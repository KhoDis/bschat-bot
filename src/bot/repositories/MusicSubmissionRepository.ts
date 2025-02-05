import { AppMusicSubmission, schemas } from "../../schemas";
import prisma from "../../prisma/client";

export class MusicSubmissionRepository {
  async findById(id: number): Promise<AppMusicSubmission | null> {
    const submission = await prisma.musicSubmission.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    return submission ? schemas.app.musicSubmission.parse(submission) : null;
  }

  async updateHint(submissionId: number, hint: string): Promise<void> {
    await prisma.musicSubmission.update({
      where: { id: submissionId },
      data: { hint },
    });
  }

  async findByUserId(userId: number): Promise<AppMusicSubmission | null> {
    const submission = await prisma.musicSubmission.findFirst({
      where: { userId: BigInt(userId) },
      include: {
        user: true,
      },
    });

    return submission ? schemas.app.musicSubmission.parse(submission) : null;
  }

  async deleteAll() {
    await prisma.musicSubmission.deleteMany();
  }

  async create(data: {
    fileId: string;
    userId: number;
  }): Promise<AppMusicSubmission> {
    const submission = await prisma.musicSubmission.create({
      data: {
        fileId: data.fileId,
        userId: BigInt(data.userId),
      },
      include: {
        user: true,
      },
    });

    return schemas.app.musicSubmission.parse(submission);
  }

  async update(
    id: number,
    data: { fileId?: string },
  ): Promise<AppMusicSubmission> {
    const submission = await prisma.musicSubmission.update({
      where: { id },
      data,
      include: {
        user: true,
      },
    });

    return schemas.app.musicSubmission.parse(submission);
  }

  async delete(id: number): Promise<void> {
    await prisma.musicSubmission.delete({
      where: { id },
    });
  }

  async findAll(): Promise<AppMusicSubmission[]> {
    const submissions = await prisma.musicSubmission.findMany({
      include: {
        user: true,
      },
    });
    return submissions.map((submission) =>
      schemas.app.musicSubmission.parse(submission),
    );
  }

  async findByFileId(fileId: string): Promise<AppMusicSubmission | null> {
    const submission = await prisma.musicSubmission.findFirst({
      where: { fileId },
      include: {
        user: true,
      },
    });

    return submission ? schemas.app.musicSubmission.parse(submission) : null;
  }
}
