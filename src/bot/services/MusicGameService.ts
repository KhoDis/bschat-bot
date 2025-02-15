import { Context } from "telegraf";
import { shuffleArray } from "@/utils/arrayUtils";
import { GameRepository } from "../repositories/GameRepository";
import { MusicSubmissionRepository } from "../repositories/MusicSubmissionRepository";
import { botTemplates, getRandomResponse } from "@/config/botTemplates";
import { MusicSubmission } from "@prisma/client";

export class MusicGameService {
  constructor(
    private gameRepository: GameRepository,
    private musicSubmissionRepository: MusicSubmissionRepository,
  ) {}

  async addHint(submissionId: number, hint: string): Promise<void> {
    await this.musicSubmissionRepository.updateHint(submissionId, hint);
  }

  async clearGame(ctx: Context) {
    const game = await this.gameRepository.getCurrentGame();
    if (!game) {
      await ctx.reply(getRandomResponse(botTemplates.gameState.noGame));
      return;
    }
    try {
      await this.gameRepository.deleteGame(game.id);
    } catch (e) {
      await ctx.reply("Брух, что это: " + e);
    }
    await this.musicSubmissionRepository.deleteAll();
    await ctx.reply(getRandomResponse(botTemplates.musicGame.resetGame));
  }

  async isGameStarted(): Promise<boolean> {
    const game = await this.gameRepository.getCurrentGame();
    return !!game;
  }

  async startGame(ctx: Context) {
    const tracks: MusicSubmission[] = shuffleArray(
      await this.musicSubmissionRepository.findAll(),
    );
    if (!tracks.length) {
      await ctx.reply(getRandomResponse(botTemplates.musicGame.noTracks));
      return;
    }

    const game = await this.gameRepository.createGame(tracks);
    await ctx.reply(getRandomResponse(botTemplates.gameState.gameStarted));
    return game;
  }
}
