import { Scenes } from "telegraf";
import { IBotContext } from "../../context/context.interface";
import { UserService } from "../services/UserService";
import { MusicGuessService } from "../services/musicGuess.service";

class MusicGameScene extends Scenes.BaseScene<IBotContext> {
  constructor(
    private musicGuessService: MusicGuessService,
    private userService: UserService,
  ) {
    super("music_game");

    this.setupHandlers();
  }

  setupHandlers() {
    this.enter(async (ctx) => {
      // Initialize game state
      await this.musicGuessService.startGame(ctx);

      // Play first round (0-th round)
      await this.musicGuessService.processRound(ctx);
    });

    this.action(/^guess:(.+)$/, async (ctx) => {
      try {
        const action = ctx.match[1];
        if (!action) return;
        const [roundId, guessId] = action.split("_");
        console.log("Нажата кнопка", roundId, guessId);

        if (!roundId || !guessId) {
          ctx.reply(`Не смог запарсить данные: ${action}`);
          return;
        }
        await this.musicGuessService.processGuess(ctx, +roundId, +guessId);
      } catch (e) {
        console.error(e);
      }
    });

    this.command("next_round", async (ctx) => {
      if (ctx.from.username !== "khodis") {
        await ctx.reply(
          "Только @khodis может насильно начинать следующий раунд :)",
        );
        return;
      }
      await this.musicGuessService.nextRound(ctx);
    });
  }
}

export default MusicGameScene;
