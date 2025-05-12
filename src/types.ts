import { NarrowedContext } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { Message, Update } from "telegraf/types";
import { CallbackQuery } from "@telegraf/types";

export type CallbackQueryContext = NarrowedContext<
  IBotContext,
  Update.CallbackQueryUpdate<CallbackQuery.DataQuery>
>;

export type CommandContext = NarrowedContext<
  IBotContext,
  Update.MessageUpdate<Message.TextMessage>
>;

export const TYPES = {
  GameRepository: Symbol.for("GameRepository"),

  ConfigService: Symbol.for("ConfigService"),

  CraftyService: Symbol.for("CraftyService"),
  GuessService: Symbol.for("GuessService"),
  LeaderboardService: Symbol.for("LeaderboardService"),
  PermissionService: Symbol.for("PermissionService"),
  RoleService: Symbol.for("RoleService"),
  RoundService: Symbol.for("RoundService"),
  TextService: Symbol.for("TextService"),
  MemberService: Symbol.for("MemberService"),
  FoodService: Symbol.for("FoodService"),

  CraftyComposer: Symbol.for("CraftyComposer"),
  GlobalComposer: Symbol.for("GlobalComposer"),
  JokerComposer: Symbol.for("JokerComposer"),
  ParticipantComposer: Symbol.for("ParticipantComposer"),
  PrivateComposer: Symbol.for("PrivateComposer"),
  RoleComposer: Symbol.for("RoleComposer"),
  TextComposer: Symbol.for("TextComposer"),
  SorryComposer: Symbol.for("SorryComposer"),
  FoodComposer: Symbol.for("FoodComposer"),

  MusicGameService: Symbol.for("MusicGameService"),
  MusicGameCommands: Symbol.for("MusicGameCommands"),
  MusicGameActions: Symbol.for("MusicGameActions"),
  MusicGameComposer: Symbol.for("MusicGameComposer"),
};

export type Types = (typeof TYPES)[keyof typeof TYPES];
