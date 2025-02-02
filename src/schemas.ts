import { z } from "zod";

// Base schemas that match DB types
const userSchema = z.object({
  id: z.coerce.bigint(),
  tag: z.string().nullable(),
  name: z.string(),
});

const musicSubmissionSchema = z.object({
  id: z.number(),
  fileId: z.string(),
  userId: z.coerce.bigint(),
  hint: z.string().nullable(),
});

const gameRoundSchema = z.object({
  id: z.number(),
  index: z.number(),
  gameId: z.number(),
  submissionId: z.number(),
  hintShown: z.boolean(),
});

const gameSchema = z.object({
  id: z.number(),
  createdAt: z.date(),
  status: z.string(),
  currentRound: z.number(),
});

const guessSchema = z.object({
  id: z.number(),
  roundId: z.number(),
  userId: z.coerce.bigint(),
  guessedId: z.coerce.bigint(),
  isCorrect: z.boolean(),
  createdAt: z.date(),
  points: z.number(),
  isLateGuess: z.boolean(),
});

// Transformed schemas (for use in application)
const appUserSchema = userSchema.transform((user) => ({
  ...user,
  id: Number(user.id), // Convert BigInt to Number
}));

const appGuessSchema = guessSchema
  .extend({
    user: userSchema,
  })
  .transform((guess) => ({
    ...guess,
    userId: Number(guess.userId),
    guessedId: Number(guess.guessedId),
    user: appUserSchema.parse(guess.user),
  }));

const appMusicSubmissionSchema = musicSubmissionSchema
  .extend({
    user: userSchema,
  })
  .transform((submission) => ({
    ...submission,
    userId: Number(submission.userId),
    user: appUserSchema.parse(submission.user),
  }));

const appGameRoundSchema = gameRoundSchema
  .extend({
    submission: musicSubmissionSchema.extend({
      user: userSchema,
    }),
    guesses: z.array(
      guessSchema.extend({
        user: userSchema,
      }),
    ),
  })
  .transform((round) => ({
    ...round,
    submission: appMusicSubmissionSchema.parse(round.submission),
    guesses: round.guesses.map((guess) => appGuessSchema.parse(guess)),
  }));

const appGameSchema = gameSchema
  .extend({
    rounds: z.array(appGameRoundSchema),
  })
  .transform((game) => ({
    ...game,
    rounds: game.rounds.map((round) => appGameRoundSchema.parse(round)),
  }));

// Types derived from schemas
export type AppUser = z.infer<typeof appUserSchema>;
export type AppGuess = z.infer<typeof appGuessSchema>;
export type AppMusicSubmission = z.infer<typeof appMusicSubmissionSchema>;
export type AppGameRound = z.infer<typeof appGameRoundSchema>;
export type AppGame = z.infer<typeof appGameSchema>;

export type User = AppUser;
export type Guess = AppGuess;
export type MusicSubmission = AppMusicSubmission;
export type GameRound = AppGameRound;
export type Game = AppGame;

// Export both schemas and parsers
export const schemas = {
  db: {
    user: userSchema,
    musicSubmission: musicSubmissionSchema,
    gameRound: gameRoundSchema,
    game: gameSchema,
    guess: guessSchema,
  },
  app: {
    user: appUserSchema,
    musicSubmission: appMusicSubmissionSchema,
    gameRound: appGameRoundSchema,
    game: appGameSchema,
    guess: appGuessSchema,
  },
};
