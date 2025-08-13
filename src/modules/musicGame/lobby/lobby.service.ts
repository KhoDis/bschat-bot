import { inject, injectable } from "inversify";
import { TYPES } from "@/types";
import prisma from "@/prisma/client";
import {
  defaultGameConfig,
  GameConfig,
  gameConfigSchema,
} from "@/modules/musicGame/config/game-config";

@injectable()
export class LobbyService {
  private draftByChat = new Map<number, GameConfig>();

  constructor() {}

  getDraft(chatId: number): GameConfig {
    return this.draftByChat.get(chatId) ?? defaultGameConfig;
  }

  updateDraft(chatId: number, patch: Partial<GameConfig>): GameConfig {
    const current = this.getDraft(chatId);
    const next = { ...current, ...patch };
    const parsed = gameConfigSchema.parse(next);
    this.draftByChat.set(chatId, parsed);
    return parsed;
  }

  clearDraft(chatId: number) {
    this.draftByChat.delete(chatId);
  }
}
