import { NarrowedContext } from 'telegraf';
import { IBotContext } from '@/context/context.interface';
import { Message, Update } from 'telegraf/types';
import { CallbackQuery } from '@telegraf/types';

export type CallbackQueryContext = NarrowedContext<
  IBotContext,
  Update.CallbackQueryUpdate<CallbackQuery.DataQuery>
>;

export type CommandContext = NarrowedContext<
  IBotContext,
  Update.MessageUpdate<Message.TextMessage>
>;

export const TYPES = {
  GameRepository: Symbol.for('GameRepository'),

  ConfigService: Symbol.for('ConfigService'),
  ArgsService: Symbol.for('ArgsService'),

  CraftyService: Symbol.for('CraftyService'),
  PermissionService: Symbol.for('PermissionService'),
  RoleService: Symbol.for('RoleService'),
  TextService: Symbol.for('TextService'),
  MemberService: Symbol.for('MemberService'),
  ZazuService: Symbol.for('ZazuService'),

  CraftyComposer: Symbol.for('CraftyComposer'),
  GlobalComposer: Symbol.for('GlobalComposer'),
  JokerComposer: Symbol.for('JokerComposer'),
  ParticipantComposer: Symbol.for('ParticipantComposer'),
  PrivateComposer: Symbol.for('PrivateComposer'),
  RoleComposer: Symbol.for('RoleComposer'),

  TextComposer: Symbol.for('TextComposer'),
  SorryComposer: Symbol.for('SorryComposer'),
  LLMComposer: Symbol.for('LLMComposer'),

  // ---
  FoodComposer: Symbol.for('FoodComposer'),
  FoodService: Symbol.for('FoodService'),
  FoodRepository: Symbol.for('FoodRepository'),

  // ---

  MusicGameService: Symbol.for('MusicGameService'),
  MusicGameConsolidatedModule: Symbol.for('MusicGameConsolidatedModule'),
  UiRenderer: Symbol.for('UiRenderer'),
  ActionCodec: Symbol.for('ActionCodec'),

  // Scheduler / Events
  SchedulerService: Symbol.for('SchedulerService'),
  EventBus: Symbol.for('EventBus'),
};

export type Types = (typeof TYPES)[keyof typeof TYPES];
