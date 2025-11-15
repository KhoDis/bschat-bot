import { describe, it, beforeEach, expect, vi } from 'vitest';
import { GameStatus, RoundPhase } from '@prisma/client';
import { MemberService } from '@/modules/common/member.service';
import { TextService } from '@/modules/common/text.service';
import { GameLifecycleService } from '@/modules/musicGame/game-lifecycle.service';
import { MusicGameService } from '@/modules/musicGame/music-game.service';
import { GuessService } from '@/modules/musicGame/guess.service';

type GuessRecord = {
  roundId: number;
  userId: number;
  guessedId: number;
  points: number;
  isCorrect: boolean;
  createdAt: Date;
};

type RoundRecord = {
  id: number;
  gameId: number;
  userId: number;
  phase: RoundPhase;
  musicFileId: string;
  roundIndex: number;
  createdAt: Date;
  hintShownAt: Date | undefined;
  hintChatId: number | undefined;
  hintMessageId: number | undefined;
  userName: string;
  guesses: GuessRecord[];
};

type GameRecord = {
  id: number;
  chatId: number;
  status: GameStatus;
  currentRound: number;
  rounds: RoundRecord[];
  createdAt: Date;
};

class InMemoryGameRepository {
  private games: GameRecord[] = [];
  private rounds: RoundRecord[] = [];
  private guesses: GuessRecord[] = [];
  private gameSeq = 1;
  private roundSeq = 1;

  async getCurrentGameByChatId(chatId: number) {
    const active = this.games.find(
      (game) => game.chatId === chatId && game.status === GameStatus.ACTIVE,
    );
    if (active) {
      return { ...active, rounds: [...active.rounds], chatId: BigInt(active.chatId) };
    }

    const lobbies = this.games
      .filter((game) => game.chatId === chatId && game.status === GameStatus.LOBBY)
      .sort((a, b) => a.id - b.id);
    const lobby = lobbies[lobbies.length - 1];
    return lobby ? { ...lobby, rounds: [...lobby.rounds], chatId: BigInt(lobby.chatId) } : null;
  }

  async createEmptyLobby(chatId: number) {
    const game: GameRecord = {
      id: this.gameSeq++,
      chatId,
      status: GameStatus.LOBBY,
      currentRound: 0,
      rounds: [],
      createdAt: new Date(),
    };
    this.games.push(game);
    return { ...game, chatId: BigInt(game.chatId), rounds: [] };
  }

  async upsertDraftRound(
    gameId: number,
    data: { userId: number; musicFileId: string; hintChatId?: number; hintMessageId?: number },
  ) {
    const existing = this.rounds.find(
      (round) => round.gameId === gameId && round.userId === data.userId,
    );
    if (existing) {
      existing.musicFileId = data.musicFileId;
      existing.hintChatId = data.hintChatId ?? undefined;
      existing.hintMessageId = data.hintMessageId ?? undefined;
    } else {
      const roundIndex = this.rounds.filter((round) => round.gameId === gameId).length;
      this.rounds.push({
        id: this.roundSeq++,
        gameId,
        userId: data.userId,
        phase: RoundPhase.DRAFT,
        musicFileId: data.musicFileId,
        roundIndex,
        createdAt: new Date(Date.now() - 5000),
        hintShownAt: undefined,
        hintChatId: data.hintChatId ?? undefined,
        hintMessageId: data.hintMessageId ?? undefined,
        userName: `User ${data.userId}`,
        guesses: [],
      });
    }
    this.syncGameRounds(gameId);
  }

  async getDraftSubmissionUsers(chatId: number) {
    const game = await this.getCurrentGameByChatId(chatId);
    if (!game || game.status !== GameStatus.LOBBY) {
      return [];
    }
    return this.rounds
      .filter((round) => round.gameId === Number(game.id) && round.phase === RoundPhase.DRAFT)
      .map((round) => ({
        id: BigInt(round.userId),
        name: `User ${round.userId}`,
        tag: null,
      }));
  }

  async startGameFromLobby(gameId: number) {
    const game = this.games.find((g) => g.id === gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    if (game.status !== GameStatus.LOBBY) {
      throw new Error('Game is not in LOBBY state');
    }
    if (!game.rounds.length) {
      throw new Error('Cannot start game with no tracks');
    }

    console.log('DEBUG startGameFromLobby before update', {
      rounds: game.rounds.length,
      statuses: game.rounds.map((r) => r.phase),
    });
    game.status = GameStatus.ACTIVE;
    // Update rounds in both game.rounds and this.rounds
    game.rounds.forEach((round) => {
      round.phase = RoundPhase.LIVE;
      const roundInArray = this.rounds.find((r) => r.id === round.id);
      if (roundInArray) {
        roundInArray.phase = RoundPhase.LIVE;
      }
    });
    console.log('DEBUG startGameFromLobby after update', {
      statuses: game.rounds.map((r) => r.phase),
    });
    return { ...game, chatId: BigInt(game.chatId), rounds: [...game.rounds] };
  }

  async getGameById(id: number) {
    const game = this.games.find((g) => g.id === id);
    return game
      ? {
          ...game,
          chatId: BigInt(game.chatId),
          rounds: game.rounds.map((round) => ({
            ...round,
            user: { id: BigInt(round.userId), name: round.userName },
            guesses: this.guesses
              .filter((guess) => guess.roundId === round.id)
              .map((guess) => ({ ...guess })),
          })),
        }
      : null;
  }

  async findRoundById(id: number) {
    const round = this.rounds.find((r) => r.id === id);
    if (!round) return null;
    const game = this.games.find((g) => g.id === round.gameId);
    return {
      ...round,
      userId: BigInt(round.userId),
      game: game
        ? {
            id: game.id,
            chatId: BigInt(game.chatId),
            status: game.status,
            currentRound: game.currentRound,
            rounds: game.rounds,
          }
        : null,
      user: {
        id: BigInt(round.userId),
        name: round.userName,
      },
      guesses: this.guesses
        .filter((guess) => guess.roundId === id)
        .map((g) => ({
          ...g,
          userId: BigInt(g.userId),
          guessedId: BigInt(g.guessedId),
        })),
    };
  }

  async findGuess(roundId: number, userId: number) {
    return (
      this.guesses.find((guess) => guess.roundId === roundId && guess.userId === userId) || null
    );
  }

  async createGuess(data: {
    roundId: number;
    userId: number;
    guessedId: number;
    points: number;
    isCorrect: boolean;
    isLateGuess: boolean;
  }) {
    const record: GuessRecord = {
      roundId: data.roundId,
      userId: data.userId,
      guessedId: data.guessedId,
      points: data.points,
      isCorrect: data.isCorrect,
      createdAt: new Date(),
    };
    this.guesses.push(record);
    const round = this.rounds.find((r) => r.id === data.roundId);
    if (round) {
      round.guesses.push(record);
    }
    return record;
  }

  async showHint(roundId: number) {
    const round = this.rounds.find((r) => r.id === roundId);
    if (round) {
      round.hintShownAt = new Date();
    }
  }

  // Helpers for assertions
  getStoredGame(chatId: number) {
    return this.games.find((game) => game.chatId === chatId);
  }

  private syncGameRounds(gameId: number) {
    const game = this.games.find((g) => g.id === gameId);
    if (game) {
      game.rounds = this.rounds
        .filter((round) => round.gameId === gameId)
        .map((round) => ({
          ...round,
          guesses: this.guesses.filter((guess) => guess.roundId === round.id),
        }));
    }
  }
}

describe('Music game flow', () => {
  const CHAT_ID = 12345;
  let repo: InMemoryGameRepository;
  let memberService: MemberService;
  let textService: { get: ReturnType<typeof vi.fn> };
  let lifecycle: GameLifecycleService;

  beforeEach(() => {
    repo = new InMemoryGameRepository();
    memberService = new MemberService(repo as any);
    textService = {
      get: vi.fn((key: string, params?: Record<string, unknown>) =>
        params ? `${key}:${JSON.stringify(params)}` : key,
      ),
    };
    lifecycle = new GameLifecycleService(
      repo as any,
      memberService,
      textService as unknown as TextService,
    );
    vi.clearAllMocks();
  });

  it('saves submission and creates lobby automatically', async () => {
    await memberService.saveSubmission(
      { userId: 1, chatId: CHAT_ID, fileId: 'file_A' },
      { uploadChatId: 999 },
    );

    const storedGame = repo.getStoredGame(CHAT_ID);
    expect(storedGame).toBeDefined();
    expect(storedGame?.status).toBe(GameStatus.LOBBY);
    expect(storedGame?.rounds).toHaveLength(1);
    expect(storedGame?.rounds[0]?.userId).toBe(1);
  });

  it('transitions lobby game to active when starting', async () => {
    await memberService.saveSubmission(
      { userId: 1, chatId: CHAT_ID, fileId: 'file_A' },
      { uploadChatId: 999 },
    );

    const ctx = { chat: { id: CHAT_ID } } as any;
    const result = await lifecycle.start(ctx);

    expect(result).toEqual({ chatId: CHAT_ID });
    const storedGame = repo.getStoredGame(CHAT_ID);
    expect(storedGame?.status).toBe(GameStatus.ACTIVE);
  });

  it('lists all players after submissions', async () => {
    await memberService.saveSubmission(
      { userId: 1, chatId: CHAT_ID, fileId: 'file_A' },
      { uploadChatId: 999 },
    );
    await memberService.saveSubmission(
      { userId: 2, chatId: CHAT_ID, fileId: 'file_B' },
      { uploadChatId: 999 },
    );

    const scheduler = {} as any;
    const ui = {} as any;
    const codec = {} as any;
    const guess = {} as any;
    const roundOrchestrator = {} as any;
    const musicService = new MusicGameService(
      repo as any,
      textService as unknown as TextService,
      memberService,
      scheduler,
      ui,
      codec,
      guess,
      roundOrchestrator,
      lifecycle,
    );

    const ctx = {
      chat: { id: CHAT_ID },
      reply: vi.fn(),
    } as any;

    await musicService.listPlayers(ctx);

    expect(textService.get).toHaveBeenCalledWith('musicGame.listPlayers', {
      playersCount: 2,
      playersList: expect.stringContaining('User 1'),
    });
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('musicGame.listPlayers'),
      expect.objectContaining({ parse_mode: 'Markdown' }),
    );
  });

  it('applies hint penalty and reflects it in final stats', async () => {
    await memberService.saveSubmission(
      { userId: 1, chatId: CHAT_ID, fileId: 'file_A' },
      { uploadChatId: 555, uploadHintMessageId: 42 },
    );
    await memberService.saveSubmission(
      { userId: 2, chatId: CHAT_ID, fileId: 'file_B' },
      { uploadChatId: 777 },
    );

    const ctx = { chat: { id: CHAT_ID } } as any;
    await lifecycle.start(ctx);

    const storedGame = repo.getStoredGame(CHAT_ID)!;
    const hintedRound = storedGame.rounds.find((round) => round.userId === 1)!;
    const plainRound = storedGame.rounds.find((round) => round.userId === 2)!;
    const debugRoundBefore = await repo.findRoundById(hintedRound.id);
    console.log('DEBUG phase before hint', debugRoundBefore?.phase);

    await repo.showHint(hintedRound.id);

    const guessService = new GuessService(repo as any);
    // User 3 correctly guesses that user 1 uploaded the hinted track
    const hintedResult = await guessService.processGuess({
      chatId: CHAT_ID,
      roundId: hintedRound.id,
      guessingUserId: 3,
      guessedUserId: 1, // User 3 guesses user 1
    });
    // User 3 correctly guesses that user 2 uploaded the plain track
    const plainResult = await guessService.processGuess({
      chatId: CHAT_ID,
      roundId: plainRound.id,
      guessingUserId: 3,
      guessedUserId: 2, // User 3 guesses user 2
    });
    expect(hintedResult).toEqual({ isCorrect: true, points: 5 });
    expect(plainResult).toEqual({ isCorrect: true, points: 6 });

    const scheduler = {} as any;
    const ui = {} as any;
    const codec = {} as any;
    const roundOrchestrator = {} as any;
    const musicService = new MusicGameService(
      repo as any,
      textService as unknown as TextService,
      memberService,
      scheduler,
      ui,
      codec,
      guessService,
      roundOrchestrator,
      lifecycle,
    );

    const stats: Map<number, { totalPoints: number; correct: number }> = await (
      musicService as any
    ).calculateUserStats(storedGame.id);
    console.log('TEST stats entries', Array.from(stats.entries()));

    const guesserStats = stats.get(3);
    expect(guesserStats?.correct).toBe(2);
    expect(guesserStats?.totalPoints).toBe(11);

    const hintedRoundData = await repo.findRoundById(hintedRound.id);
    const plainRoundData = await repo.findRoundById(plainRound.id);
    expect(hintedRoundData?.guesses[0]?.points).toBeLessThan(plainRoundData?.guesses[0]?.points!);
  });
});
