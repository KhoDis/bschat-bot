import { Context, Scenes } from "telegraf";
import { IBotContext } from "../../../../context/context.interface";
import { MusicGuessService } from "../../../services/musicGuess.service";
import { UserService } from "../../../services/UserService";
import PrivateMainMenuScene from "../PrivateMainMenuScene";
import { BaseScene, SceneDefinition } from "../../../temp/Scenes";
import MusicGuessUploadScene from "./MusicGuessUploadScene";
import SceneService from "../../../services/SceneService";
import { SimpleCommand } from "../../../temp/Commands";

export class MusicGuessStatisticsCommand extends SimpleCommand {
  constructor(private userService: UserService) {
    super(
      "music_stats",
      "Статистика",
      "Показывает статистику отправленных треков"
    );
  }

  public override async execute(ctx: Context): Promise<void> {
    const users = await this.userService.getUserSubmissions();
    await ctx.reply(
      `Всего участников: ${users.length}\n\n` +
        users
          .map((user) => `${user.name} ${user.tag ? `(${user.tag})` : ""}`)
          .join("\n")
    );

    return Promise.resolve();
  }
}

// Music Guess Service Scene
export class MusicGuessScene extends BaseScene {
  static DEFINITION: SceneDefinition = {
    displayName: "PRIVATE_MUSIC_GUESS_SCENE",
    readableName: "Угадать Музыку",
    commands: [],
    parent: "PRIVATE_ROOT_SCENE",
    children: [MusicGuessUploadScene.DEFINITION.displayName],
  };

  constructor(sceneService: SceneService, userService: UserService) {
    super(sceneService, MusicGuessScene.DEFINITION);

    MusicGuessScene.DEFINITION.commands.push(
      new MusicGuessStatisticsCommand(userService)
    );
  }
}

export default MusicGuessScene;
