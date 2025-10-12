import { Composer, Context, NarrowedContext } from 'telegraf';
import { IBotContext } from '@/context/context.interface';
import { RoleService } from '@/modules/permissions/role.service';
import { Message, Update } from 'telegraf/types';
import { TextService } from '@/modules/common/text.service';
import CraftyService from '@/modules/crafty/crafty.service';
import { AxiosError } from 'axios';
import { TYPES } from '@/types';
import { inject, injectable } from 'inversify';
import { ZazuService } from '@/modules/joke/zazu.service';
import { RequirePermission } from '@/modules/permissions/require-permission.decorator';
import { ArgsService } from '@/modules/common/args.service';

type CommandContext = NarrowedContext<IBotContext, Update.MessageUpdate<Message.TextMessage>>;

type CallbackContext = NarrowedContext<IBotContext, Update.CallbackQueryUpdate> & {
  match: RegExpExecArray;
};

@injectable()
export class CraftyModule extends Composer<IBotContext> {
  constructor(
    @inject(TYPES.CraftyService) private craftyService: CraftyService,
    @inject(TYPES.RoleService) private roleService: RoleService,
    @inject(TYPES.TextService) private text: TextService,
    @inject(TYPES.ArgsService) private args: ArgsService,
    @inject(TYPES.ZazuService) private zazuService: ZazuService,
  ) {
    super();

    // Register commands
    this.command('server_list', this.handleServerList.bind(this));
    this.command('get_schemas', this.handleGetSchemas.bind(this));
    this.command('get_schema', this.handleGetSchema.bind(this));

    this.action(/^crafty:(.+?):(.+)$/, this.handleServerAction.bind(this));
  }

  @RequirePermission('MANAGE_CRAFTY')
  private async handleServerAction(ctx: CallbackContext) {
    const [_fullMatch, action, serverId] = ctx.match;

    if (!action) {
      await ctx.answerCbQuery('Не указан action');
      return;
    }

    if (!serverId) {
      await ctx.answerCbQuery('Не указан serverId');
      return;
    }

    try {
      if (action === 'start_server') {
        await this.zazuService.sendMinecraftReaction(ctx);
        await ctx.answerCbQuery(`Ожидайте...`);
        const started = await this.craftyService.startServer(serverId);
        if (started) {
          await ctx.reply(`Сервер ${serverId} запущен!`);
        } else {
          await ctx.reply(`Ошибка при запуске сервера ${serverId}`);
        }
      } else if (action === 'stop_server') {
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
        const status = await this.craftyService.getServerStats(server.server_id.toString());
        return [
          `- ${server.server_name}`,
          `IP: ${server.server_ip}:${server.server_port}`,
          `ID: ${server.server_id}`,
          `Статус: ${status.running ? '🟢 Online' : '🔴 Offline'}`,
          `Игроков: ${status.online}/${status.max}`,
          `Версия: ${status.version}`,
        ].join('\n');
      }),
    );
    return serverList.join('\n\n');
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

  @RequirePermission('MANAGE_CRAFTY')
  private async handleServerList(ctx: CommandContext) {
    try {
      const servers = await this.craftyService.getServerList();
      const serverList = await this.getServerListText();

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

      await ctx.reply(this.text.get('crafty.list.success', { serverList }), {
        reply_markup: {
          inline_keyboard: buttons,
        },
      });
    } catch (error) {
      await this.handleCraftyError(ctx, error);
    }
  }

  private async handleGetSchema(ctx: CommandContext) {
    const [_, schema] = this.args.parse(ctx.message.text);

    if (schema === undefined) {
      await ctx.reply(this.text.get('crafty.schema.usage'));
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

  private async handleCraftyError(ctx: Context, error: unknown) {
    if (error instanceof AxiosError) {
      await ctx.reply(
        this.text.get('crafty.apiError', {
          status: error.response?.status,
          data: JSON.stringify(error.response?.data),
        }),
      );
    } else if (error instanceof Error) {
      await ctx.reply(this.text.get('crafty.genericError', { error: error.message }));
    } else {
      await ctx.reply(this.text.get('crafty.unknownError'));
    }
  }
}
