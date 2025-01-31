import { Context } from "telegraf";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { shuffleArray } from "../../utils/arrayUtils";
import { GameRepository } from "../repositories/GameRepository";
import { AppGameRound, AppMusicSubmission, AppUser } from "../../schemas";
import { MusicSubmissionRepository } from "../repositories/MusicSubmissionRepository";
import { IBotContext } from "../../context/context.interface";

export class MusicGuessService {
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
    correctGuess: (points: number) => [
      `🎉 Невероятно! Вы действительно это угадали! ${points} ${this.getPointsWord(points)} вашему благородию!`,
      `🎉 Да вы, никак, знаток! Получите ${points} ${this.getPointsWord(points)} в копилку вашего эго!`,
      `🎉 Кто-то тут гуглил или просто повезло? ${points} ${this.getPointsWord(points)} за ваши старания!`,
    ],
    wrongGuess: [
      "Эх, мимо... Может, стоит подучить матчасть?",
      "Не то! Но попытка была... скажем так, интересная.",
      "Мимо! Но не расстраивайтесь, бывает и хуже... Хотя нет, не бывает.",
    ],
    alreadyGuessed: [
      "Вы уже голосовали! Склероз замучил?",
      "Повторное голосование? Кто-то явно не уверен в себе...",
      "А вот и любитель двойных стандартов! Но нет, один голос - это всё, что вы заслуживаете.",
    ],
    nextRound: [
      "Следующий раунд! Приготовьтесь к новым разочарованиям!",
      "О, вы ещё здесь? Ну ладно, продолжаем мучения...",
      "Новый раунд! Новые возможности опозориться!",
    ],
  };

  constructor(
    private gameRepository: GameRepository,
    private musicSubmissionRepository: MusicSubmissionRepository,
  ) {}

  private getRandomResponse(responses: string[]): string {
    return responses[Math.floor(Math.random() * responses.length)] || "Бе.";
  }

  async showHint(ctx: IBotContext) {
    const round = await this.gameRepository.getCurrentRound();
    if (!round) {
      await ctx.reply(this.getRandomResponse(this.sarcasticResponses.noGame));
      return;
    }

    if (round.hintShown) {
      await ctx.reply(
        this.getRandomResponse(this.sarcasticResponses.hintAlreadyShown),
      );
      return;
    }

    const hint = round.submission.hint;
    if (!hint) {
      await ctx.reply(this.getRandomResponse(this.sarcasticResponses.noHint));
      return;
    }

    await this.gameRepository.updateRoundHint(round.id, true);
    await ctx.reply(`🎵 Подсказка (для тех, кто совсем отчаялся):\n\n${hint}`);
  }

  async addHint(submissionId: number, hint: string): Promise<void> {
    await this.musicSubmissionRepository.updateHint(submissionId, hint);
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
      await ctx.reply(this.getRandomResponse(this.sarcasticResponses.noTracks));
      return;
    }

    const game = await this.gameRepository.createGame(tracks);
    await ctx.reply(
      this.getRandomResponse(this.sarcasticResponses.gameStarted),
    );
    return game;
  }

  async processRound(ctx: Context) {
    const game = await this.gameRepository.getCurrentGame();
    if (!game) {
      await ctx.reply(this.getRandomResponse(this.sarcasticResponses.noGame));
      return;
    }

    const currentRound = await this.gameRepository.getCurrentRound();
    if (!currentRound) {
      await ctx.reply(this.getRandomResponse(this.sarcasticResponses.noRounds));
      await this.showLeaderboard(ctx);
      await this.gameRepository.finishGame(game.id);
      return;
    }

    const participants = await this.gameRepository.getParticipants();
    await this.playRound(ctx, participants, currentRound);
  }

  private async playRound(
    ctx: Context,
    participants: AppUser[],
    currentRound: AppGameRound,
  ) {
    const buttons = participants.map((user) => ({
      text: user.name,
      callback_data: `guess:${currentRound.index}_${user.id}`,
    }));

    const captions = [
      "Угадываем! Или хотя бы делаем вид...",
      "Время показать свою музыкальную ~безграмотность~ эрудицию!",
      "Ну что, готовы к новым музыкальным открытиям?",
      "Внимание! Сейчас будет что-то... интересное.",
    ];

    await ctx.replyWithAudio(currentRound.submission.fileId, {
      caption: this.getRandomResponse(captions),
      reply_markup: { inline_keyboard: this.chunkButtons(buttons, 3) },
    });

    await this.sendRoundInfo(ctx);
  }
  async processGuess(
    ctx: Context,
    roundIndex: number,
    guessedUserId: number,
  ): Promise<void> {
    try {
      const game = await this.gameRepository.getCurrentGame();
      if (!game) {
        await ctx.answerCbQuery(
          this.getRandomResponse(this.sarcasticResponses.noGame),
        );
        return;
      }

      const round = game.rounds.find((r) => r.index === roundIndex);
      if (!round) {
        await ctx.answerCbQuery(
          "Этот раунд существует только в вашем воображении...",
        );
        return;
      }

      const guessingUserId = ctx.from?.id;
      if (!guessingUserId) {
        await ctx.answerCbQuery("Хм... А вы точно существуете? ID не найден!");
        return;
      }

      const existingGuess = await this.gameRepository.findGuess(
        round.id,
        guessingUserId,
      );
      if (existingGuess) {
        await ctx.answerCbQuery(
          this.getRandomResponse(this.sarcasticResponses.alreadyGuessed),
        );
        return;
      }

      const isLateGuess = roundIndex < game.currentRound;
      const isCorrect = round.submission.userId === guessedUserId;
      let points = 0;

      if (isCorrect) {
        if (isLateGuess) {
          points = 1;
        } else if (round.hintShown) {
          points = 2;
        } else {
          points = 4;
        }
      }

      await this.gameRepository.createGuess({
        roundId: round.id,
        userId: guessingUserId,
        guessedId: guessedUserId,
        isCorrect,
        points,
        isLateGuess,
      });

      await ctx.answerCbQuery(
        isCorrect
          ? this.getRandomResponse(this.sarcasticResponses.correctGuess(points))
          : this.getRandomResponse(this.sarcasticResponses.wrongGuess),
      );

      await this.sendRoundInfo(ctx);
    } catch (e) {
      console.error(e);
      await ctx.answerCbQuery("Что-то пошло не так... Наверное, это карма!");
    }
  }

  async nextRound(ctx: Context) {
    const game = await this.gameRepository.getCurrentGame();
    if (!game) {
      await ctx.reply(this.getRandomResponse(this.sarcasticResponses.noGame));
      return;
    }

    await ctx.reply(this.getRandomResponse(this.sarcasticResponses.nextRound));
    await this.gameRepository.updateGameRound(game.id, game.currentRound + 1);
    await this.processRound(ctx);
  }
  async showLeaderboard(ctx: Context) {
    const game = await this.gameRepository.getCurrentGame();
    if (!game) {
      await ctx.reply(
        "О, хотите посмотреть на свои достижения? Но сначала неплохо бы начать игру!",
      );
      return;
    }

    // Calculate user stats with points
    const userStats = new Map<
      number,
      {
        correct: number;
        incorrect: number;
        totalPoints: number;
      }
    >();

    for (const round of game.rounds) {
      for (const guess of round.guesses) {
        const stats = userStats.get(guess.userId) || {
          correct: 0,
          incorrect: 0,
          totalPoints: 0,
        };
        if (guess.isCorrect) {
          stats.correct++;
          stats.totalPoints += guess.points;
        } else {
          stats.incorrect++;
        }
        userStats.set(guess.userId, stats);
      }
    }

    const getUserByIdMap = new Map<number, AppUser>();
    for (const round of game.rounds) {
      getUserByIdMap.set(round.submission.userId, round.submission.user);
    }

    const sortedLeaderboard = [...userStats.entries()]
      .sort(([, a], [, b]) => b.totalPoints - a.totalPoints)
      .map(
        ([userId, stats], index) =>
          `${index + 1}. ${getUserByIdMap.get(userId)?.name || "Unknown"} — 🏆 ${
            stats.totalPoints
          } очков (🎯 ${stats.correct} угадано, ❌ ${stats.incorrect} не угадано)`,
      );

    // Calculate track difficulty
    const trackDifficulty = game.rounds.map((round) => {
      const correctGuesses = round.guesses.filter((g) => g.isCorrect).length;
      return {
        player: round.submission.user.name || "Unknown",
        correctGuesses,
        index: round.index,
      };
    });

    const sortedTracks = trackDifficulty
      .sort((a, b) => a.correctGuesses - b.correctGuesses)
      .map(
        (track, index) =>
          `${index + 1}. "${track.player}" — ${track.correctGuesses} угадали`,
      )
      .join("\n");

    const leaderboardIntros = [
      "🏆 Внимание! Сейчас будет очень смешно... то есть, итоги игры! 🏆",
      "🏆 Барабанная дробь! Время узнать, кто тут самый... ну, скажем так, музыкальный! 🏆",
      "🏆 Итоги игры! Приготовьте платочки - будет и смешно, и грустно! 🏆",
    ];

    const trackIntros = [
      "\n\nА теперь самое интересное - треки, которые вызвали больше всего страданий:",
      "\n\nРейтинг треков 'Почему я этого не знаю?!':",
      "\n\nСамые коварные треки этой игры:",
    ];

    const leaderboardText = (await Promise.all(sortedLeaderboard)).join("\n");
    await ctx.reply(
      `${this.getRandomResponse(leaderboardIntros)}\n\nГерои нашего времени:\n${leaderboardText}${this.getRandomResponse(trackIntros)}\n${sortedTracks}`,
    );
  }

  private async formatRoundInfo(round: AppGameRound) {
    const notYetGuessed = await this.gameRepository.getUsersNotGuessed(
      round.id,
    );
    const thinkingPhrases = [
      "Всё ещё в раздумьях",
      "Мучаются с ответом",
      "Погружены в глубокие размышления",
      "Изображают мыслительный процесс",
    ];

    const correctPhrases = [
      "Счастливчики угадавшие",
      "Знатоки (или везунчики?)",
      "Каким-то чудом угадали",
    ];

    const wrongPhrases = [
      "Промахнулись мимо кассы",
      "Не угадали (как неожиданно!)",
      "Попытались, но увы",
    ];

    return `
        🎯 Раунд ${round.index + 1} - продолжаем веселиться!
        ${round.hintShown ? "💡 Подсказка была показана (для особо одарённых)" : ""}
        
        ${this.getRandomResponse(thinkingPhrases)}: ${notYetGuessed.map((u) => u.name).join(", ")}
        
        ${this.getRandomResponse(correctPhrases)}: ${
          round.guesses
            .filter((g) => g.isCorrect)
            .map(
              (g) =>
                `${g.user.name} (${g.points} ${this.getPointsWord(g.points)})`,
            )
            .join(", ") || "Пока никто! Неужели так сложно?"
        }
        
        ${this.getRandomResponse(wrongPhrases)}: ${
          round.guesses
            .filter((g) => !g.isCorrect)
            .map((g) => g.user.name)
            .join(", ") || "Пока никто не ошибся. Но это ненадолго!"
        }
      `;
  }

  private chunkButtons(buttons: InlineKeyboardButton[], size: number) {
    return Array.from({ length: Math.ceil(buttons.length / size) }, (_, i) =>
      buttons.slice(i * size, i * size + size),
    );
  }

  private getPointsWord(points: number): string {
    if (points === 1) return "очко";
    if (points >= 2 && points <= 4) return "очка";
    return "очков";
  }

  async sendRoundInfo(ctx: Context) {
    const round = await this.gameRepository.getCurrentRound();
    if (!round) {
      await ctx.reply("Больше нет раундов");
      return;
    }

    const info = await this.formatRoundInfo(round);
    await ctx.reply(info);
  }
}
