import { describe, it, expect } from 'vitest';
import { ClassicScoring, AggressiveScoring, GentleScoring } from './scoring';

describe('Scoring strategies', () => {
  it('ClassicScoring rewards early, penalizes hint and late', () => {
    const s = new ClassicScoring();
    expect(
      s.score({
        isCorrect: true,
        isSelfGuess: false,
        timeElapsedSec: 10,
        hintShown: false,
        roundNumber: 2,
      }),
    ).toBeGreaterThan(
      s.score({
        isCorrect: true,
        isSelfGuess: false,
        timeElapsedSec: 130,
        hintShown: true,
        roundNumber: 2,
      }),
    );
  });

  it('AggressiveScoring gives higher for very early correct', () => {
    const s = new AggressiveScoring();
    expect(
      s.score({
        isCorrect: true,
        isSelfGuess: false,
        timeElapsedSec: 15,
        hintShown: false,
        roundNumber: 1,
      }),
    ).toBe(7);
    expect(
      s.score({
        isCorrect: true,
        isSelfGuess: false,
        timeElapsedSec: 40,
        hintShown: false,
        roundNumber: 1,
      }),
    ).toBe(4);
  });

  it('GentleScoring never penalizes wrong but gives small points', () => {
    const s = new GentleScoring();
    expect(
      s.score({
        isCorrect: false,
        isSelfGuess: false,
        timeElapsedSec: 0,
        hintShown: false,
        roundNumber: 1,
      }),
    ).toBe(0);
    expect(
      s.score({
        isCorrect: true,
        isSelfGuess: false,
        timeElapsedSec: 0,
        hintShown: true,
        roundNumber: 1,
      }),
    ).toBe(2);
  });
});
