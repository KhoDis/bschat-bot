import { UserRepository } from "@/bot/repositories/UserRepository";
import { MusicSubmission, User } from "@prisma/client";
import { inject, injectable } from "inversify";
import { TYPES } from "@/types";

@injectable()
export class UserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: UserRepository,
  ) {}

  async saveOrUpdateUser(userData: {
    id: number;
    username?: string | null;
    firstName: string;
  }) {
    return await this.userRepository.upsertUser(userData);
  }

  async getSubmissionUsers(): Promise<User[]> {
    return await this.userRepository.findUsersWithSubmissions();
  }

  async getSubmissionByUserId(userId: number): Promise<MusicSubmission | null> {
    return await this.userRepository.findSubmissionByUserId(userId);
  }

  async saveOrUpdateSubmission(submission: { userId: number; fileId: string }) {
    return await this.userRepository.upsertSubmission(submission);
  }

  // NOTE: https://limits.tginfo.me/en
  // Mentions number in a single message is limited up to 50,
  // only first 5 from list will receive notification
  formatPingNames(participants: User[]): string[] {
    const formattedNames: string[] = [];

    while (participants.length > 0) {
      const batch = participants.splice(0, 5);
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
