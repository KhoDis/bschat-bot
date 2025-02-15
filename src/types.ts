import {
  MusicSubmission as PrismaMusicSubmission,
  User as PrismaUser,
  Guess as PrismaGuess,
  Game as PrismaGame,
  GameRound as PrismaGameRound,
} from "@prisma/client";

export type User = PrismaUser;
export type MusicSubmission = PrismaMusicSubmission;
export type Guess = PrismaGuess;
export type Game = PrismaGame;
export type GameRound = PrismaGameRound;
