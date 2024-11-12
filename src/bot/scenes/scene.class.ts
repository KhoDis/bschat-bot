import { Scenes } from "telegraf";

export abstract class Scene {
  abstract readonly scene: Scenes.BaseScene<Scenes.SceneContext>;

  /**
   * Method to initialize the scene logic.
   * This method will be implemented by each scene class individually.
   */
  abstract setup(): void;

  abstract enter(): void;

  abstract leave(): void;
}
