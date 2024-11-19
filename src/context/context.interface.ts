import { Context, Scenes, session } from "telegraf";

export interface SessionData {
  //   likeCount: number;
}

export interface IBotContext extends Context {
  scene: Scenes.SceneContextScene<IBotContext>;
  session: SessionData;
}
