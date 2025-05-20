import { CallbackQueryContext, TYPES } from "@/types";
import { inject, injectable } from "inversify";
import { RoundService } from "@/modules/musicGame/round.service";
import { GuessService } from "@/modules/musicGame/guess.service";
import { RequirePermission } from "@/modules/permissions/require-permission.decorator";
import { MusicGameService } from "@/modules/musicGame/music-game.service";

@injectable()
export class MusicGameActions {
  constructor(
    @inject(TYPES.RoundService) private roundService: RoundService,
    @inject(TYPES.GuessService) private guessService: GuessService,
    @inject(TYPES.MusicGameService) private musicGameService: MusicGameService,
  ) {}

  public async handleGuess(ctx: CallbackQueryContext): Promise<void> {
    if (!ctx.chat) return;
    const action = ctx.callbackQuery.data.split(":")[1];
    if (!action) return;

    const [roundIdStr, guessIdStr] = action.split("_");
    const roundId = Number(roundIdStr);
    const guessId = Number(guessIdStr);

    if (isNaN(roundId) || isNaN(guessId)) {
      await ctx.reply(`Не смог распознать данные: ${action}`);
      return;
    }

    try {
      await this.guessService.processGuess(
        ctx,
        roundId,
        ctx.chat.id,
        guessId,
        async () => await this.roundService.sendRoundInfo(ctx, roundId),
      );
    } catch (error) {
      console.error("Error processing guess:", error);
      await ctx.answerCbQuery("Что-то пошло не так... Наверное, это карма!");
    }
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  public async handleService(ctx: CallbackQueryContext): Promise<void> {
    const data = ctx.callbackQuery.data;
    const action = data?.split(":")[1];
    if (action !== "start_game") return;

    try {
      if (!ctx.chat) return;
      const existingGame = await this.musicGameService.isGameStarted(
        ctx.chat.id,
      );

      if (!existingGame) {
        await ctx.reply("Я не нашёл уже существующей игры, начинаю новую");
        await this.musicGameService.startGame(ctx);
      } else {
        await ctx.reply("Я нашёл уже существующую игру, продолжаю её");
      }

      await this.roundService.processRound(ctx, ctx.chat.id);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error handling service action:", error);
      await ctx.reply("Произошла ошибка при запуске игры");
    }
  }
}
