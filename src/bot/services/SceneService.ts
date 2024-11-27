import { RootScene, PongScene, SceneDefinition } from "../temp/Scenes";

class SceneService {
  private scenes: Map<string, SceneDefinition> = new Map([
    ["ROOT_SCENE", RootScene.DEFINITION],
    ["PONG_SCENE", PongScene.DEFINITION],
  ]);

  public readonly ROOT = RootScene.DEFINITION;

  getScene(name: string): SceneDefinition | null {
    return this.scenes.get(name) || null;
  }
}

export default SceneService;
