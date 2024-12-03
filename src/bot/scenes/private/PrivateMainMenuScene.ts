import SceneService from "../../services/SceneService";
import { BaseScene, SceneDefinition } from "../../temp/Scenes";
import MusicGuessScene from "./music/MusicGuessScene";

export class PrivateRootScene extends BaseScene {
  static DEFINITION: SceneDefinition = {
    displayName: "PRIVATE_ROOT_SCENE",
    readableName: "Меню",
    commands: [],
    children: [MusicGuessScene.DEFINITION.displayName],
  };

  constructor(sceneService: SceneService) {
    super(sceneService, PrivateRootScene.DEFINITION);
  }
}

export default PrivateRootScene;
