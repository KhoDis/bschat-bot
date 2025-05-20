import { Container } from "inversify";
import { TYPES } from "./types";
import { MemberService } from "@/modules/common/member.service";
import { MusicGameService } from "@/modules/musicGame/music-game.service";
import { GuessService } from "@/modules/musicGame/guess.service";
import { LeaderboardService } from "@/modules/musicGame/leaderboard.service";
import { GameRepository } from "@/bot/repositories/GameRepository";
import { TextService } from "@/modules/common/text.service";
import { ConfigService } from "./modules/common/config.service";
import { RoundService } from "@/modules/musicGame/round.service";
import { MusicGameComposer } from "@/modules/musicGame/music-game.composer";
import { RoleService } from "@/modules/permissions/role.service";
import { PermissionService } from "@/modules/permissions/permission.service";
import CraftyService from "@/modules/crafty/crafty.service";
import { JokerComposer } from "@/bot/composers/JokerComposer";
import { GlobalComposer } from "@/modules/common/global.composer";
import { ParticipantComposer } from "@/modules/musicGame/participant.composer";
import { PrivateComposer } from "@/bot/composers/PrivateComposer";
import { RoleComposer } from "@/modules/permissions/role.composer";
import { CraftyComposer } from "@/modules/crafty/crafty.composer";
import { TriggerComposer } from "@/modules/trigger/trigger.composer";
import { SorryComposer } from "@/bot/composers/SorryComposer";
import { FoodComposer } from "@/modules/food/food.composer";
import { FoodService } from "@/modules/food/food.service";
import { MusicGameCommands } from "@/modules/musicGame/music-game.commands";
import { MusicGameActions } from "@/modules/musicGame/music-game.actions";

const container = new Container();

// Bind repositories
container.bind<GameRepository>(TYPES.GameRepository).to(GameRepository);

// Bind services
container.bind<ConfigService>(TYPES.ConfigService).to(ConfigService);

container.bind<CraftyService>(TYPES.CraftyService).to(CraftyService);
container.bind<GuessService>(TYPES.GuessService).to(GuessService);
container
  .bind<LeaderboardService>(TYPES.LeaderboardService)
  .to(LeaderboardService);
container.bind<MusicGameService>(TYPES.MusicGameService).to(MusicGameService);
container
  .bind<PermissionService>(TYPES.PermissionService)
  .to(PermissionService);
container.bind<RoleService>(TYPES.RoleService).to(RoleService);
container.bind<RoundService>(TYPES.RoundService).to(RoundService);
container.bind<TextService>(TYPES.TextService).to(TextService);
container.bind<MemberService>(TYPES.MemberService).to(MemberService);
container.bind<FoodService>(TYPES.FoodService).to(FoodService);

// Bind commands
container
  .bind<MusicGameCommands>(TYPES.MusicGameCommands)
  .to(MusicGameCommands);
container.bind<MusicGameActions>(TYPES.MusicGameActions).to(MusicGameActions);

// Bind composers
container
  .bind<MusicGameComposer>(TYPES.MusicGameComposer)
  .to(MusicGameComposer);
container.bind<GlobalComposer>(TYPES.GlobalComposer).to(GlobalComposer);
container.bind<JokerComposer>(TYPES.JokerComposer).to(JokerComposer);
container
  .bind<ParticipantComposer>(TYPES.ParticipantComposer)
  .to(ParticipantComposer);
container.bind<PrivateComposer>(TYPES.PrivateComposer).to(PrivateComposer);
container.bind<RoleComposer>(TYPES.RoleComposer).to(RoleComposer);
container.bind<CraftyComposer>(TYPES.CraftyComposer).to(CraftyComposer);
container.bind<TriggerComposer>(TYPES.TextComposer).to(TriggerComposer);
container.bind<SorryComposer>(TYPES.SorryComposer).to(SorryComposer);
container.bind<FoodComposer>(TYPES.FoodComposer).to(FoodComposer);

export { container };
