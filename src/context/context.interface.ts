import { Context, Scenes, session } from "telegraf";

export interface BotSession extends Scenes.SceneSession {
  selectedChatId?: number;
}

export interface IBotContext extends Context {
  scene: Scenes.SceneContextScene<IBotContext, Scenes.SceneSessionData>;
  session: BotSession;
}
