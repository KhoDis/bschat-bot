import { Context, NarrowedContext } from "telegraf";
import { BaseScene } from "./Scenes";
import { message } from "telegraf/filters";
import { IBotContext } from "../../context/context.interface";
import { Update, Message } from "telegraf/typings/core/types/typegram";

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

  public abstract register(scene: BaseScene): void;
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

  public register(scene: BaseScene): void {
    scene.action(/^command:(.+)$/, async (ctx) => {
      const command = ctx.match[1];
      // Check if it's our command
      if (command !== this.command) return;
      await this.execute(ctx);
    });

    scene.command(this.command, async (ctx) => {
      await this.execute(ctx);
    });
  }

  override docs(): string {
    return `/${this.command} - ${this.description}`;
  }
}

abstract class AudioCommand extends BaseCommand {
  public override docs(): string {
    return `Загрузить аудио - ${this.description}`;
  }
  constructor() {
    super("audio", "Audio", "Загрузите аудиофайл");
  }

  public register(scene: BaseScene): void {
    scene.on(message("audio"), async (ctx) => {
      await this.execute(ctx);
    });
  }

  public abstract override execute(
    ctx: NarrowedContext<
      IBotContext,
      Update.MessageUpdate<Record<"audio", {}> & Message.AudioMessage>
    >
  ): Promise<void>;
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

export { PingCommand, PongCommand, AudioCommand, SimpleCommand, BaseCommand };
