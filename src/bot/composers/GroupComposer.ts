import { IBotContext } from "../../context/context.interface";
import { Composer, NarrowedContext } from "telegraf";
import { UserService } from "../services/UserService";
import { BotResponses, getRandomResponse } from "../../config/botResponses";
import { RoundService } from "../services/RoundService";
import { GuessService } from "../services/GuessService";
import { MusicGameService } from "../services/musicGameService";
import { LeaderboardService } from "../services/LeaderboardService";
import { Message, Update } from "telegraf/types";
import prisma from "../../prisma/client";

const ADMIN_USERNAME = "khodis";

type CallbackQueryContext = NarrowedContext<
  IBotContext,
  Update.CallbackQueryUpdate
> & {
  match: RegExpExecArray;
};

export class GroupComposer extends Composer<IBotContext> {
  constructor(
    private userService: UserService,
    private roundService: RoundService,
    private musicGuessService: MusicGameService,
    private guessService: GuessService,
    private leaderboardService: LeaderboardService,
    private botResponses: BotResponses,
  ) {
    super();

    this.setupHandlers();
  }

  private isAdmin(username: string): boolean {
    return username === ADMIN_USERNAME;
  }

  private async handleAdminCheck(ctx: IBotContext): Promise<boolean> {
    if (!this.isAdmin(ctx.from?.username || "")) {
      await ctx.reply(getRandomResponse(this.botResponses.user.notAdmin));
      return false;
    }
    return true;
  }

  private setupHandlers() {
    this.command("music_guess", this.handleMusicGuess.bind(this));
    this.command("next_round", this.handleNextRound.bind(this));
    this.command("show_hint", this.handleShowHint.bind(this));
    this.command("clear_game", this.handleClearGame.bind(this));
    this.command("dump_db", this.dumpDatabase.bind(this));

    this.action(/^guess:(.+)$/, this.handleGuessAction.bind(this));
    this.action(/^service:(.+)$/, this.handleServiceAction.bind(this));

    this.command("view_games", this.handleViewGames.bind(this));
    this.command("view_rounds", this.handleViewRounds.bind(this));
    this.command("view_users", this.handleViewUsers.bind(this));
    // this.command("view_guesses", this.handleViewGuesses.bind(this));

    this.command("set_game_status", this.handleSetGameStatus.bind(this));
    this.command("set_current_round", this.handleSetCurrentRound.bind(this));
    this.command("set_hint", this.handleSetHint.bind(this));
    this.command("delete_guess", this.handleDeleteGuess.bind(this));
    this.command("update_points", this.handleUpdatePoints.bind(this));
  }

  private async handleViewGames(ctx: IBotContext): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;

    const games = await prisma.game.findMany({
      include: {
        rounds: {
          select: {
            id: true,
            index: true,
            hintShown: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedGames = games
      .map(
        (game) => `
Game ID: ${game.id}
Status: ${game.status}
Current Round: ${game.currentRound}
Created: ${game.createdAt.toLocaleString()}
Rounds: ${game.rounds.length}
  `,
      )
      .join("\n---\n");

    await ctx.reply(formattedGames || "No games found");
  }

  private async handleViewRounds(
    ctx: NarrowedContext<
      IBotContext,
      Update.MessageUpdate<Message.TextMessage>
    >,
  ): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;

    const [_, gameId] = ctx.message.text.split(" ");

    if (!gameId) {
      await ctx.reply("Usage: /view_rounds <gameId>");
      return;
    }

    const rounds = await prisma.gameRound.findMany({
      where: {
        gameId: parseInt(gameId),
      },
      include: {
        submission: true,
        guesses: {
          select: {
            id: true,
            userId: true,
            isCorrect: true,
            points: true,
          },
        },
      },
      orderBy: { index: "asc" },
    });

    const formattedRounds = rounds
      .map(
        (round) => `
Round ID: ${round.id}
Game ID: ${round.gameId}
Index: ${round.index}
Hint Shown: ${round.hintShown}
Hint: ${round.submission.hint || "No hint"}
Correct Guesses: ${round.guesses.filter((g) => g.isCorrect).length}
Total Points: ${round.guesses.reduce((sum, g) => sum + g.points, 0)}
  `,
      )
      .join("\n---\n");

    await ctx.reply(formattedRounds || "No rounds found");
  }

  private async handleViewUsers(ctx: IBotContext): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;

    const users = await prisma.user.findMany({
      include: {
        guesses: {
          select: {
            isCorrect: true,
            points: true,
          },
        },
        musicSubmission: true,
      },
    });

    const formattedUsers = users
      .map(
        (user) => `
User ID: ${user.id}
Name: ${user.name}
Tag: ${user.tag || "No tag"}
Total Points: ${user.guesses.reduce((sum, g) => sum + g.points, 0)}
Correct Guesses: ${user.guesses.filter((g) => g.isCorrect).length}
Has Submission: ${!!user.musicSubmission}
  `,
      )
      .join("\n---\n");

    await ctx.reply(formattedUsers || "No users found");
  }

  // Update handlers
  private async handleSetGameStatus(
    ctx: NarrowedContext<
      IBotContext,
      Update.MessageUpdate<Message.TextMessage>
    >,
  ): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;

    const [_, gameId, newStatus] = ctx.message.text.split(" ");

    if (!gameId || !newStatus) {
      await ctx.reply("Usage: /set_game_status <gameId> <ACTIVE|FINISHED>");
      return;
    }

    try {
      const game = await prisma.game.update({
        where: { id: parseInt(gameId) },
        data: { status: newStatus },
      });
      await ctx.reply(`Updated game ${gameId} status to ${newStatus}`);
    } catch (error) {
      await ctx.reply(
        `Failed to update game status: ${(error as any).message}`,
      );
    }
  }

  private async handleSetCurrentRound(
    ctx: NarrowedContext<
      IBotContext,
      Update.MessageUpdate<Message.TextMessage>
    >,
  ): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;

    const [_, gameId, roundIndex] = ctx.message.text.split(" ");

    if (!gameId || !roundIndex) {
      await ctx.reply("Usage: /set_current_round <gameId> <roundIndex>");
      return;
    }

    try {
      const game = await prisma.game.update({
        where: { id: parseInt(gameId) },
        data: { currentRound: parseInt(roundIndex) },
      });
      await ctx.reply(`Updated game ${gameId} current round to ${roundIndex}`);
    } catch (error) {
      await ctx.reply(
        `Failed to update current round: ${(error as any).message}`,
      );
    }
  }

  private async handleSetHint(
    ctx: NarrowedContext<
      IBotContext,
      Update.MessageUpdate<Message.TextMessage>
    >,
  ): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;

    const [_, submissionId, ...hintParts] = ctx.message.text.split(" ");
    const hint = hintParts.join(" ");

    if (!submissionId || !hint) {
      await ctx.reply("Usage: /set_hint <submissionId> <new hint text>");
      return;
    }

    try {
      await prisma.musicSubmission.update({
        where: { id: parseInt(submissionId) },
        data: { hint },
      });
      await ctx.reply(`Updated submission ${submissionId} hint`);
    } catch (error) {
      await ctx.reply(`Failed to update hint: ${(error as any).message}`);
    }
  }

  private async handleDeleteGuess(
    ctx: NarrowedContext<
      IBotContext,
      Update.MessageUpdate<Message.TextMessage>
    >,
  ): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;

    const [_, guessId] = ctx.message.text.split(" ");

    if (!guessId) {
      await ctx.reply("Usage: /delete_guess <guessId>");
      return;
    }

    try {
      await prisma.guess.delete({
        where: { id: parseInt(guessId) },
      });
      await ctx.reply(`Deleted guess ${guessId}`);
    } catch (error) {
      await ctx.reply(`Failed to delete guess: ${(error as any).message}`);
    }
  }

  private async handleUpdatePoints(
    ctx: NarrowedContext<
      IBotContext,
      Update.MessageUpdate<Message.TextMessage>
    >,
  ): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;

    const [_, guessId, points] = ctx.message.text.split(" ");

    if (!guessId || !points) {
      await ctx.reply("Usage: /update_points <guessId> <points>");
      return;
    }

    try {
      await prisma.guess.update({
        where: { id: parseInt(guessId) },
        data: { points: parseInt(points) },
      });
      await ctx.reply(`Updated guess ${guessId} points to ${points}`);
    } catch (error) {
      await ctx.reply(`Failed to update points: ${(error as any).message}`);
    }
  }

  private async handleMusicGuess(ctx: IBotContext): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "Начать мучения",
            callback_data: "service:start_game",
          },
        ],
      ],
    };

    await ctx.reply(
      "Ладно, время для игры 'Угадай Музыку'! Приготовьтесь демонстрировать своё полное невежество в музыке!",
      { reply_markup: keyboard },
    );

    await this.userService.pingParticipants(ctx);
  }

  private async handleClearGame(ctx: IBotContext): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;
    await this.musicGuessService.clearGame(ctx);
  }

  private async handleNextRound(ctx: IBotContext): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;
    await this.roundService.nextRound(ctx, () => this.handleGameEnd(ctx));
  }

  private async handleGameEnd(ctx: IBotContext): Promise<void> {
    await ctx.reply(getRandomResponse(this.botResponses.rounds.noMoreRounds));
    await this.leaderboardService.showLeaderboard(ctx);
  }

  private async handleShowHint(ctx: IBotContext): Promise<void> {
    if (!(await this.handleAdminCheck(ctx))) return;
    await this.roundService.showHint(ctx);
  }

  private async handleGuessAction(ctx: CallbackQueryContext): Promise<void> {
    const action = ctx.match[1];
    if (!action) return;

    const [roundId, guessId] = action.split("_").map(Number);

    if (
      roundId === null ||
      roundId === undefined ||
      guessId === null ||
      guessId === undefined
    ) {
      await ctx.reply(`Не смог запарсить данные: ${action}`);
      return;
    }

    try {
      await this.guessService.processGuess(
        ctx,
        roundId,
        guessId,
        async () => await this.roundService.sendRoundInfo(ctx),
      );
    } catch (error) {
      console.error("Error processing guess:", error);
      await ctx.answerCbQuery("Что-то пошло не так... Наверное, это карма!");
    }
  }

  private async dumpDatabase(ctx: IBotContext): Promise<void> {
    const users = await prisma.user.findMany();
    const guesses = await prisma.guess.findMany();
    const rounds = await prisma.gameRound.findMany();
    const games = await prisma.game.findMany();
    const submissions = await prisma.musicSubmission.findMany();

    await ctx.reply(
      JSON.stringify(
        { games, rounds },
        (key, value) => (typeof value === "bigint" ? value.toString() : value), // return everything else unchanged
        2,
      ),
    );
  }

  private async handleServiceAction(ctx: CallbackQueryContext): Promise<void> {
    const action = ctx.match[1];
    if (action !== "start_game") return;

    if (!(await this.handleAdminCheck(ctx))) return;

    try {
      const existingGame = await this.musicGuessService.isGameStarted();

      if (!existingGame) {
        await ctx.reply("Я не нашёл уже существующей игры, начинаю новую");
        await this.musicGuessService.startGame(ctx);
      } else {
        await ctx.reply("Я нашёл уже существующую игру, продолжаю её");
      }

      await this.roundService.processRound(ctx, () => this.handleGameEnd(ctx));
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error handling service action:", error);
      await ctx.reply("Произошла ошибка при запуске игры");
    }
  }
}
