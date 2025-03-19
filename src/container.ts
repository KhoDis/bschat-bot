import { Container } from "inversify";
import { TYPES } from "./types";
import { UserService } from "@/bot/services/UserService";
import { MusicGameService } from "@/bot/services/MusicGameService";
import { GuessService } from "@/bot/services/GuessService";
import { LeaderboardService } from "@/bot/services/LeaderboardService";
import { GameRepository } from "@/bot/repositories/GameRepository";
import { TextService } from "@/bot/services/TextService";
import { ConfigService } from "./config/config.service";
import { RoundService } from "@/bot/services/RoundService";
import { MusicGameComposer } from "@/bot/composers/MusicGameComposer";
import { MusicSubmissionRepository } from "@/bot/repositories/MusicSubmissionRepository";
import { UserRepository } from "@/bot/repositories/UserRepository";
import { GuessValidationService } from "@/bot/services/GuessValidationService";
import { RoleService } from "@/bot/services/RoleService";
import { PermissionService } from "@/bot/services/PermissionService";
import CraftyService from "@/bot/services/CraftyService";
import { JokerComposer } from "@/bot/composers/JokerComposer";
import { GlobalComposer } from "@/bot/composers/GlobalComposer";
import { ParticipantComposer } from "@/bot/composers/ParticipantComposer";
import { PrivateComposer } from "@/bot/composers/PrivateComposer";
import { RoleComposer } from "@/bot/composers/RoleComposer";
import { CraftyComposer } from "@/bot/composers/CraftyComposer";

const container = new Container();

// Bind repositories
container.bind<GameRepository>(TYPES.GameRepository).to(GameRepository);
container
  .bind<MusicSubmissionRepository>(TYPES.MusicSubmissionRepository)
  .to(MusicSubmissionRepository);
container.bind<UserRepository>(TYPES.UserRepository).to(UserRepository);

// Bind services
container.bind<ConfigService>(TYPES.ConfigService).to(ConfigService);

container.bind<CraftyService>(TYPES.CraftyService).to(CraftyService);
container.bind<GuessService>(TYPES.GuessService).to(GuessService);
container
  .bind<GuessValidationService>(TYPES.GuessValidationService)
  .to(GuessValidationService);
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
container.bind<UserService>(TYPES.UserService).to(UserService);

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

export { container };
