import { IUserRepository } from "@/bot/repositories/UserRepository";
import { MusicSubmission, User } from "@/types";

export interface IUserService {
  saveOrUpdateUser(userData: {
    id: number;
    username?: string | null;
    firstName: string;
  }): Promise<User>;
  getSubmissionUsers(): Promise<User[]>;
  getSubmissionByUserId(userId: number): Promise<MusicSubmission | null>;
  saveOrUpdateSubmission(submission: {
    userId: number;
    fileId: string;
  }): Promise<MusicSubmission>;
}

export class UserService implements IUserService {
  constructor(private userRepository: IUserRepository) {}

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

  // TODO: consider Telegram ping limit in one message
  formatPingNames(participants: User[]): string {
    return participants.map((p) => this.formatParticipantName(p)).join("\n");
  }

  private formatParticipantName(user: User): string {
    const formattedUser = this.getFormattedUser(user);
    return `[${formattedUser}](tg://user?id=${user.id})`;
  }

  private getFormattedUser(user: User) {
    return `${user.name} ${user.tag ? `(${user.tag})` : ""}`;
  }
}
