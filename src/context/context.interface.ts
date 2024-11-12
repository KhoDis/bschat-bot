import { Context, Scenes } from "telegraf";

export interface SessionData {
//   likeCount: number;
}

export interface IBotContext extends Context, Scenes.SceneContext {
  session: SessionData;
}
