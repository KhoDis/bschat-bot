import { inject, injectable } from 'inversify';
import { TYPES } from '@/types';
import { MusicGameRepository } from '@/modules/musicGame/music-game.repository';
import { ScoringStrategy, scoringByPreset } from '@/modules/musicGame/scoring';
import { RoundPhase, GameStatus } from '@prisma/client';

@injectable()
export class GuessService {
  constructor(@inject(TYPES.GameRepository) private gameRepository: MusicGameRepository) {}

  async processGuess(params: {
    chatId: number;
    roundId: number;
    guessingUserId: number;
    guessedUserId?: number; // Optional: who the user is guessing uploaded the track
  }): Promise<
    | { isCorrect: boolean; points: number }
    | 'ALREADY_GUESSED'
    | 'NO_GAME'
    | 'NO_ROUND'
    | 'ROUND_NOT_LIVE'
    | 'GAME_NOT_ACTIVE'
  > {
    const { chatId, roundId, guessingUserId, guessedUserId } = params;

    const round = await this.gameRepository.findRoundById(roundId);
    if (!round) return 'NO_ROUND';

    // Guard: only allow guesses on LIVE rounds
    if (round.phase !== RoundPhase.LIVE) return 'ROUND_NOT_LIVE';

    const game = await this.gameRepository.getCurrentGameByChatId(chatId);
    if (!game) return 'NO_GAME';

    // Guard: only allow guesses in ACTIVE games
    if (game.status !== GameStatus.ACTIVE) return 'GAME_NOT_ACTIVE';

    const existingGuess = await this.gameRepository.findGuess(roundId, guessingUserId);
    if (existingGuess) return 'ALREADY_GUESSED';

    const timeElapsed = (Date.now() - round.createdAt.getTime()) / 1000;
    const isLateGuess = round.roundIndex < game.currentRound;

    const preset = game.scoringPreset ?? 'classic';
    const strategy: ScoringStrategy = scoringByPreset(preset);

    // If guessedUserId is provided and valid, use it; otherwise fall back to guessingUserId
    // (for backward compatibility with old behavior)
    const actualGuessedId =
      guessedUserId !== undefined && !isNaN(guessedUserId) ? guessedUserId : guessingUserId;
    const isCorrect = Number(round.userId) === actualGuessedId;
    const isSelfGuess = guessingUserId === Number(round.userId);
    const points = strategy.score({
      isCorrect,
      isSelfGuess,
      timeElapsedSec: timeElapsed,
      hintShown: !!round.hintShownAt,
      roundNumber: game.currentRound,
    });

    await this.gameRepository.createGuess({
      roundId,
      userId: guessingUserId,
      guessedId: actualGuessedId,
      isCorrect,
      points,
      isLateGuess,
    });

    return { isCorrect, points };
  }
}
