import { IBotContext } from "@/context/context.interface";
import { Composer } from "telegraf";
import { inject, injectable } from "inversify";
import { TYPES } from "@/types";
import { dataAction } from "@/utils/filters";
import { MusicGameCommands } from "@/modules/musicGame/music-game.commands";
import { MusicGameActions } from "@/modules/musicGame/music-game.actions";

@injectable()
export class MusicGameComposer extends Composer<IBotContext> {
  constructor(
    @inject(TYPES.MusicGameCommands) private commands: MusicGameCommands,
    @inject(TYPES.MusicGameActions) private actions: MusicGameActions,
  ) {
    super();

    this.setupHandlers();
  }

  private setupHandlers() {
    this.command("music_guess", this.commands.handleMusicGuess.bind(this));
    this.command("list_games", this.commands.handleListGames.bind(this));
    this.command("next_round", this.commands.handleNextRound.bind(this));
    this.command("show_hint", this.commands.handleShowHint.bind(this));

    // New handlers for multiple games
    this.command(
      "active_game",
      this.commands.handleActiveGameCommand.bind(this),
    );

    this.on(dataAction(/^guess:(.+)$/), this.actions.handleGuess.bind(this));
    this.on(
      dataAction(/^service:(.+)$/),
      this.actions.handleService.bind(this),
    );
  }
}
