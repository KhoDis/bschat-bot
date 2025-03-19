import { NarrowedContext } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { Message, Update } from "telegraf/types";

export type CallbackQueryContext = NarrowedContext<
  IBotContext,
  Update.CallbackQueryUpdate
> & {
  match: RegExpExecArray;
};

export type CommandContext = NarrowedContext<
  IBotContext,
  Update.MessageUpdate<Message.TextMessage>
>;

export const TYPES = {
  GameRepository: Symbol.for("GameRepository"),
  MusicSubmissionRepository: Symbol.for("MusicSubmissionRepository"),
  UserRepository: Symbol.for("UserRepository"),

  ConfigService: Symbol.for("ConfigService"),

  CraftyService: Symbol.for("CraftyService"),
  GuessService: Symbol.for("GuessService"),
  GuessValidationService: Symbol.for("GuessValidationService"),
  LeaderboardService: Symbol.for("LeaderboardService"),
  MusicGameService: Symbol.for("MusicGameService"),
  PermissionService: Symbol.for("PermissionService"),
  RoleService: Symbol.for("RoleService"),
  RoundService: Symbol.for("RoundService"),
  TextService: Symbol.for("TextService"),
  UserService: Symbol.for("UserService"),

  CraftyComposer: Symbol.for("CraftyComposer"),
  GlobalComposer: Symbol.for("GlobalComposer"),
  JokerComposer: Symbol.for("JokerComposer"),
  MusicGameComposer: Symbol.for("MusicGameComposer"),
  ParticipantComposer: Symbol.for("ParticipantComposer"),
  PrivateComposer: Symbol.for("PrivateComposer"),
  RoleComposer: Symbol.for("RoleComposer"),
};

export type Types = (typeof TYPES)[keyof typeof TYPES];
