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
  ArgsService: Symbol.for("ArgsService"),

  CraftyService: Symbol.for("CraftyService"),
  PermissionService: Symbol.for("PermissionService"),
  RoleService: Symbol.for("RoleService"),
  TextService: Symbol.for("TextService"),
  MemberService: Symbol.for("MemberService"),
  FoodService: Symbol.for("FoodService"),
  ZazuService: Symbol.for("ZazuService"),

  CraftyComposer: Symbol.for("CraftyComposer"),
  GlobalComposer: Symbol.for("GlobalComposer"),
  JokerComposer: Symbol.for("JokerComposer"),
  ParticipantComposer: Symbol.for("ParticipantComposer"),
  PrivateComposer: Symbol.for("PrivateComposer"),
  RoleComposer: Symbol.for("RoleComposer"),
  TextComposer: Symbol.for("TextComposer"),
  SorryComposer: Symbol.for("SorryComposer"),
  FoodComposer: Symbol.for("FoodComposer"),
  LLMComposer: Symbol.for("LLMComposer"),

  // ---

  MusicGameModule: Symbol.for("MusicGameModule"),

  GameService: Symbol.for("GameService"),
  GameModule: Symbol.for("GameModule"),

  RoundService: Symbol.for("RoundService"),
  RoundModule: Symbol.for("RoundModule"),

  GuessService: Symbol.for("GuessService"),
  GuessModule: Symbol.for("GuessModule"),

  LeaderboardService: Symbol.for("LeaderboardService"),
  LeaderboardModule: Symbol.for("LeaderboardModule"),
};

export type Types = (typeof TYPES)[keyof typeof TYPES];
