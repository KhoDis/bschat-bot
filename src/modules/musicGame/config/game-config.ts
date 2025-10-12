import { z } from 'zod';

export const scoringPresetSchema = z.enum(['classic', 'aggressive', 'gentle']);

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
