import { injectable } from 'inversify';
import { GameConfig } from '../../config/game-config';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';

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

  /**
   * Generate settings panel keyboard
   */
  settingsKeyboard(
    config: GameConfig,
    actions: {
      toggle: (key: string) => string;
      setPreset: (preset: string) => string;
      setDelay: (key: string, value: number) => string;
      back: string;
    },
  ) {
    // Helper to cycle through delay values
    const nextHintDelay = config.hintDelaySec === 30 ? 60 : config.hintDelaySec === 60 ? 90 : config.hintDelaySec === 90 ? 120 : 30;
    const nextAdvanceDelay = config.advanceDelaySec === 10 ? 20 : config.advanceDelaySec === 20 ? 30 : config.advanceDelaySec === 30 ? 10 : 10;
    const nextPreset = config.scoringPreset === 'classic' ? 'aggressive' : config.scoringPreset === 'aggressive' ? 'gentle' : 'classic';

    const buttons: InlineKeyboardButton[][] = [
      [
        {
          text: `⏱️ Hint Delay: ${config.hintDelaySec}s → ${nextHintDelay}s`,
          callback_data: actions.setDelay('hintDelaySec', nextHintDelay),
        },
      ],
      [
        {
          text: `⏭️ Auto Advance: ${config.autoAdvance ? '✅ ON' : '❌ OFF'}`,
          callback_data: actions.toggle('autoAdvance'),
        },
      ],
      config.autoAdvance
        ? [
            {
              text: `⏱️ Advance Delay: ${config.advanceDelaySec}s → ${nextAdvanceDelay}s`,
              callback_data: actions.setDelay('advanceDelaySec', nextAdvanceDelay),
            },
          ]
        : [],
      [
        {
          text: `🔀 Shuffle: ${config.shuffle ? '✅ ON' : '❌ OFF'}`,
          callback_data: actions.toggle('shuffle'),
        },
      ],
      [
        {
          text: `🎯 Scoring: ${config.scoringPreset} → ${nextPreset}`,
          callback_data: actions.setPreset(nextPreset),
        },
      ],
      [
        {
          text: `👤 Self Guess: ${config.allowSelfGuess ? '✅ ON' : '❌ OFF'}`,
          callback_data: actions.toggle('allowSelfGuess'),
        },
      ],
      [{ text: '🔙 Back to Lobby', callback_data: actions.back }],
    ];

    return {
      inline_keyboard: buttons.filter((row) => row.length > 0),
    };
  }

  /**
   * Format settings text
   */
  settingsText(config: GameConfig): string {
    return `⚙️ <b>Game Settings</b>

⏱️ <b>Hint Delay:</b> ${config.hintDelaySec}s
⏭️ <b>Auto Advance:</b> ${config.autoAdvance ? 'Enabled' : 'Disabled'}
${config.autoAdvance ? `⏱️ <b>Advance Delay:</b> ${config.advanceDelaySec}s\n` : ''}🔀 <b>Shuffle:</b> ${config.shuffle ? 'Enabled' : 'Disabled'}
🎯 <b>Scoring Preset:</b> ${config.scoringPreset}
👤 <b>Allow Self Guess:</b> ${config.allowSelfGuess ? 'Yes' : 'No'}`;
  }
}

