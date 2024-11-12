// scenes/CollectSceneWrapper.ts

import { Scenes } from "telegraf";
import { IMusicGuessService } from "../events/musicGuess.interface";
import { Scene } from "./scene.class";
import { message } from "telegraf/filters";

export class CollectScene extends Scene {
  readonly scene: Scenes.BaseScene<Scenes.SceneContext>;

  constructor(private musicGuessService: IMusicGuessService) {
    super();
    this.scene = new Scenes.BaseScene<Scenes.SceneContext>("collect");
    this.setup();
  }

  setup() {
    // TODO: add redirect from the superchat
    this.scene.on(message("audio"), async (ctx) => {
      const userId = ctx.from.id;
      const fileId = ctx.message.audio.file_id;

      if (userId && fileId) {
        await this.musicGuessService.addTrack(userId, fileId);
        await ctx.reply("Track added!");
      } else {
        await ctx.reply("Please send an audio file.");
      }
    });
  }

  override enter() {
    this.scene.enter(async (ctx) => {
      await this.musicGuessService.startGame(ctx);
    });
  }

  override leave(): void {
    this.scene.leave(async (ctx) => {
      await this.musicGuessService.showLeaderboard(ctx);
    });
  }
}
