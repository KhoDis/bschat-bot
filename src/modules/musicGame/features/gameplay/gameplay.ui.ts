import { injectable } from 'inversify';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';

/**
 * Gameplay UI - Rendering for active game rounds
 */
@injectable()
export class GameplayUi {
  /**
   * Generate round control buttons
   */
  roundControls(roundId: number): InlineKeyboardButton[][] {
    return [
      [
        { text: '💡 Hint Now', callback_data: `round_hint:${roundId}` },
        { text: '🔁 Replay', callback_data: `round_replay:${roundId}` },
      ],
      [
        { text: '⏭️ Skip', callback_data: `round_skip:${roundId}` },
        { text: '🏁 Reveal', callback_data: `round_reveal:${roundId}` },
      ],
    ];
  }
}
