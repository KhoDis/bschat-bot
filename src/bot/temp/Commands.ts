import { Context } from "telegraf";

abstract class BaseCommand {
  public readonly command: string;
  public readonly name: string;
  public readonly description: string;

  constructor(command: string, name: string, description: string) {
    this.command = command;
    this.name = name;
    this.description = description;
  }

  protected isCallback(ctx: Context): boolean {
    return !!ctx.callbackQuery;
  }

  public abstract docs(): string;

  public abstract execute(ctx: Context): Promise<void>;
}

abstract class SimpleCommand extends BaseCommand {
  constructor(command: string, name: string, description: string) {
    super(command, name, description);
  }

  protected async respond(ctx: Context, message: string): Promise<void> {
    if (this.isCallback(ctx)) {
      await ctx.answerCbQuery(message);
    } else {
      await ctx.reply(message);
    }
  }

  protected async respondMessage(ctx: Context, message: string): Promise<void> {
    if (!ctx.from) {
      await ctx.reply("Context has no from");
      return;
    }

    await ctx.reply(`${ctx.from.first_name} нажал ${this.name}: ${message}`);
  }

  override docs(): string {
    return `/${this.command} - ${this.description}`;
  }
}

class PingCommand extends SimpleCommand {
  constructor() {
    super("ping", "Пинг!", "Проверка работоспособности бота");
  }

  public async execute(ctx: Context): Promise<void> {
    await this.respond(ctx, "Ping!");
  }
}

class PongCommand extends SimpleCommand {
  constructor() {
    super("pong", "Понг!", "Проверка работоспособности бота 2");
  }

  public async execute(ctx: Context): Promise<void> {
    await this.respond(ctx, "Pong!");
  }
}

export { PingCommand, PongCommand, SimpleCommand, BaseCommand };
