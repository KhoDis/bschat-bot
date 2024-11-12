import { User } from "@prisma/client";

export interface IUserService {
  registerUser(userId: number, username: string): Promise<void>;
  getUser(userId: number): Promise<User | null>;
}
