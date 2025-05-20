import { Container } from "inversify";
import { TYPES } from "./types";
import { MemberService } from "@/modules/common/member.service";
import { MusicGameRepository } from "@/modules/musicGame/music-game.repository";
import { TextService } from "@/modules/common/text.service";
import { ConfigService } from "./modules/common/config.service";
import { RoleService } from "@/modules/permissions/role.service";
import { PermissionService } from "@/modules/permissions/permission.service";
import CraftyService from "@/modules/crafty/crafty.service";
import { JokerComposer } from "@/bot/composers/JokerComposer";
import { GlobalComposer } from "@/modules/common/global.composer";
import { MemberModule } from "@/modules/common/member.module";
import { PrivateComposer } from "@/bot/composers/PrivateComposer";
import { RoleComposer } from "@/modules/permissions/role.composer";
import { CraftyComposer } from "@/modules/crafty/crafty.composer";
import { TriggerComposer } from "@/modules/trigger/trigger.composer";
import { SorryComposer } from "@/bot/composers/SorryComposer";
import { FoodComposer } from "@/modules/food/food.composer";
import { FoodService } from "@/modules/food/food.service";
import { GameModule } from "@/modules/musicGame/game/game.module";
import { GameService } from "@/modules/musicGame/game/game.service";
import { RoundModule } from "@/modules/musicGame/round/round.module";
import { RoundService } from "@/modules/musicGame/round/round.service";
import { GuessModule } from "@/modules/musicGame/guess/guess.module";
import { GuessService } from "@/modules/musicGame/guess/guess.service";
import { LeaderboardService } from "@/modules/musicGame/leaderboard/leaderboard.service";
import { LeaderboardModule } from "@/modules/musicGame/leaderboard/leaderboard.module";
import { MusicGameModule } from "@/modules/musicGame/music-game.module";

const container = new Container();

// Bind repositories
container
  .bind<MusicGameRepository>(TYPES.GameRepository)
  .to(MusicGameRepository);

// Bind services
container.bind<ConfigService>(TYPES.ConfigService).to(ConfigService);

container.bind<CraftyService>(TYPES.CraftyService).to(CraftyService);
container.bind<GuessService>(TYPES.GuessService).to(GuessService);
container
  .bind<PermissionService>(TYPES.PermissionService)
  .to(PermissionService);
container.bind<RoleService>(TYPES.RoleService).to(RoleService);
container.bind<TextService>(TYPES.TextService).to(TextService);
container.bind<MemberService>(TYPES.MemberService).to(MemberService);
container.bind<FoodService>(TYPES.FoodService).to(FoodService);

// Bind composers
container.bind<GlobalComposer>(TYPES.GlobalComposer).to(GlobalComposer);
container.bind<JokerComposer>(TYPES.JokerComposer).to(JokerComposer);
container.bind<MemberModule>(TYPES.ParticipantComposer).to(MemberModule);
container.bind<PrivateComposer>(TYPES.PrivateComposer).to(PrivateComposer);
container.bind<RoleComposer>(TYPES.RoleComposer).to(RoleComposer);
container.bind<CraftyComposer>(TYPES.CraftyComposer).to(CraftyComposer);
container.bind<TriggerComposer>(TYPES.TextComposer).to(TriggerComposer);
container.bind<SorryComposer>(TYPES.SorryComposer).to(SorryComposer);
container.bind<FoodComposer>(TYPES.FoodComposer).to(FoodComposer);

// ---

container.bind<MusicGameModule>(TYPES.MusicGameModule).to(MusicGameModule);

container.bind<GameService>(TYPES.GameService).to(GameService);
container.bind<GameModule>(TYPES.GameModule).to(GameModule);

container.bind<RoundService>(TYPES.RoundService).to(RoundService);
container.bind<RoundModule>(TYPES.RoundModule).to(RoundModule);

container.bind<GuessService>(TYPES.GuessService).to(GuessService);
container.bind<GuessModule>(TYPES.GuessModule).to(GuessModule);

container
  .bind<LeaderboardService>(TYPES.LeaderboardService)
  .to(LeaderboardService);
container
  .bind<LeaderboardModule>(TYPES.LeaderboardModule)
  .to(LeaderboardModule);

export { container };
