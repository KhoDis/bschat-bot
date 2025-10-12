import { injectable } from 'inversify';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';

@injectable()
export class UiRenderer {
  lobbyKeyboard(actions: { start: string; settings: string; info: string; players: string }) {
    return {
      inline_keyboard: [
        [
          { text: '🎮 Start Game', callback_data: actions.start },
          { text: '⚙️ Settings', callback_data: actions.settings },
        ],
        [
          { text: '📊 Game Info', callback_data: actions.info },
          { text: '👥 Players', callback_data: actions.players },
        ],
      ],
    };
  }

  roundControls(roundId: number) {
    const controls: InlineKeyboardButton[][] = [
      [
        { text: '💡 Hint Now', callback_data: `round_hint:${roundId}` },
        { text: '🔁 Replay', callback_data: `round_replay:${roundId}` },
      ],
      [
        { text: '⏭️ Skip', callback_data: `round_skip:${roundId}` },
        { text: '🏁 Reveal', callback_data: `round_reveal:${roundId}` },
      ],
    ];
    return controls;
  }
}
