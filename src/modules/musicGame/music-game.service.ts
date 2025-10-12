import { inject, injectable } from 'inversify';
import { TYPES } from '@/types';
import { MusicGameRepository } from '@/modules/musicGame/music-game.repository';
import { TextService } from '@/modules/common/text.service';
import { MemberService } from '@/modules/common/member.service';
import { CommandContext, CallbackQueryContext } from '@/types';
import { Markup } from 'telegraf';
import { IBotContext } from '@/context/context.interface';
import { Context } from 'telegraf';
import { User } from '@prisma/client';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';
import { SchedulerService } from '@/modules/musicGame/scheduler/scheduler.service';
import { GameConfig } from '@/modules/musicGame/config/game-config';
import { UiRenderer } from '@/modules/musicGame/ui.renderer';
import { ActionCodec } from '@/modules/musicGame/action.codec';
import { GuessService } from '@/modules/musicGame/guess.service';

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
    @inject(TYPES.SchedulerService) private scheduler: SchedulerService,
    @inject(TYPES.UiRenderer) private ui: UiRenderer,
    @inject(TYPES.ActionCodec) private codec: ActionCodec,
    @inject(TYPES.GuessService) private guessService: GuessService,
  ) {}

  // ==================== GAME LIFECYCLE ====================

  /**
   * Sets up a new music guessing game instance
   */
  async initiateGameSetup(ctx: CommandContext): Promise<void> {
    const keyboard = Markup.inlineKeyboard([Markup.button.callback('Начать игру', 'game:start')]);

    await ctx.reply(this.text.get('musicGame.welcome'), {
      reply_markup: keyboard.reply_markup,
    });

    // Notify all participants in the current chat
    const users = await this.memberService.getSubmissionUsers(ctx.chat.id);
    this.memberService.formatPingNames(users).forEach((batch) => {
      ctx.reply(batch, {
        parse_mode: 'Markdown',
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
      const activeGame = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
      if (activeGame) {
        await ctx.reply(this.text.get('musicGame.activeExists'));
        return;
      }

      // Ensure there are submissions to create a game from
      const users = await this.memberService.getSubmissionUsers(ctx.chat.id);
      if (!users.length) {
        await ctx.reply(this.text.get('musicGame.noTracks'));
        return;
      }

      // Create a new game with the submitted tracks
      const game = await this.gameRepository.transferSubmissions(ctx.chat.id);
      await ctx.reply(this.text.get('musicGame.gameStarted'));

      // Immediately start the first round
      await this.startRound(ctx, Number(game.chatId));
    } catch (error) {
      console.error('Error starting game:', error);
      await ctx.reply(this.text.get('musicGame.startError'));
    }
  }

  /**
   * Starts a game using a provided config (from lobby)
   */
  async startGameWithConfig(ctx: IBotContext, config: GameConfig): Promise<void> {
    if (!ctx.chat) return;

    try {
      const activeGame = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
      if (activeGame) {
        await ctx.reply(this.text.get('musicGame.activeExists'));
        return;
      }

      const users = await this.memberService.getSubmissionUsers(ctx.chat.id);
      if (!users.length) {
        await ctx.reply(this.text.get('musicGame.noTracks'));
        return;
      }

      // Create a new game and persist config + set ACTIVE
      const game = await this.gameRepository.transferSubmissions(ctx.chat.id);
      await this.gameRepository.updateGameConfig(game.id, {
        status: 'ACTIVE',
        config,
      } as any);

      await ctx.reply(this.text.get('musicGame.gameStarted'));
      await this.startRound(ctx, Number(game.chatId));
    } catch (error) {
      console.error('Error starting game with config:', error);
      await ctx.reply(this.text.get('musicGame.startError'));
    }
  }

  /**
   * Ends the current active game
   */
  async endGame(ctx: IBotContext): Promise<void> {
    if (!ctx.chat) return;

    try {
      const game = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
      if (!game) {
        await ctx.reply(this.text.get('musicGame.noActive'));
        return;
      }

      await this.gameRepository.endGame(game.id);
      await ctx.reply(this.text.get('musicGame.ended'));
    } catch (error) {
      await ctx.reply(this.text.get('musicGame.noActive'));
    }
  }

  // ==================== ROUND MANAGEMENT ====================

  /**
   * Starts a new round for the current game
   */
  async startRound(ctx: IBotContext, chatId: number): Promise<void> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) {
      await ctx.reply(this.text.get('musicGame.noGame'));
      return;
    }

    const gameSequence = await this.gameRepository.getRoundBySequence(game.id, game.currentRound);
    if (!gameSequence) {
      await this.handleGameEnd(ctx, chatId);
      return;
    }

    const participants = await this.gameRepository.getParticipants(game.id);
    await this.playRound(ctx, participants, gameSequence);

    // Schedule round events based on config
    try {
      const config = (game as any).config as {
        hintDelaySec?: number;
        advanceDelaySec?: number;
        autoAdvance?: boolean;
      } | null;

      if (config?.hintDelaySec && ctx.chat) {
        const hintKey = `hint:${gameSequence.id}`;
        this.scheduler.scheduleOnce(
          hintKey,
          new Date(Date.now() + config.hintDelaySec * 1000),
          async () => {
            await this.showHint(ctx, chatId);
          },
        );
      }

      // Schedule round advancement if auto-advance is enabled
      if (config?.autoAdvance && config?.advanceDelaySec && ctx.chat) {
        const advanceKey = `advance:${gameSequence.id}`;
        this.scheduler.scheduleOnce(
          advanceKey,
          new Date(Date.now() + config.advanceDelaySec * 1000),
          async () => {
            await this.advanceToNextRound(ctx, game.id);
          },
        );
      }
    } catch (error) {
      console.error('Failed to schedule round events:', error);
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
      const guessingUserId = ctx.from!.id;
      const result = await this.guessService.processGuess({
        chatId: ctx.chat.id,
        roundId,
        guessingUserId,
      });

      if (result === 'NO_ROUND') {
        await ctx.reply(this.text.get('rounds.notFound'));
        return;
      }
      if (result === 'NO_GAME') {
        await ctx.reply(this.text.get('musicGame.notFound'));
        return;
      }
      if (result === 'ALREADY_GUESSED') {
        await ctx.answerCbQuery(this.text.get('guessing.alreadyGuessed'));
        return;
      }

      // Update round info
      await this.updateRoundInfo(ctx, roundId);

      // Check if all players have guessed
      // const allGuessed = await this.checkAllPlayersGuessed(roundId);
      // if (allGuessed) {
      //   await this.advanceToNextRound(ctx, game.id);
      // }

      await ctx.answerCbQuery(
        result.isCorrect
          ? this.text.get('guessing.correctGuess', { points: result.points })
          : this.text.get('guessing.wrongGuess'),
      );
    } catch (error) {
      console.error('Error processing guess:', error);
      await ctx.answerCbQuery(this.text.get('guessing.error'));
    }
  }

  /**
   * Shows a hint for the current round
   */
  async showHint(ctx: Context, chatId: number): Promise<void> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) {
      await ctx.reply(this.text.get('musicGame.noGame'));
      return;
    }

    const round = game.rounds.find((r) => r.roundIndex === game.currentRound);
    if (!round) {
      await ctx.reply(this.text.get('rounds.noCurrentRound'));
      return;
    }

    if (round.hintShownAt) {
      await ctx.reply(this.text.get('hints.hintAlreadyShown'));
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
        console.error('Failed to copy hint message:', error);
        await ctx.reply(this.text.get('hints.hintLayout'));
      }
      return;
    }

    await ctx.reply(this.text.get('hints.hintLayout'));
  }

  /**
   * Advances to the next round
   */
  async advanceToNextRound(ctx: Context, gameId: number): Promise<void> {
    const game = await this.gameRepository.getGameById(gameId);
    if (!game) return;

    await ctx.reply(this.text.get('rounds.nextRound'));
    await this.gameRepository.updateGameRound(gameId, game.currentRound + 1);
    await this.startRound(ctx as any, Number(game.chatId));
  }

  /**
   * Replays the current round's music
   */
  async replayCurrentRound(ctx: Context, chatId: number): Promise<void> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) {
      await ctx.reply(this.text.get('musicGame.noGame'));
      return;
    }

    const gameSequence = await this.gameRepository.getRoundBySequence(game.id, game.currentRound);
    if (!gameSequence) {
      await ctx.reply(this.text.get('rounds.noRound'));
      return;
    }

    const participants = await this.gameRepository.getParticipants(game.id);
    await this.playRound(ctx, participants, gameSequence);
  }

  /**
   * Skips the current round and advances to the next
   */
  async skipCurrentRound(ctx: Context, chatId: number): Promise<void> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) {
      await ctx.reply(this.text.get('musicGame.noGame'));
      return;
    }

    await ctx.reply(this.text.get('rounds.skipped'));
    await this.advanceToNextRound(ctx, game.id);
  }

  /**
   * Reveals the answer for the current round
   */
  async revealCurrentRound(ctx: Context, chatId: number): Promise<void> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) {
      await ctx.reply(this.text.get('musicGame.noGame'));
      return;
    }

    const round = game.rounds.find((r) => r.roundIndex === game.currentRound);
    if (!round) {
      await ctx.reply(this.text.get('rounds.noCurrentRound'));
      return;
    }

    const participants = await this.gameRepository.getParticipants(game.id);
    const correctUser = participants.find((u) => u.id === round.userId);
    await ctx.reply(
      this.text.get('rounds.reveal', { player: correctUser?.name || 'Unknown' } as any),
    );
  }

  // ==================== GAME STATE & INFO ====================

  /**
   * Lists all games for the current chat
   */
  async listGames(ctx: CommandContext): Promise<void> {
    const games = await this.gameRepository.getGamesOfChat(ctx.chat.id);

    if (!games.length) {
      await ctx.reply(this.text.get('musicGame.noSaved'));
      return;
    }

    const gamesList = games
      .map((game) => {
        const status = game.activeInChat ? 'Активная' : 'Завершена';
        return `ID: ${game.id} | Создана: ${game.createdAt.toLocaleDateString()} | Статус: ${status}`;
      })
      .join('\n');

    await ctx.reply(this.text.get('musicGame.savedList', { gamesList } as any));
  }

  /**
   * Shows information about the current active game
   */
  async showActiveGameInfo(ctx: CallbackQueryContext | CommandContext): Promise<void> {
    if (!ctx.chat) {
      await ctx.reply(this.text.get('chat.notFound'));
      return;
    }
    const game = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);

    if (!game) {
      await ctx.reply(this.text.get('musicGame.activeNotFound', { chatId: ctx.chat.id } as any));
      return;
    }

    const gameInfo = [
      `Информация об игре:`,
      `ID: ${game.id}`,
      `Создана: ${game.createdAt.toLocaleDateString()}`,
      `Статус: ${game.activeInChat ? 'Активная' : 'Завершена'}`,
      `Текущий раунд: ${game.currentRound + 1}`,
      `Всего раундов: ${game.rounds.length}`,
    ];

    await ctx.reply(this.text.get('musicGame.activeInfo', { info: gameInfo.join('\n') } as any));
  }

  /**
   * Gets the current game state
   */
  async getGameState(chatId: number) {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) return null;

    const currentRound = game.rounds.find((r) => r.roundIndex === game.currentRound);
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

  /**
   * List all players in the current game
   */
  async listPlayers(ctx: CommandContext): Promise<void> {
    const submissionUsers = await this.memberService.getSubmissionUsers(ctx.chat.id);

    if (!submissionUsers.length) {
      await ctx.reply(this.text.get('musicGame.noPlayers'));
      return;
    }

    const users = this.memberService.formatPingNames(submissionUsers).join('\n');

    await ctx.reply(
      this.text.get('musicGame.listPlayers', {
        playersCount: submissionUsers.length,
        playersList: users,
      }),
      {
        parse_mode: 'Markdown',
        disable_notification: true,
      },
    );
  }

  /**
   * Ping all players in the current game
   */
  async pingPlayers(ctx: CommandContext): Promise<void> {
    const users = await this.memberService.getSubmissionUsers(ctx.chat.id);

    if (!users.length) {
      await ctx.reply(this.text.get('musicGame.noPlayers'));
      return;
    }

    this.memberService.formatPingNames(users).forEach((batch) => {
      ctx.reply(batch, {
        parse_mode: 'Markdown',
        disable_notification: false,
      });
    });
  }

  /**
   * Get game statistics
   */
  async getGameStats(ctx: CommandContext): Promise<void> {
    const game = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
    if (!game) {
      await ctx.reply(this.text.get('musicGame.noActive'));
      return;
    }

    const userStats = await this.calculateUserStats(game.id);
    const trackDifficulty = await this.calculateTrackDifficulty(game.id);

    const statsText = [
      '📊 Статистика игры:',
      `🎯 Текущий раунд: ${game.currentRound + 1}/${game.rounds.length}`,
      `👥 Участников: ${userStats.size}`,
      '',
      '🏆 Топ игроков:',
      ...Array.from(userStats.entries())
        .sort(([, a], [, b]) => b.totalPoints - a.totalPoints)
        .slice(0, 3)
        .map(
          ([userId, stats], index) =>
            `${index + 1}. ${stats.totalPoints} очков (🎯 ${stats.correct}, ❌ ${stats.incorrect})`,
        ),
      '',
      '🎵 Сложность треков:',
      ...trackDifficulty
        .sort((a, b) => b.correctGuesses - a.correctGuesses)
        .slice(0, 3)
        .map((item) => `${item.player}: ${item.correctGuesses} угадано`),
    ].join('\n');

    await ctx.reply(this.text.get('musicGame.stats', { stats: statsText } as any));
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async handleGameEnd(ctx: IBotContext, chatId: number): Promise<void> {
    await ctx.reply(this.text.get('rounds.noMoreRounds'));
    await this.showLeaderboard(ctx, chatId);
    await this.endGame(ctx);
  }

  private async playRound(ctx: Context, participants: User[], currentRound: any): Promise<void> {
    const buttons = participants.map((user) => ({
      text: user.name,
      callback_data: this.codec.encode('guess', currentRound.id, user.id),
    }));

    await ctx.replyWithAudio(currentRound.musicFileId, {
      caption: this.text.get('rounds.playRound'),
      reply_markup: { inline_keyboard: this.chunkButtons(buttons, 3) },
    });

    await this.sendRoundInfo(ctx, currentRound.id);
  }

  private async sendRoundInfo(ctx: Context, roundId: number): Promise<void> {
    const round = await this.gameRepository.findRoundById(roundId);
    if (!round) {
      await ctx.reply(this.text.get('rounds.notFound'));
      return;
    }

    const info = await this.formatRoundInfo(round);
    const controls = this.ui.roundControls(round.id);

    if (round.infoMessageId) {
      try {
        await ctx.telegram.editMessageText(
          round.game.chatId.toString(),
          Number(round.infoMessageId),
          undefined,
          info,
          { parse_mode: 'HTML', reply_markup: { inline_keyboard: controls } },
        );
      } catch (error) {
        console.error('Failed to edit message, sending new one:', error);
        await this.sendNewRoundInfo(ctx, round, info);
      }
    } else {
      await this.sendNewRoundInfo(ctx, round, info);
    }
  }

  private async sendNewRoundInfo(ctx: Context, round: any, info: string): Promise<void> {
    const controls = this.ui.roundControls(round.id);
    const message = await ctx.reply(info, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: controls },
    });
    await this.gameRepository.updateRoundMessageInfo(round.id, message.message_id);
  }

  private async updateRoundInfo(ctx: Context, roundId: number): Promise<void> {
    const round = await this.gameRepository.findRoundById(roundId);
    if (!round) return;

    const info = await this.formatRoundInfo(round);
    await this.sendRoundInfo(ctx, roundId);
  }

  private async formatRoundInfo(round: any): Promise<string> {
    const notYetGuessed = await this.gameRepository.getUsersNotGuessed(round.id);

    return `
      🎯 Раунд ${round.roundIndex + 1} - продолжаем веселиться!
      ${round.hintShownAt ? '💡 Подсказка была показана (для особо одарённых)' : ''}
      
      ${this.text.get('rounds.roundInfo.thinking')}: ${notYetGuessed.map((u: any) => u.name).join(', ')}
      
      ${this.text.get('rounds.roundInfo.correct')}: ${
        round.guesses
          .filter((g: any) => g.guessedId === round.userId)
          .map((g: any) => `${g.user.name} (${g.points} ${this.getPointsWord(g.points)})`)
          .join(', ') || 'Пока никто! Неужели так сложно?'
      }
      
      ${this.text.get('rounds.roundInfo.wrong')}: ${
        round.guesses
          .filter((g: any) => g.guessedId !== round.userId)
          .map((g: any) => g.user.name)
          .join(', ') || 'Пока никто не ошибся. Но это ненадолго!'
      }
    `;
  }

  private async showLeaderboard(ctx: Context, chatId: number): Promise<void> {
    const leaderboard = await this.generateLeaderboard(chatId);
    if (!leaderboard) {
      await ctx.reply(this.text.get('leaderboard.error'));
      return;
    }
    await ctx.reply(leaderboard);
  }

  private async generateLeaderboard(chatId: number): Promise<string | null> {
    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) {
      return null;
    }

    const userStats = await this.calculateUserStats(game.id);

    const getUserByIdMap = new Map<number, User>();
    for (const round of game.rounds) {
      getUserByIdMap.set(Number(round.userId), round.user);
    }

    const sortedLeaderboard = [...userStats.entries()]
      .sort(([, a], [, b]) => b.totalPoints - a.totalPoints)
      .map(
        ([userId, stats], index) =>
          `${index + 1}. ${getUserByIdMap.get(userId)?.name || 'Unknown'} — 🏆 ${
            stats.totalPoints
          } очков (🎯 ${stats.correct} угадано, ❌ ${stats.incorrect} не угадано)`,
      );

    const trackDifficulty = await this.calculateTrackDifficulty(game.id);
    const sortedTrackDifficulty = trackDifficulty
      .sort((a, b) => b.correctGuesses - a.correctGuesses)
      .map((item) => `${item.index + 1}. ${item.player} — 🎯 ${item.correctGuesses}`);

    const mostPoints = (await Promise.all(sortedLeaderboard)).join('\n');

    return [
      this.text.get('leaderboard.mostPoints'),
      mostPoints,
      this.text.get('leaderboard.leastGuessed'),
      sortedTrackDifficulty.join('\n'),
    ].join('\n\n');
  }

  private async checkAllPlayersGuessed(roundId: number): Promise<boolean> {
    const round = await this.gameRepository.findRoundById(roundId);
    if (!round) return false;

    const participants = await this.gameRepository.getParticipants(round.gameId);
    const notYetGuessed = await this.gameRepository.getUsersNotGuessed(roundId);

    return notYetGuessed.length === 0;
  }

  private calculatePoints(isCorrect: boolean, roundNumber: number): number {
    if (!isCorrect) return 0;

    // Simple scoring: more points for later rounds
    return Math.max(1, 10 - roundNumber);
  }

  private calculatePointsTimeBased(
    isCorrect: boolean,
    timeElapsed: number,
    hintShown: boolean,
    isSelfGuess: boolean,
    roundNumber: number,
  ): number {
    if (isSelfGuess) return 0;
    if (!isCorrect) return -2;

    // Base points for correct guess
    let basePoints = 4;

    // Bonus for early guesses (first 30 seconds)
    if (timeElapsed <= 30) {
      basePoints += 2;
    }
    // Penalty for late guesses (after 2 minutes)
    else if (timeElapsed > 120) {
      basePoints -= 1;
    }

    // Penalty if hint was shown
    if (hintShown) {
      basePoints -= 1;
    }

    // Bonus for later rounds (harder rounds)
    const roundBonus = Math.min(roundNumber, 3);
    basePoints += roundBonus;

    return Math.max(1, basePoints); // Minimum 1 point
  }

  private calculatePointsAdvanced(
    isCorrect: boolean,
    isLateGuess: boolean,
    hintShown: boolean,
    isSelfGuess: boolean,
  ): number {
    if (isSelfGuess) return 0;
    if (!isCorrect) return -2;
    if (isLateGuess) return 1;
    return hintShown ? 2 : 4;
  }

  private async calculateUserStats(gameId: number) {
    const game = await this.gameRepository.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    const userStats = new Map<
      number,
      {
        correct: number;
        incorrect: number;
        totalPoints: number;
      }
    >();

    // Logic for calculating user stats
    for (const round of game.rounds) {
      for (const guess of round.guesses) {
        const stats = userStats.get(Number(guess.userId)) || {
          correct: 0,
          incorrect: 0,
          totalPoints: 0,
        };
        if (round.userId === guess.guessedId) {
          stats.correct++;
          stats.totalPoints += guess.points;
        } else {
          stats.incorrect++;
        }
        userStats.set(Number(guess.userId), stats);
      }
    }

    return userStats;
  }

  private async calculateTrackDifficulty(gameId: number) {
    const game = await this.gameRepository.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    // Logic for calculating track difficulty
    return game.rounds.map((round) => {
      const correctGuesses = round.guesses.filter((g) => g.guessedId === round.userId).length;
      return {
        player: round.user.name || 'Unknown',
        correctGuesses,
        index: round.roundIndex,
      };
    });
  }

  private getPointsWord(points: number): string {
    if (points === 1) return 'очко';
    if (points >= 2 && points <= 4) return 'очка';
    return 'очков';
  }

  private chunkButtons(buttons: InlineKeyboardButton[], size: number) {
    return Array.from({ length: Math.ceil(buttons.length / size) }, (_, i) =>
      buttons.slice(i * size, i * size + size),
    );
  }
}
