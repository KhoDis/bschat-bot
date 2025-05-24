import { Container } from "inversify";
import { TYPES } from "./types";
import { MemberService } from "@/modules/common/member.service";
import { MusicGameRepository } from "@/modules/musicGame/music-game.repository";
import { TextService } from "@/modules/common/text.service";
import { ConfigService } from "./modules/common/config.service";
import { RoleService } from "@/modules/permissions/role.service";
import { PermissionService } from "@/modules/permissions/permission.service";
import CraftyService from "@/modules/crafty/crafty.service";
import { JokerModule } from "@/modules/joke/joker.module";
import { GlobalModule } from "@/modules/common/global.module";
import { MemberModule } from "@/modules/common/member.module";
import { MusicGameUploadModule } from "@/modules/musicGame/music-game-upload.module";
import { RoleModule } from "@/modules/permissions/role.module";
import { CraftyModule } from "@/modules/crafty/crafty.module";
import { TriggerModule } from "@/modules/joke/trigger.module";
import { SorryModule } from "@/modules/joke/sorry.module";
import { FoodModule } from "@/modules/food/food.module";
import { ZazuService } from "@/modules/joke/zazu.service";
import { LeaderboardModule } from "@/modules/musicGame/leaderboard/leaderboard.module";
import { MusicGameModule } from "@/modules/musicGame/music-game.module";
import { LeaderboardService } from "@/modules/musicGame/leaderboard/leaderboard.service";
import { ArgsService } from "@/modules/common/args.service";
import { RoundService } from "@/modules/musicGame/round/round.service";
import { GuessService } from "@/modules/musicGame/guess/guess.service";
import { GameService } from "@/modules/musicGame/game/game.service";
import { FoodService } from "@/modules/food/food.service";
import { GameModule } from "@/modules/musicGame/game/game.module";
import { GuessModule } from "@/modules/musicGame/guess/guess.module";
import { RoundModule } from "@/modules/musicGame/round/round.module";
import { LlmModule } from "@/modules/joke/llm.module";

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

// Roles
container.bind<RoleModule>(TYPES.RoleComposer).to(RoleModule);
container.bind<RoleService>(TYPES.RoleService).to(RoleService);
container
  .bind<PermissionService>(TYPES.PermissionService)
  .to(PermissionService);

// Crafty
container.bind<CraftyModule>(TYPES.CraftyComposer).to(CraftyModule);
container.bind<CraftyService>(TYPES.CraftyService).to(CraftyService);

// Game
container.bind<MusicGameModule>(TYPES.MusicGameModule).to(MusicGameModule);
container
  .bind<MusicGameRepository>(TYPES.GameRepository)
  .to(MusicGameRepository);
container
  .bind<MusicGameUploadModule>(TYPES.PrivateComposer)
  .to(MusicGameUploadModule);

container.bind<GameModule>(TYPES.GameModule).to(GameModule);
container.bind<GameService>(TYPES.GameService).to(GameService);

container.bind<RoundModule>(TYPES.RoundModule).to(RoundModule);
container.bind<RoundService>(TYPES.RoundService).to(RoundService);

container.bind<GuessModule>(TYPES.GuessModule).to(GuessModule);
container.bind<GuessService>(TYPES.GuessService).to(GuessService);

container
  .bind<LeaderboardModule>(TYPES.LeaderboardModule)
  .to(LeaderboardModule);
container
  .bind<LeaderboardService>(TYPES.LeaderboardService)
  .to(LeaderboardService);

export { container };
