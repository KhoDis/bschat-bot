import { Context } from "telegraf";

export interface SessionData {
  likeCount: number;
}

export interface IBotContext extends Context {
  session: SessionData;
}
