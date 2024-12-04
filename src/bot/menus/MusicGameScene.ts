import { Scenes } from "telegraf";
import { IBotContext } from "../../context/context.interface";
import { UserService } from "../services/UserService";
import handleCheckMusic from "../handlers/handleCheckMusic";
import { MusicGuessService } from "../services/musicGuess.service";

class MusicGameScene extends Scenes.BaseScene<IBotContext> {
  constructor(
    private musicGuessService: MusicGuessService,
    private userService: UserService
  ) {
    super("music_game");

    this.setupHandlers();
  }

  setupHandlers() {
    this.enter(async (ctx) => {
      // Initialize game state
      const participants = await this.userService.getSubmissionUsers();
      await this.musicGuessService.startGame(ctx, participants);

      // Play first round (0-th round)
      await this.musicGuessService.processRound(ctx);
    });

    this.action(/^guess:(.+)$/, async (ctx) => {
      const action = ctx.match[1];
      if (!action) return;
      const [roundId, guessId] = action.split("_");
      console.log("Нажата кнопка", roundId, guessId);

      if (!roundId || !guessId) {
        ctx.reply(`Не смог запарсить данные: ${action}`);
        return;
      }
      await this.musicGuessService.processGuess(ctx, +roundId, +guessId);
    });

    this.command("next_round", async (ctx) => {
      if (ctx.from.username !== "khodis") {
        await ctx.reply(
          "Только @khodis может насильно начинать следующий раунд :)"
        );
        return;
      }
      await this.musicGuessService.nextRound(ctx);
    });
  }
}

export default MusicGameScene;
