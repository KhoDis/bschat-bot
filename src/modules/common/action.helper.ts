// action.helper.ts
export type ActionHandler<TCtx> = (ctx: TCtx, ...args: string[]) => Promise<void>;

interface ActionMap<TCtx> {
  [action: string]: ActionHandler<TCtx>;
}

export class ActionHelper<TCtx extends { callbackQuery?: { data?: string } }> {
  private actions: ActionMap<TCtx> = {};

  handle(action: string, handler: ActionHandler<TCtx>) {
    this.actions[action] = handler;
  }

  // Create callback_data like: "guess:12:45"
  encode(action: string, ...args: (string | number)[]) {
    return [action, ...args.map(String)].join(':');
  }

  async dispatch(ctx: TCtx) {
    const data = ctx.callbackQuery?.data;
    if (!data) return false;

    const [action, ...args] = data.split(':');
    if (!action) return false;
    const handler = this.actions[action];
    if (!handler) return false;

    await handler(ctx, ...args);
    return true;
  }
}
