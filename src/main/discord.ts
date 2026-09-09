import { RequestData, REST } from '@discordjs/rest';
import {
  Routes,
  RESTGetCurrentApplicationResult,
  RESTGetAPICurrentUserGuildsResult,
  RESTGetAPIGuildMembersResult,
  RESTAPIPartialCurrentUserGuild,
  APIGuildMember,
  RESTGetAPIGuildRolesResult,
  APIRole,
} from 'discord-api-types/v10';

export interface AppInfo {
  botName: string;
  appId: string;
  guildNames: string[];
}

export class DiscordRESTManager {
  protected rest: REST;

  protected guildIdMap?: Record<string, string>;

  constructor(botToken: string) {
    this.rest = new REST({ version: '10' }).setToken(botToken);
  }

  private async runGetRequestByREST<T>(
    route: `/${string}`,
    errorMessage: string,
    options?: RequestData
  ): Promise<T> {
    try {
      return (await this.rest.get(route, options)) as T;
    } catch (err) {
      throw new Error(errorMessage, { cause: err });
    }
  }

  private createIdMap<T>(
    items: T[],
    getName: (item: T) => string,
    getId: (item: T) => string
  ): Record<string, string> {
    const duplicateNames: string[] = [];

    const idMap = items.reduce<Record<string, string>>((acc, item) => {
      const itemName = getName(item);
      const itemId = getId(item);

      if (duplicateNames.includes(itemName)) {
        acc[`${itemName} (ID: ${itemId})`] = itemId;
        return acc;
      }

      if (acc[itemName]) {
        const firstItemId = acc[itemName];

        acc[`${itemName} (ID: ${firstItemId})`] = firstItemId;
        delete acc[`${itemName}`];

        acc[`${itemName} (ID: ${itemId})`] = itemId;

        duplicateNames.push(itemName);

        return acc;
      }

      acc[itemName] = itemId;
      return acc;
    }, {});

    return idMap;
  }

  async fetchAppInfo(): Promise<AppInfo> {
    const app = await this.runGetRequestByREST<RESTGetCurrentApplicationResult>(
      Routes.currentApplication(),
      'アプリ情報の取得に失敗しました。'
    );

    const guilds = await this.runGetRequestByREST<RESTGetAPICurrentUserGuildsResult>(
      Routes.userGuilds(),
      'サーバー情報の取得に失敗しました。'
    );

    const guildIdMap = this.createIdMap<RESTAPIPartialCurrentUserGuild>(
      guilds,
      (guild) => guild.name,
      (guild) => guild.id
    );

    const guildNames = Object.keys(guildIdMap);

    return {
      botName: app.bot?.username || '不明',
      appId: app.id,
      guildNames,
    };
  }

  async getGuildIdMap(): Promise<Record<string, string>> {
    const guilds = await this.runGetRequestByREST<RESTGetAPICurrentUserGuildsResult>(
      Routes.userGuilds(),
      'サーバー情報の取得に失敗しました。'
    );

    const guildIdMap = this.createIdMap<RESTAPIPartialCurrentUserGuild>(
      guilds,
      (guild) => guild.name,
      (guild) => guild.id
    );

    return guildIdMap;
  }

  async getMemberIdMap(guildId: string): Promise<Record<string, string>> {
    const members = await this.runGetRequestByREST<RESTGetAPIGuildMembersResult>(
      Routes.guildMembers(guildId),
      'メンバー情報の取得に失敗しました。',
      {
        query: new URLSearchParams({
          limit: '1000',
        }),
      }
    );

    const memberIdMap = this.createIdMap<APIGuildMember>(
      members,
      (member) => member.nick ?? member.user.global_name ?? member.user.username,
      (member) => member.user.id
    );

    return memberIdMap;
  }

  async getRoleIdMap(guildId: string): Promise<Record<string, string>> {
    const roles = await this.runGetRequestByREST<RESTGetAPIGuildRolesResult>(
      Routes.guildRoles(guildId),
      'ロール情報の取得に失敗しました。'
    );

    const roleIdMap = this.createIdMap<APIRole>(
      roles,
      (role) => role.name,
      (role) => role.id
    );

    return roleIdMap;
  }

  async addGuildMemberRole(guildId: string, memberId: string, roleId: string) {
    try {
      await this.rest.put(Routes.guildMemberRole(guildId, memberId, roleId));
    } catch (err) {
      throw new Error('ロールの付与に失敗しました。', { cause: err });
    }
  }
}
