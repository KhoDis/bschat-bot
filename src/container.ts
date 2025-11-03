import { Container } from 'inversify';
import { TYPES } from './types';
import { MemberService } from '@/modules/common/member.service';
import { MusicGameRepository } from '@/modules/musicGame/music-game.repository';
import { TextService } from '@/modules/common/text.service';
import { ConfigService } from './modules/common/config.service';
import { RoleService } from '@/modules/permissions/role.service';
import { PermissionService } from '@/modules/permissions/permission.service';
import CraftyService from '@/modules/crafty/crafty.service';
import { JokerModule } from '@/modules/joke/joker.module';
import { GlobalModule } from '@/modules/common/global.module';
import { MemberModule } from '@/modules/common/member.module';
import { MusicGameUploadModule } from '@/modules/musicGame/music-game-upload.module';
import { RoleModule } from '@/modules/permissions/role.module';
import { CraftyModule } from '@/modules/crafty/crafty.module';
import { TriggerModule } from '@/modules/joke/trigger.module';
import { SorryModule } from '@/modules/joke/sorry.module';
import { FoodModule } from '@/modules/food/food.module';
import { FoodRepository } from '@/modules/food/food.repository';
import { ZazuService } from '@/modules/joke/zazu.service';
import { MusicGameService } from '@/modules/musicGame/music-game.service';
import { MusicGameModule } from '@/modules/musicGame/music-game.module';
import { ArgsService } from '@/modules/common/args.service';
import { FoodService } from '@/modules/food/food.service';
import { LlmModule } from '@/modules/joke/llm.module';
import { SchedulerService } from '@/modules/musicGame/scheduler/scheduler.service';
import { ActionCodec } from '@/modules/musicGame/action.codec';
import { GuessService } from '@/modules/musicGame/guess.service';
import { RoundOrchestratorService } from '@/modules/musicGame/round-orchestrator.service';
import { GameLifecycleService } from '@/modules/musicGame/game-lifecycle.service';
import { LobbyHandler, LobbyUi } from '@/modules/musicGame/features/lobby';
import { GameplayHandler, GameplayUi } from '@/modules/musicGame/features/gameplay';
import { InfoHandler, InfoUi } from '@/modules/musicGame/features/info';

const container = new Container();

container.bind<ZazuService>(TYPES.ZazuService).to(ZazuService);
container.bind<LlmModule>(TYPES.LLMComposer).to(LlmModule);

// App
container.bind<GlobalModule>(TYPES.GlobalComposer).to(GlobalModule);
container.bind<ConfigService>(TYPES.ConfigService).to(ConfigService);
container.bind<ArgsService>(TYPES.ArgsService).to(ArgsService);
container.bind<TextService>(TYPES.TextService).to(TextService);

// Members
container.bind<MemberModule>(TYPES.ParticipantComposer).to(MemberModule);
container.bind<MemberService>(TYPES.MemberService).to(MemberService);

// Joke
container.bind<SorryModule>(TYPES.SorryComposer).to(SorryModule);
container.bind<TriggerModule>(TYPES.TextComposer).to(TriggerModule);
container.bind<JokerModule>(TYPES.JokerComposer).to(JokerModule);

// Food
container.bind<FoodModule>(TYPES.FoodComposer).to(FoodModule);
container.bind<FoodService>(TYPES.FoodService).to(FoodService);
container.bind<FoodRepository>(TYPES.FoodRepository).to(FoodRepository);

// Roles
container.bind<RoleModule>(TYPES.RoleComposer).to(RoleModule);
container.bind<RoleService>(TYPES.RoleService).to(RoleService);
container.bind<PermissionService>(TYPES.PermissionService).to(PermissionService);

// Crafty
container.bind<CraftyModule>(TYPES.CraftyComposer).to(CraftyModule);
container.bind<CraftyService>(TYPES.CraftyService).to(CraftyService);

// Game
container.bind<MusicGameService>(TYPES.MusicGameService).to(MusicGameService);
container.bind<MusicGameModule>(TYPES.MusicGameConsolidatedModule).to(MusicGameModule);
container.bind<MusicGameRepository>(TYPES.GameRepository).to(MusicGameRepository);
container.bind<MusicGameUploadModule>(TYPES.PrivateComposer).to(MusicGameUploadModule);
container.bind<ActionCodec>(TYPES.ActionCodec).to(ActionCodec).inSingletonScope();
container.bind<GuessService>(TYPES.GuessService).to(GuessService);
container.bind<RoundOrchestratorService>(TYPES.RoundOrchestrator).to(RoundOrchestratorService);
container.bind<GameLifecycleService>(TYPES.GameLifecycle).to(GameLifecycleService);

// Music Game Features
container.bind<LobbyHandler>(TYPES.LobbyHandler).to(LobbyHandler);
container.bind<LobbyUi>(TYPES.LobbyUi).to(LobbyUi);
container.bind<GameplayHandler>(TYPES.GameplayHandler).to(GameplayHandler);
container.bind<GameplayUi>(TYPES.GameplayUi).to(GameplayUi);
container.bind<InfoHandler>(TYPES.InfoHandler).to(InfoHandler);
container.bind<InfoUi>(TYPES.InfoUi).to(InfoUi);

// Scheduler (keeping for now - may be integrated later)
container.bind<SchedulerService>(TYPES.SchedulerService).to(SchedulerService).inSingletonScope();

export { container };
