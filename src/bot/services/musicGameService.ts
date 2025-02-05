import { Context } from "telegraf";
import { shuffleArray } from "../../utils/arrayUtils";
import { GameRepository } from "../repositories/GameRepository";
import { AppMusicSubmission } from "../../schemas";
import { MusicSubmissionRepository } from "../repositories/MusicSubmissionRepository";
import { getRandomResponse } from "../../config/botResponses";

export class MusicGameService {
  private readonly sarcasticResponses = {
    noGame: [
      "Ой, а игры-то нет! Может, она существует в параллельной вселенной?",
      "Игра? Какая игра? Я тут просто для красоты стою...",
      "404: Игра не найдена. Попробуйте включить и выключить своё воображение.",
    ],
    noRounds: [
      "Всё, раунды закончились! Можете расходиться по домам.",
      "Ура! То есть... эхм... больше раундов нет. Какая жалость (не очень).",
      "Раунды закончились. Надеюсь, вы довольны тем, что натворили.",
    ],
    hintAlreadyShown: [
      "Подсказка УЖЕ была показана! Может, стоит записывать такие вещи?",
      "О, кто-то прослушал момент с подсказкой? Неожиданно (нет).",
      "Серьёзно? Опять просите подсказку? А памятью как у золотой рыбки ничего не страдаем?",
    ],
    noHint: [
      "Для этой песни нет подсказки. Видимо, автор решил сделать вашу жизнь ещё сложнее.",
      "Без подсказки? Ха! Удачи с угадыванием!",
      "Упс, подсказки нет. Придётся включить мозг... если найдёте.",
    ],
    gameStarted: [
      "О, великий момент настал! Игра началась! Приготовьтесь демонстрировать своё музыкальное невежество!",
      "Да начнётся битва титанов! Или кто тут у нас... обычных смертных?",
      "Игра стартовала! Надеюсь, вы готовы к полному разгрому ваших музыкальных амбиций!",
    ],
    noTracks: [
      "Никто не отправил треки. Видимо, все внезапно стали скромными. Как необычно!",
      "Ой, а треков-то нет! Может, организуем караоке?",
      "Без треков игра так себе получится. Если только не играть в тишину...",
    ],
    wrongGuess: [
      "Эх, мимо... Может, стоит подучить матчасть?",
      "Не то! Но попытка была... скажем так, интересная.",
      "Мимо! Но не расстраивайтесь, бывает и хуже... Хотя нет, не бывает.",
    ],
    resetGame: ["Игра сброшена."],
  };

  constructor(
    private gameRepository: GameRepository,
    private musicSubmissionRepository: MusicSubmissionRepository,
  ) {}

  async addHint(submissionId: number, hint: string): Promise<void> {
    await this.musicSubmissionRepository.updateHint(submissionId, hint);
  }

  async clearGame(ctx: Context) {
    const game = await this.gameRepository.getCurrentGame();
    if (!game) {
      await ctx.reply(getRandomResponse(this.sarcasticResponses.noGame));
      return;
    }
    await this.gameRepository.deleteGame(game.id);
    await this.musicSubmissionRepository.deleteAll();
    await ctx.reply(getRandomResponse(this.sarcasticResponses.resetGame));
  }

  async isGameStarted(): Promise<boolean> {
    const game = await this.gameRepository.getCurrentGame();
    return !!game;
  }

  async startGame(ctx: Context) {
    const tracks: AppMusicSubmission[] = shuffleArray(
      await this.musicSubmissionRepository.findAll(),
    );
    if (!tracks.length) {
      await ctx.reply(getRandomResponse(this.sarcasticResponses.noTracks));
      return;
    }

    const game = await this.gameRepository.createGame(tracks);
    await ctx.reply(getRandomResponse(this.sarcasticResponses.gameStarted));
    return game;
  }
}
