import { inject, injectable } from 'inversify';
import { TYPES } from '@/types';
import { MusicGameRepository } from '@/modules/musicGame/music-game.repository';
import { MemberService } from '@/modules/common/member.service';
import { TextService } from '@/modules/common/text.service';
import { IBotContext } from '@/context/context.interface';
import { GameConfig } from '@/modules/musicGame/config/game-config';

@injectable()
export class GameLifecycleService {
  constructor(
    @inject(TYPES.GameRepository) private gameRepository: MusicGameRepository,
    @inject(TYPES.MemberService) private memberService: MemberService,
    @inject(TYPES.TextService) private text: TextService,
  ) {}

  async start(
    ctx: IBotContext,
  ): Promise<'ALREADY_ACTIVE' | 'NO_TRACKS' | { chatId: number } | 'ERROR'> {
    if (!ctx.chat) return 'ERROR';
    try {
      const activeGame = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
      if (activeGame) return 'ALREADY_ACTIVE';

      const users = await this.memberService.getSubmissionUsers(ctx.chat.id);
      if (!users.length) return 'NO_TRACKS';

      const game = await this.gameRepository.transferSubmissions(ctx.chat.id);
      return { chatId: Number(game.chatId) };
    } catch (e) {
      console.error('Error starting game:', e);
      return 'ERROR';
    }
  }

  async startWithConfig(
    ctx: IBotContext,
    config: GameConfig,
  ): Promise<'ALREADY_ACTIVE' | 'NO_TRACKS' | { chatId: number } | 'ERROR'> {
    if (!ctx.chat) return 'ERROR';
    try {
      const activeGame = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
      if (activeGame) return 'ALREADY_ACTIVE';

      const users = await this.memberService.getSubmissionUsers(ctx.chat.id);
      if (!users.length) return 'NO_TRACKS';

      const game = await this.gameRepository.transferSubmissions(ctx.chat.id);
      await this.gameRepository.updateGameConfig(game.id, {
        status: 'ACTIVE' as any,
        config,
      } as any);
      return { chatId: Number(game.chatId) };
    } catch (e) {
      console.error('Error starting game with config:', e);
      return 'ERROR';
    }
  }

  async end(ctx: IBotContext): Promise<'NO_ACTIVE' | 'ENDED'> {
    if (!ctx.chat) return 'NO_ACTIVE';
    const game = await this.gameRepository.getCurrentGameByChatId(ctx.chat.id);
    if (!game) return 'NO_ACTIVE';
    await this.gameRepository.endGame(game.id);
    return 'ENDED';
  }
}
