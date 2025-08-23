import { inject, injectable } from "inversify";
import { TYPES } from "@/types";
import { MusicGameRepository } from "@/modules/musicGame/music-game.repository";
import { TextService } from "@/modules/common/text.service";
import { MemberService } from "@/modules/common/member.service";
import { CommandContext, CallbackQueryContext } from "@/types";
import { Markup } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { Context } from "telegraf";
import { User } from "@prisma/client";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";

/**
 * MusicGameService - Single service handling the entire music guessing game
 *
 * This service consolidates all game logic into one place, eliminating
 * the complexity of multiple fragmented services and circular dependencies.
 *
 * Responsibilities:
 * - Complete game lifecycle management
 * - Round progression and management
 * - Player interaction and scoring
 * - Game state and configuration
 * - UI rendering and user feedback
 */
@injectable()
export class MusicGameService {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: MusicGameRepository,
    @inject(TYPES.TextService) private text: TextService,
    @inject(TYPES.MemberService) private memberService: MemberService,
  ) {}

  // ==================== GAME LIFECYCLE ====================

  /**
   * Sets up a new music guessing game instance
   */
  async initiateGameSetup(ctx: CommandContext): Promise<void> {
    const keyboard = Markup.inlineKeyboard([
      Markup.button.callback("Начать игру", "game:start"),
    ]);

    await ctx.reply(this.text.get("musicGame.welcome"), {
      reply_markup: keyboard.reply_markup,
    });

    // Notify all participants in the current chat
    const users = await this.memberService.getSubmissionUsers(ctx.chat.id);
    this.memberService.formatPingNames(users).forEach((batch) => {
      ctx.reply(batch, {
        parse_mode: "Markdown",
      });
    });
  }

  /**
   * Starts a new game if none exists or continues the current one
   */
  async startGame(ctx: IBotContext): Promise<void> {
    if (!ctx.chat) return;

    try {
      // Check if there's already an active game
      const activeGame = await this.gameRepository.getCurrentGameByChatId(
        ctx.chat.id,
      );
      if (activeGame) {
        await ctx.reply("Уже есть активная игра. Продолжаем её.");
        return;
      }

      // Ensure there are submissions to create a game from
      const users = await this.memberService.getSubmissionUsers(ctx.chat.id);
      if (!users.length) {
        await ctx.reply(this.text.get("musicGame.noTracks"));
        return;
      }

      // Create a new game with the submitted tracks
      const game = await this.gameRepository.transferSubmissions(ctx.chat.id);
      await ctx.reply(this.text.get("musicGame.gameStarted"));

      // Immediately start the first round
      await this.startRound(ctx, Number(game.chatId));
    } catch (error) {
      console.error("Error starting game:", error);
      await ctx.reply("Произошла ошибка при запуске игры");
    }
  }

  /**
   * Starts a game using a provided config (from lobby)
   */
  async startGameWithConfig(
    ctx: IBotContext,
    config: Record<string, unknown>,
  ): Promise<void> {
    if (!ctx.chat) return;

    try {
      const activeGame = await this.gameRepository.getCurrentGameByChatId(
        ctx.chat.id,
      );
      if (activeGame) {
        await ctx.reply("Уже есть активная игра. Продолжаем её.");
        return;
      }

      const users = await this.memberService.getSubmissionUsers(ctx.chat.id);
      if (!users.length) {
        await ctx.reply(this.text.get("musicGame.noTracks"));
        return;
      }

      // Create a new game and persist config + set ACTIVE
      const game = await this.gameRepository.transferSubmissions(ctx.chat.id);
      await this.gameRepository.updateGameConfig(game.id, {
        status: "ACTIVE",
        config,
      } as any);

      await ctx.reply(this.text.get("musicGame.gameStarted"));
      await this.startRound(ctx, Number(game.chatId));
    } catch (error) {
      console.error("Error starting game with config:", error);
      await ctx.reply("Произошла ошибка при запуске игры");
    }
  }

  /**
   * Ends the current active game
   */
  async endGame(ctx: IBotContext): Promise<void> {
    if (!ctx.chat) return;

    try {
      const game = await this.gameRepository.getCurrentGameByChatId(
        ctx.chat.id,
      );
      if (!game) {
        await ctx.reply("Нет активной игры для завершения.");
        return;
      }

      await this.gameRepository.endGame(game.id);
      await ctx.reply("Игра завершена!");
    } catch (error) {
      await ctx.reply("Нет активной игры для завершения.");
    }
  }

  // ==================== ROUND MANAGEMENT ====================

  /**
   * Starts a new round for the current game
   */
  async startRound(ctx: IBotContext, chatId: number): Promise<void> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) {
      await ctx.reply(this.text.get("musicGame.noGame"));
      return;
    }

    const gameSequence = await this.gameRepository.getRoundBySequence(
      game.id,
      game.currentRound,
    );
    if (!gameSequence) {
      await this.handleGameEnd(ctx, chatId);
      return;
    }

    const participants = await this.gameRepository.getParticipants(game.id);
    await this.playRound(ctx, participants, gameSequence);

    // Schedule hint from config
    try {
      const config = (game as any).config as { hintDelaySec?: number } | null;
      if (config?.hintDelaySec && ctx.chat) {
        const key = `hint:${gameSequence.id}`;
        // Note: We'll need to implement a simple scheduler or use the existing one
        setTimeout(async () => {
          await this.showHint(ctx, chatId);
        }, config.hintDelaySec * 1000);
      }
    } catch (error) {
      console.error("Failed to schedule round events:", error);
    }
  }

  /**
   * Processes a player's guess
   */
  async processGuess(
    ctx: CallbackQueryContext,
    roundId: number,
    guessedUserId: number,
  ): Promise<void> {
    if (!ctx.chat) return;

    try {
      const round = await this.gameRepository.findRoundById(roundId);
      if (!round) {
        await ctx.reply("Раунд не найден.");
        return;
      }

      const game = await this.gameRepository.getCurrentGameByChatId(
        ctx.chat.id,
      );
      if (!game) {
        await ctx.reply("Игра не найдена.");
        return;
      }

      // Check if user already guessed
      const existingGuess = await this.gameRepository.findGuess(
        roundId,
        ctx.from!.id,
      );
      if (existingGuess) {
        await ctx.answerCbQuery("Вы уже угадывали в этом раунде!");
        return;
      }

      // Calculate points based on correctness
      const isCorrect = guessedUserId === Number(round.userId);
      const points = this.calculatePoints(isCorrect, game.currentRound);

      // Save the guess
      await this.gameRepository.createGuess({
        roundId,
        userId: ctx.from!.id,
        guessedId: guessedUserId,
        isCorrect,
        points,
        isLateGuess: false,
      });

      // Update round info
      await this.updateRoundInfo(ctx, roundId);

      // Check if all players have guessed
      const allGuessed = await this.checkAllPlayersGuessed(roundId);
      if (allGuessed) {
        await this.advanceToNextRound(ctx, game.id);
      }

      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error processing guess:", error);
      await ctx.answerCbQuery("Произошла ошибка при обработке ответа.");
    }
  }

  /**
   * Shows a hint for the current round
   */
  async showHint(ctx: Context, chatId: number): Promise<void> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) {
      await ctx.reply(this.text.get("musicGame.noGame"));
      return;
    }

    const round = game.rounds.find((r) => r.roundIndex === game.currentRound);
    if (!round) {
      await ctx.reply(this.text.get("rounds.noCurrentRound"));
      return;
    }

    if (round.hintShownAt) {
      await ctx.reply(this.text.get("hints.hintAlreadyShown"));
      return;
    }

    await this.gameRepository.showHint(round.id);

    if (ctx.chat && round.hintChatId && round.hintMessageId) {
      try {
        await ctx.telegram.copyMessage(
          ctx.chat.id,
          Number(round.hintChatId),
          Number(round.hintMessageId),
        );
      } catch (error) {
        console.error("Failed to copy hint message:", error);
        await ctx.reply(this.text.get("hints.hintLayout"));
      }
      return;
    }

    await ctx.reply(this.text.get("hints.hintLayout"));
  }

  /**
   * Advances to the next round
   */
  async advanceToNextRound(ctx: Context, gameId: number): Promise<void> {
    const game = await this.gameRepository.getGameById(gameId);
    if (!game) return;

    await ctx.reply(this.text.get("rounds.nextRound"));
    await this.gameRepository.updateGameRound(gameId, game.currentRound + 1);
    await this.startRound(ctx as any, Number(game.chatId));
  }

  // ==================== GAME STATE & INFO ====================

  /**
   * Lists all games for the current chat
   */
  async listGames(ctx: CommandContext): Promise<void> {
    const games = await this.gameRepository.getGamesOfChat(ctx.chat.id);

    if (!games.length) {
      await ctx.reply("Нет сохранённых игр.");
      return;
    }

    const gamesList = games
      .map((game) => {
        const status = game.activeInChat ? "Активная" : "Завершена";
        return `ID: ${game.id} | Создана: ${game.createdAt.toLocaleDateString()} | Статус: ${status}`;
      })
      .join("\n");

    await ctx.reply(`Список игр:\n${gamesList}`);
  }

  /**
   * Shows information about the current active game
   */
  async showActiveGameInfo(ctx: CommandContext): Promise<void> {
    const game = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);

    if (!game) {
      await ctx.reply(`Активная игра для чата ${ctx.chat.id} не найдена`);
      return;
    }

    const gameInfo = [
      `Информация об игре:`,
      `ID: ${game.id}`,
      `Создана: ${game.createdAt.toLocaleDateString()}`,
      `Статус: ${game.activeInChat ? "Активная" : "Завершена"}`,
      `Текущий раунд: ${game.currentRound + 1}`,
      `Всего раундов: ${game.rounds.length}`,
    ];

    await ctx.reply(gameInfo.join("\n"));
  }

  /**
   * Gets the current game state
   */
  async getGameState(chatId: number) {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) return null;

    const currentRound = game.rounds.find(
      (r) => r.roundIndex === game.currentRound,
    );
    const participants = await this.gameRepository.getParticipants(game.id);

    return {
      gameId: game.id,
      currentRound: game.currentRound,
      totalRounds: game.rounds.length,
      status: game.status,
      participants: participants.length,
      currentRoundData: currentRound,
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async handleGameEnd(ctx: IBotContext, chatId: number): Promise<void> {
    await ctx.reply(this.text.get("rounds.noMoreRounds"));
    await this.showLeaderboard(ctx, chatId);
    await this.endGame(ctx);
  }

  private async playRound(
    ctx: Context,
    participants: User[],
    currentRound: any,
  ): Promise<void> {
    const buttons = participants.map((user) => ({
      text: user.name,
      callback_data: `guess:${currentRound.id}_${user.id}`,
    }));

    await ctx.replyWithAudio(currentRound.musicFileId, {
      caption: this.text.get("rounds.playRound"),
      reply_markup: { inline_keyboard: this.chunkButtons(buttons, 3) },
    });

    await this.sendRoundInfo(ctx, currentRound.id);
  }

  private async sendRoundInfo(ctx: Context, roundId: number): Promise<void> {
    const round = await this.gameRepository.findRoundById(roundId);
    if (!round) {
      await ctx.reply("Раунд не найден: " + roundId);
      return;
    }

    const info = await this.formatRoundInfo(round);
    const controls = [
      [
        { text: "💡 Hint Now", callback_data: `round:hint:${round.id}` },
        { text: "🔁 Replay", callback_data: `round:replay:${round.id}` },
      ],
      [
        { text: "⏭️ Skip", callback_data: `round:skip:${round.id}` },
        { text: "🏁 Reveal", callback_data: `round:reveal:${round.id}` },
      ],
    ];

    if (round.infoMessageId) {
      try {
        await ctx.telegram.editMessageText(
          round.game.chatId.toString(),
          Number(round.infoMessageId),
          undefined,
          info,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: controls } },
        );
      } catch (error) {
        console.error("Failed to edit message, sending new one:", error);
        await this.sendNewRoundInfo(ctx, round, info);
      }
    } else {
      await this.sendNewRoundInfo(ctx, round, info);
    }
  }

  private async sendNewRoundInfo(
    ctx: Context,
    round: any,
    info: string,
  ): Promise<void> {
    const controls = [
      [
        { text: "💡 Hint Now", callback_data: `round:hint:${round.id}` },
        { text: "🔁 Replay", callback_data: `round:replay:${round.id}` },
      ],
      [
        { text: "⏭️ Skip", callback_data: `round:skip:${round.id}` },
        { text: "🏁 Reveal", callback_data: `round:reveal:${round.id}` },
      ],
    ];
    const message = await ctx.reply(info, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: controls },
    });
    await this.gameRepository.updateRoundMessageInfo(
      round.id,
      message.message_id,
    );
  }

  private async updateRoundInfo(ctx: Context, roundId: number): Promise<void> {
    const round = await this.gameRepository.findRoundById(roundId);
    if (!round) return;

    const info = await this.formatRoundInfo(round);
    await this.sendRoundInfo(ctx, roundId);
  }

  private async formatRoundInfo(round: any): Promise<string> {
    const notYetGuessed = await this.gameRepository.getUsersNotGuessed(
      round.id,
    );

    return `
      🎯 Раунд ${round.roundIndex + 1} - продолжаем веселиться!
      ${round.hintShownAt ? "💡 Подсказка была показана (для особо одарённых)" : ""}
      
      ${this.text.get("rounds.roundInfo.thinking")}: ${notYetGuessed.map((u: any) => u.name).join(", ")}
      
      ${this.text.get("rounds.roundInfo.correct")}: ${
        round.guesses
          .filter((g: any) => g.guessedId === round.userId)
          .map(
            (g: any) =>
              `${g.user.name} (${g.points} ${this.getPointsWord(g.points)})`,
          )
          .join(", ") || "Пока никто! Неужели так сложно?"
      }
      
      ${this.text.get("rounds.roundInfo.wrong")}: ${
        round.guesses
          .filter((g: any) => g.guessedId !== round.userId)
          .map((g: any) => g.user.name)
          .join(", ") || "Пока никто не ошибся. Но это ненадолго!"
      }
    `;
  }

  private async showLeaderboard(ctx: Context, chatId: number): Promise<void> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) return;

    const participants = await this.gameRepository.getParticipants(game.id);

    const leaderboard = participants
      .map((user: any) => {
        return `${user.name}: 0 очков`; // Simplified for now
      })
      .sort((a: string, b: string) => {
        const scoreA = parseInt(a.match(/(\d+)/)?.[1] || "0");
        const scoreB = parseInt(b.match(/(\d+)/)?.[1] || "0");
        return scoreB - scoreA;
      });

    await ctx.reply(`🏆 Итоговая таблица:\n\n${leaderboard.join("\n")}`);
  }

  private async checkAllPlayersGuessed(roundId: number): Promise<boolean> {
    const round = await this.gameRepository.findRoundById(roundId);
    if (!round) return false;

    const participants = await this.gameRepository.getParticipants(
      round.gameId,
    );
    const notYetGuessed = await this.gameRepository.getUsersNotGuessed(roundId);

    return notYetGuessed.length === 0;
  }

  private calculatePoints(isCorrect: boolean, roundNumber: number): number {
    if (!isCorrect) return 0;

    // Simple scoring: more points for later rounds
    return Math.max(1, 10 - roundNumber);
  }

  private getPointsWord(points: number): string {
    if (points === 1) return "очко";
    if (points >= 2 && points <= 4) return "очка";
    return "очков";
  }

  private chunkButtons(buttons: InlineKeyboardButton[], size: number) {
    return Array.from({ length: Math.ceil(buttons.length / size) }, (_, i) =>
      buttons.slice(i * size, i * size + size),
    );
  }
}
