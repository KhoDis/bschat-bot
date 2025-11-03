import { injectable } from 'inversify';

/**
 * Lobby UI - Rendering for pre-game lobby
 */
@injectable()
export class LobbyUi {
  /**
   * Generate lobby keyboard with action buttons
   */
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
}

