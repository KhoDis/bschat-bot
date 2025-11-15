import { z } from 'zod';

export const scoringPresetSchema = z.enum(['classic', 'aggressive', 'gentle']);

export type ScoringPreset = z.infer<typeof scoringPresetSchema>;

export const gameConfigSchema = z.object({
  hintDelaySec: z.number().int().min(0).default(30),
  autoAdvance: z.boolean().default(false),
  advanceDelaySec: z.number().int().min(0).default(10),
  allowSelfGuess: z.boolean().default(false),
  shuffle: z.boolean().default(true),
  scoringPreset: scoringPresetSchema.default('classic'),
});

export type GameConfig = z.infer<typeof gameConfigSchema>;

export const defaultGameConfig: GameConfig = gameConfigSchema.parse({});

/**
 * Convert GameConfig to Prisma update data format
 */
export function gameConfigToPrisma(config: GameConfig): {
  hintDelaySec: number;
  autoAdvance: boolean;
  advanceDelaySec: number;
  allowSelfGuess: boolean;
  shuffle: boolean;
  scoringPreset: 'classic' | 'aggressive' | 'gentle';
} {
  return {
    hintDelaySec: config.hintDelaySec,
    autoAdvance: config.autoAdvance,
    advanceDelaySec: config.advanceDelaySec,
    allowSelfGuess: config.allowSelfGuess,
    shuffle: config.shuffle,
    scoringPreset: config.scoringPreset,
  };
}
