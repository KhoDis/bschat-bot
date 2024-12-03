import { UserService } from "../../../services/UserService";
import { BaseScene, SceneDefinition } from "../../../temp/Scenes";
import SceneService from "../../../services/SceneService";
import UploadMusicCommand from "./UploadMusicCommand";

export class MusicGuessUploadScene extends BaseScene {
  static DEFINITION: SceneDefinition = {
    displayName: "PRIVATE_MUSIC_UPLOAD_SCENE",
    readableName: "Меню",
    commands: [],
  };

  constructor(sceneService: SceneService, userService: UserService) {
    super(sceneService, MusicGuessUploadScene.DEFINITION);

    MusicGuessUploadScene.DEFINITION.commands.push(
      new UploadMusicCommand(userService)
    );
  }
}

export default MusicGuessUploadScene;
