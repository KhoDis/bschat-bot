import { Composer, Context, NarrowedContext } from "telegraf";
import { IBotContext } from "@/context/context.interface";
import { RoleService } from "@/bot/services/RoleService";
import { Message, Update } from "telegraf/types";
import { TextService } from "@/bot/services/TextService";
import CraftyService from "@/bot/services/CraftyService";
import { AxiosError } from "axios";
import { TYPES } from "@/types";
import { inject, injectable } from "inversify";
import { ZazuService } from "@/bot/services/ZazuService";
import { RequirePermission } from "@/bot/decorators/RequirePermission";
import getCommandArgs from "@/utils/getCommandArgs";

type CommandContext = NarrowedContext<
  IBotContext,
  Update.MessageUpdate<Message.TextMessage>
>;

type CallbackContext = NarrowedContext<
  IBotContext,
  Update.CallbackQueryUpdate
> & {
  match: RegExpExecArray;
};

@injectable()
export class CraftyComposer extends Composer<IBotContext> {
  constructor(
    @inject(TYPES.CraftyService) private craftyService: CraftyService,
    @inject(TYPES.RoleService) private roleService: RoleService,
    @inject(TYPES.TextService) private text: TextService,
    @inject(TYPES.ZazuService) private zazuService: ZazuService,
  ) {
    super();

    // Register commands
    this.command("server_list", this.handleServerList.bind(this));
    this.command("get_schemas", this.handleGetSchemas.bind(this));
    this.command("get_schema", this.handleGetSchema.bind(this));

    this.action(/^crafty:(.+?):(.+)$/, this.handleServerAction.bind(this));
  }

  @RequirePermission("MANAGE_CRAFTY")
  private async handleServerAction(ctx: CallbackContext) {
    const [_fullMatch, action, serverId] = ctx.match;

    if (!action) {
      await ctx.answerCbQuery("Не указан action");
      return;
    }

    if (!serverId) {
      await ctx.answerCbQuery("Не указан serverId");
      return;
    }

    try {
      if (action === "start_server") {
        await this.zazuService.sendMinecraftReaction(ctx);
        await ctx.answerCbQuery(`Ожидайте...`);
        const started = await this.craftyService.startServer(serverId);
        if (started) {
          await ctx.reply(`Сервер ${serverId} запущен!`);
        } else {
          await ctx.reply(`Ошибка при запуске сервера ${serverId}`);
        }
      } else if (action === "stop_server") {
        await this.zazuService.sendMinecraftReaction(ctx);
        await ctx.answerCbQuery(`Ожидайте...`);
        const stopped = await this.craftyService.stopServer(serverId);
        if (stopped) {
          await ctx.reply(`Сервер ${serverId} остановлен!`);
        } else {
          await ctx.reply(`Ошибка при остановке сервера ${serverId}`);
        }
      }
    } catch (error) {
      await this.handleCraftyError(ctx, error);
    }
  }

  private async getServerListText(): Promise<string> {
    const servers = await this.craftyService.getServerList();
    const serverList = await Promise.all(
      servers.map(async (server) => {
        const status = await this.craftyService.getServerStats(
          server.server_id.toString(),
        );
        return [
          `- ${server.server_name}`,
          `IP: ${server.server_ip}:${server.server_port}`,
          `ID: ${server.server_id}`,
          `Статус: ${status.running ? "🟢 Online" : "🔴 Offline"}`,
          `Игроков: ${status.online}/${status.max}`,
          `Версия: ${status.version}`,
        ].join("\n");
      }),
    );
    return serverList.join("\n\n");
  }

  private async handleGetSchemas(ctx: CommandContext) {
    try {
      const schemas = await this.craftyService.getJsonSchemas();
      // Здесь можно реализовать форматирование схемы для читаемого вывода
      await ctx.reply(JSON.stringify(schemas, null, 2));
    } catch (error) {
      await this.handleCraftyError(ctx, error);
    }
  }

  private async handleServerList(ctx: CommandContext) {
    await this.checkPermissions(ctx, async () => {
      try {
        const servers = await this.craftyService.getServerList();
        const serverList = await this.getServerListText();

        // Создаем inline-кнопки
        const buttons = servers.map((server) => {
          return [
            {
              text: `${server.server_name} 🚀`,
              callback_data: `crafty:start_server:${server.server_id}`,
            },
            {
              text: `${server.server_name} ⛔`,
              callback_data: `crafty:stop_server:${server.server_id}`,
            },
          ];
        });

        // Отправляем сообщение с кнопками
        await ctx.reply(this.text.get("crafty.list.success", { serverList }), {
          reply_markup: {
            inline_keyboard: buttons,
          },
        });
      } catch (error) {
        await this.handleCraftyError(ctx, error);
      }
    });
  }

  private async handleGetSchema(ctx: CommandContext) {
    const [_, schema] = getCommandArgs(ctx);

    if (schema === undefined) {
      await ctx.reply(this.text.get("crafty.schema.usage"));
      return;
    }

    try {
      const schemas = await this.craftyService.getJsonSchema(schema);
      // Здесь можно реализовать форматирование схемы для читаемого вывода
      await ctx.reply(JSON.stringify(schemas, null, 2));
    } catch (error) {
      await this.handleCraftyError(ctx, error);
    }
  }

  private async checkPermissions(ctx: IBotContext, next: () => Promise<void>) {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;

    if (!userId || !chatId) {
      await ctx.reply(this.text.get("crafty.chatOnly"));
      return;
    }

    const hasPermission = await this.roleService.hasPermission(
      BigInt(userId),
      BigInt(chatId),
      "MANAGE_CRAFTY",
    );

    if (hasPermission) {
      await next();
    } else {
      await ctx.reply(this.text.get("permissions.denied"));
    }
  }

  private async handleCraftyError(ctx: Context, error: unknown) {
    if (error instanceof AxiosError) {
      await ctx.reply(
        this.text.get("crafty.apiError", {
          status: error.response?.status,
          data: JSON.stringify(error.response?.data),
        }),
      );
    } else if (error instanceof Error) {
      await ctx.reply(
        this.text.get("crafty.genericError", { error: error.message }),
      );
    } else {
      await ctx.reply(this.text.get("crafty.unknownError"));
    }
  }
}
