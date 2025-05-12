import { Container } from "inversify";
import { TYPES } from "./types";
import { MemberService } from "@/bot/services/MemberService";
import { MusicGameService } from "@/modules/musicGame/music-game.service";
import { GuessService } from "@/bot/services/GuessService";
import { LeaderboardService } from "@/bot/services/LeaderboardService";
import { GameRepository } from "@/bot/repositories/GameRepository";
import { TextService } from "@/bot/services/TextService";
import { ConfigService } from "./config/config.service";
import { RoundService } from "@/bot/services/RoundService";
import { MusicGameComposer } from "@/modules/musicGame/music-game.composer";
import { RoleService } from "@/bot/services/RoleService";
import { PermissionService } from "@/bot/services/PermissionService";
import CraftyService from "@/bot/services/CraftyService";
import { JokerComposer } from "@/bot/composers/JokerComposer";
import { GlobalComposer } from "@/bot/composers/GlobalComposer";
import { ParticipantComposer } from "@/bot/composers/ParticipantComposer";
import { PrivateComposer } from "@/bot/composers/PrivateComposer";
import { RoleComposer } from "@/bot/composers/RoleComposer";
import { CraftyComposer } from "@/bot/composers/CraftyComposer";
import { TextComposer } from "@/bot/composers/TextComposer";
import { SorryComposer } from "@/bot/composers/SorryComposer";
import { FoodComposer } from "@/bot/composers/FoodComposer";
import { FoodService } from "@/bot/services/FoodService";
import { LLMComposer } from "@/bot/composers/LLMComposer";
import { ZazuService } from "@/bot/services/ZazuService";

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
container.bind<ZazuService>(TYPES.ZazuService).to(ZazuService);

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
container.bind<TextComposer>(TYPES.TextComposer).to(TextComposer);
container.bind<SorryComposer>(TYPES.SorryComposer).to(SorryComposer);
container.bind<FoodComposer>(TYPES.FoodComposer).to(FoodComposer);
container.bind<LLMComposer>(TYPES.LLMComposer).to(LLMComposer);

export { container };
