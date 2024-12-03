import MusicGuessScene from "../scenes/private/music/MusicGuessScene";
import MusicGuessUploadScene from "../scenes/private/music/MusicGuessUploadScene";
import PrivateRootScene from "../scenes/private/PrivateMainMenuScene";
import { RootScene, PongScene, SceneDefinition } from "../temp/Scenes";

class SceneService {
  private scenes: Map<string, SceneDefinition> = new Map([
    [PrivateRootScene.DEFINITION.displayName, PrivateRootScene.DEFINITION],
    [MusicGuessScene.DEFINITION.displayName, MusicGuessScene.DEFINITION],
    [
      MusicGuessUploadScene.DEFINITION.displayName,
      MusicGuessUploadScene.DEFINITION,
    ],
  ]);

  public readonly ROOT = PrivateRootScene.DEFINITION.displayName;

  getScene(name: string): SceneDefinition | null {
    return this.scenes.get(name) || null;
  }
}

export default SceneService;
