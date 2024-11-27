import { Context, Scenes } from "telegraf";
import { InlineKeyboardButton } from "telegraf/typings/core/types/typegram";
import { BaseCommand, PingCommand, PongCommand } from "./Commands";
import { IBotContext } from "../../context/context.interface";
import SceneService from "../services/SceneService";

type CommandDefinition = {
  command: string;
  name: string;
  description: string;
};

export type SceneDefinition = {
  displayName: string;
  readableName: string;
  commands: BaseCommand[];
  parent?: string;
  children?: string[];
};

class BaseScene extends Scenes.BaseScene<IBotContext> {
  protected readonly BUTTONS_PER_ROW = 1;
  protected scenes: SceneDefinition[] = [];

  constructor(
    protected sceneService: SceneService,
    protected currentSceneDefinition: SceneDefinition
  ) {
    super(currentSceneDefinition.displayName);

    // Make a list of all scenes
    let currentScene: SceneDefinition | null = this.currentSceneDefinition;
    while (currentScene) {
      this.scenes.push(currentScene);
      currentScene = currentScene.parent
        ? this.sceneService.getScene(currentScene.parent)
        : null;
    }
    this.scenes.reverse();

    this.enter(async (ctx) => {
      await this.onEnter(ctx);
    });

    this.registerCommands();
    this.registerNavigation();

    this.help(async (ctx) => await this.sendDocumentationWithButtons(ctx));
  }

  protected generateDocumentation(): string {
    const docs: string[] = [];

    // Add navigation breadcrumbs
    const breadcrumbs = this.scenes.map((def) => def.readableName);
    docs.push(`${breadcrumbs.join(" > ")}`);

    // For each scene definition
    for (const def of this.scenes) {
      // Add its commands
      docs.push(`\nКоманды "${def.readableName}":`);
      for (const command of def.commands) {
        docs.push(command.docs());
      }
    }

    return docs.join("\n");
  }

  protected generateButtons(): InlineKeyboardButton[][] {
    // Generate a 2D array of InlineKeyboardButton
    const buttons: InlineKeyboardButton[][] = [];
    const { commands } = this.currentSceneDefinition;

    // Loop through commands and organize them into rows
    for (let i = 0; i < commands.length; i += this.BUTTONS_PER_ROW) {
      const row = commands
        .slice(i, i + this.BUTTONS_PER_ROW)
        .map((command) =>
          this.makeButton(command.name, "command:" + command.command)
        );

      buttons.push(row);
    }

    // Add children buttons
    if (this.currentSceneDefinition.children) {
      buttons.push(
        this.currentSceneDefinition.children.map((child) => {
          const scene = this.sceneService.getScene(child);
          return this.makeButton(
            "👉 " + (scene?.readableName || child),
            "navigation:" + child
          );
        })
      );
    }

    // Add navigation buttons
    const parent = this.scenes[this.scenes.length - 2];
    console.log(this.scenes);
    if (parent) {
      buttons.push([
        this.makeButton("🔙 Назад", `navigation:${parent.displayName}`),
        this.makeButton(
          "🔝 Главная",
          `navigation:${this.sceneService.ROOT.displayName}`
        ),
      ]);
    }

    return buttons;
  }

  protected async sendDocumentationWithButtons(ctx: Context): Promise<void> {
    // Use Telegraf's formatting to include the inline keyboard in the message
    await ctx.reply(this.generateDocumentation(), {
      reply_markup: {
        inline_keyboard: this.generateButtons(),
      },
    });
  }

  protected async onEnter(ctx: Context): Promise<void> {
    await this.sendDocumentationWithButtons(ctx);
  }

  private makeButton(text: string, callbackData: string): InlineKeyboardButton {
    return {
      text,
      callback_data: callbackData,
    };
  }

  async registerCommands(): Promise<void> {
    for (const command of this.currentSceneDefinition.commands) {
      this.command(command.command, async (ctx) => {
        await command.execute(ctx);
      });
    }

    this.action(/^command:(.+)$/, async (ctx) => {
      const command = ctx.match[1];
      const commandToExecute = this.currentSceneDefinition.commands.find(
        (c) => c.command === command
      );
      if (commandToExecute) {
        await commandToExecute.execute(ctx);
      }
    });
  }

  async registerNavigation(): Promise<void> {
    this.action(/^navigation:(.+)$/, async (ctx) => {
      const navigation = ctx.match[1];
      if (!navigation) {
        await ctx.answerCbQuery("Что за кракозябрь?");
        return;
      }
      const scene = this.sceneService.getScene(navigation);
      if (scene === null) {
        await ctx.answerCbQuery("Такой сцены нет.");
        return;
      }
      await ctx.answerCbQuery();
      await ctx.scene.enter(scene.displayName);
    });
  }
}

class RootScene extends BaseScene {
  static DEFINITION: SceneDefinition = {
    displayName: "ROOT_SCENE",
    readableName: "Главная",
    commands: [new PingCommand()],
    children: ["PONG_SCENE"],
  };
  constructor(sceneService: SceneService) {
    super(sceneService, RootScene.DEFINITION);
  }
}

class PongScene extends BaseScene {
  static DEFINITION: SceneDefinition = {
    displayName: "PONG_SCENE",
    readableName: "Понг",
    commands: [new PongCommand()],
    parent: "ROOT_SCENE",
  };
  constructor(sceneService: SceneService) {
    super(sceneService, PongScene.DEFINITION);
  }
}

export { RootScene, PongScene };
