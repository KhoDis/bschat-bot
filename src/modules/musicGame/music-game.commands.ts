import { inject, injectable } from "inversify";
import { RequirePermission } from "@/modules/permissions/require-permission.decorator";
import { CommandContext, TYPES } from "@/types";
import { Markup } from "telegraf";
import { MemberService } from "@/modules/common/member.service";
import { MusicGameService } from "@/modules/musicGame/music-game.service";
import { TextService } from "@/modules/common/text.service";
import { RoundService } from "@/modules/musicGame/round.service";
import getCommandArgs from "@/utils/getCommandArgs";

@injectable()
export class MusicGameCommands {
  constructor(
    @inject(TYPES.MemberService) private memberService: MemberService,
    @inject(TYPES.MusicGameService) private musicGameService: MusicGameService,
    @inject(TYPES.TextService) private text: TextService,
    @inject(TYPES.RoundService) private roundService: RoundService,
  ) {}

  @RequirePermission("MANAGE_MUSIC_GAME")
  public async handleMusicGuess(ctx: CommandContext): Promise<void> {
    const keyboard = Markup.inlineKeyboard([
      Markup.button.callback("Начать мучения", "service:start_game"),
    ]);

    await ctx.reply(this.text.get("musicGuess.welcome"), {
      reply_markup: keyboard.reply_markup,
    });

    const users = await this.memberService.getSubmissionUsers(ctx.from.id);
    this.memberService.formatPingNames(users).forEach((batch) => {
      ctx.reply(batch, {
        parse_mode: "Markdown",
      });
    });
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  public async handleListGames(ctx: CommandContext): Promise<void> {
    await this.musicGameService.listGames(ctx);
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  public async handleNextRound(ctx: CommandContext): Promise<void> {
    if (!ctx.chat) return;

    // Extract gameId from command if provided
    const parts = getCommandArgs(ctx);
    const gameId = parts[1] ? Number(parts[1]) : undefined;
    if (!gameId || (parts[1] && isNaN(gameId))) {
      await ctx.reply("Некорректный ID игры.");
      return;
    }

    await this.roundService.nextRound(ctx, gameId);
  }

  @RequirePermission("MANAGE_MUSIC_GAME")
  public async handleShowHint(ctx: CommandContext): Promise<void> {
    await this.roundService.showHint(ctx, ctx.chat.id);
  }

  public async handleActiveGameCommand(ctx: CommandContext): Promise<void> {
    const game = await this.musicGameService.getCurrentGameByChatId(
      ctx.chat.id,
    );

    if (!game) {
      await ctx.reply(`Игра чата ${ctx.chat.id} не найдена`);
      return;
    }

    const gameInfo = [
      `Информация об игре:`,
      `ID: ${game.id}`,
      `Создана: ${game.createdAt.toLocaleDateString()}`,
      `Статус: ${game.activeInChat ? "Активная" : "Завершена"}`,
      `Текущий раунд: ${game.currentRound}`,
    ];

    await ctx.reply(gameInfo.join("\n"));
  }
}
