import { describe, it, expect, beforeEach } from 'vitest';
import { GuessService } from './guess.service';

class FakeRepo {
  private data: any = {};
  private guesses: any[] = [];
  setGame(game: any) {
    this.data.game = game;
  }
  async findRoundById(id: number) {
    return this.data.round?.id === id ? this.data.round : null;
  }
  async getCurrentGameByChatId(chatId: number) {
    return this.data.game?.chatId === BigInt(chatId) ? this.data.game : null;
  }
  async findGuess(roundId: number, userId: number) {
    return this.guesses.find((g) => g.roundId === roundId && g.userId === userId) || null;
  }
  async createGuess(g: any) {
    this.guesses.push(g);
    return g;
  }
}

describe('GuessService', () => {
  let repo: FakeRepo;
  let service: GuessService;

  beforeEach(() => {
    repo = new FakeRepo() as any;
    service = new GuessService(repo as any);
    repo.setGame({ id: 1, currentRound: 0, chatId: BigInt(123), rounds: [] });
    (repo as any).data.round = {
      id: 10,
      createdAt: new Date(Date.now() - 5000),
      roundIndex: 0,
      userId: BigInt(42),
    };
  });

  it('returns NO_ROUND when round missing', async () => {
    (repo as any).data.round = undefined;
    const r = await service.processGuess({ chatId: 123, roundId: 10, guessingUserId: 1 });
    expect(r).toBe('NO_ROUND');
  });

  it('returns NO_GAME when game missing', async () => {
    (repo as any).data.game = undefined;
    const r = await service.processGuess({ chatId: 123, roundId: 10, guessingUserId: 1 });
    expect(r).toBe('NO_GAME');
  });

  it('creates guess and returns scoring info', async () => {
    const r = await service.processGuess({ chatId: 123, roundId: 10, guessingUserId: 99 });
    expect(typeof (r as any).points).toBe('number');
  });
});
