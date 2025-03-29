// import { describe, it, expect, vi, beforeEach } from "vitest";
// import { UserService } from "./UserService";
// import { UserRepository } from "@/bot/repositories/UserRepository";
//
// const mockUserRepository: UserRepository = {
//   upsertUser: vi.fn(),
//   findUsersWithSubmissions: vi.fn(),
//   findSubmissionByUserIdAndChatId: vi.fn(),
//   upsertSubmission: vi.fn(),
//   findUserById: vi.fn(),
//   findUsersByIds: vi.fn(),
// };
//
// describe("UserService", () => {
//   let userService: UserService;
//
//   beforeEach(() => {
//     vi.clearAllMocks();
//     userService = new UserService(mockUserRepository);
//   });
//
//   it("should save or update a user", async () => {
//     const userData = { id: 1, username: "testuser", firstName: "Test" };
//     mockUserRepository.upsertUser = vi.fn().mockResolvedValue(userData);
//
//     const result = await userService.saveOrUpdateUser(userData);
//
//     expect(mockUserRepository.upsertUser).toHaveBeenCalledWith(userData);
//     expect(result).toEqual(userData);
//   });
//
//   it("should retrieve users with submissions", async () => {
//     const users = [
//       { id: 1, name: "User1" },
//       { id: 2, name: "User2" },
//     ];
//     mockUserRepository.findUsersWithSubmissions = vi
//       .fn()
//       .mockResolvedValue(users);
//
//     const result = await userService.getSubmissionUsers();
//
//     expect(mockUserRepository.findUsersWithSubmissions).toHaveBeenCalled();
//     expect(result).toEqual(users);
//   });
//
//   it("should retrieve a submission by user ID", async () => {
//     const userId = 1;
//     const submission = { userId, fileId: "abc123" };
//     mockUserRepository.findSubmissionByUserIdAndChatId = vi
//       .fn()
//       .mockResolvedValue(submission);
//
//     const result = await userService.getSubmissionByUserId(userId);
//
//     expect(mockUserRepository.findSubmissionByUserIdAndChatId).toHaveBeenCalledWith(
//       userId,
//     );
//     expect(result).toEqual(submission);
//   });
//
//   it("should return null if no submission is found", async () => {
//     const userId = 1;
//     mockUserRepository.findSubmissionByUserIdAndChatId = vi.fn().mockResolvedValue(null);
//
//     const result = await userService.getSubmissionByUserId(userId);
//
//     expect(mockUserRepository.findSubmissionByUserIdAndChatId).toHaveBeenCalledWith(
//       userId,
//     );
//     expect(result).toBeNull();
//   });
//
//   it("should save or update a submission", async () => {
//     const submission = { userId: 1, fileId: "file123" };
//     mockUserRepository.upsertSubmission = vi.fn().mockResolvedValue(submission);
//
//     const result = await userService.saveOrUpdateSubmission(submission);
//
//     expect(mockUserRepository.upsertSubmission).toHaveBeenCalledWith(
//       submission,
//     );
//     expect(result).toEqual(submission);
//   });
//
//   it("should format participant names in batches of 5", () => {
//     const participants = [
//       { id: 1n, name: "Alice", tag: "DJ" },
//       { id: 2n, name: "Bob", tag: null },
//       { id: 3n, name: "Charlie", tag: "MC" },
//       { id: 4n, name: "Dave", tag: null },
//       { id: 5n, name: "Eve", tag: "Singer" },
//       { id: 6n, name: "Frank", tag: "Drummer" },
//     ];
//
//     const expectedResult = [
//       "[Alice (DJ)](tg://user?id=1)\n[Bob](tg://user?id=2)\n[Charlie (MC)](tg://user?id=3)\n[Dave](tg://user?id=4)\n[Eve (Singer)](tg://user?id=5)",
//       "[Frank (Drummer)](tg://user?id=6)",
//     ];
//
//     const result = userService.formatPingNames(participants);
//
//     expect(result).toEqual(expectedResult);
//   });
// });
