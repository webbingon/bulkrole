import { app, BrowserWindow, ipcMain, shell } from 'electron';
import Store from 'electron-store';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { parse } from 'csv/sync';
import { readFile } from 'fs/promises';
import { REST } from '@discordjs/rest';
import {
  Routes,
  RESTGetAPIGuildMembersResult,
  RESTGetAPIGuildRolesResult,
  RESTGetCurrentApplicationResult,
  RESTGetAPICurrentUserGuildsResult,
} from 'discord-api-types/v10';

let mainWindow: BrowserWindow | null = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

interface StoreSchema {
  appId: string;
  botToken: string;
}

const store = new Store<StoreSchema>({
  encryptionKey: 'your-app-secret-key',
});

ipcMain.handle('save-config', (_event, config: { appId: string; botToken: string }) => {
  store.set('appId', config.appId);
  store.set('botToken', config.botToken);
  return true;
});

function getConfig(): { appId: string; botToken: string } {
  return {
    appId: store.get('appId', ''),
    botToken: store.get('botToken', ''),
  };
}

ipcMain.handle('get-config', () => getConfig());

// 外部リンクを開くIPCハンドラー
ipcMain.on('open-external-link', async (_event, url: string) => {
  try {
    // http / https のURLのみ許可する
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      await shell.openExternal(url);
    } else {
      console.warn(`許可されていないプロトコルです: ${parsedUrl.protocol}`);
    }
  } catch (error) {
    console.error('URLの解析エラーまたはオープン失敗:', error);
  }
});

const BATCH_SIZE = 40;
const INTERVAL = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showError(message: string) {
  if (mainWindow) {
    mainWindow.webContents.send('show-error', message);
  }
}

function log(type: 'info' | 'error', message: string) {
  const date = new Date();
  const text = `${date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })} ${type}: ${message}`;

  if (mainWindow) {
    mainWindow.webContents.send('log', text);
  }
}

function createRESTClient() {
  const botToken = getConfig().botToken;
  return new REST({ version: '10' }).setToken(botToken);
}

let guildIdMap: Record<string, string> | undefined = undefined;

async function fetchAppInfo() {
  const rest = createRESTClient();

  let app: RESTGetCurrentApplicationResult;

  try {
    app = (await rest.get(Routes.currentApplication())) as RESTGetCurrentApplicationResult;
  } catch (err) {
    log('error', `アプリ情報の取得に失敗しました: ${err}`);
    showError('アプリ情報の取得に失敗しました。');
    return;
  }

  let guilds: RESTGetAPICurrentUserGuildsResult;

  try {
    guilds = (await rest.get(Routes.userGuilds())) as RESTGetAPICurrentUserGuildsResult;
  } catch (err) {
    log('error', `サーバー情報の取得に失敗しました: ${err}`);
    showError('サーバー情報の取得に失敗しました。');
    return;
  }

  const duplicateGuildNames: string[] = [];

  guildIdMap = guilds.reduce<Record<string, string>>((acc, guild) => {
    const guildName = guild.name;
    const guildId = guild.id;

    if (duplicateGuildNames.includes(guildName)) {
      acc[`${guildName} (ID: ${guildId})`] = guildId;
      return acc;
    }

    if (acc[guildName]) {
      acc[`${guildName} (ID: ${acc[guildName]})`] = acc[guildName];
      delete acc[guildName];
      duplicateGuildNames.push(guildName);
      return acc;
    }

    acc[guildName] = guildId;
    return acc;
  }, {});

  const guildNames = Object.keys(guildIdMap);

  return {
    botName: app.bot?.username || '不明',
    appId: app.id,
    guildNames,
  };
}

ipcMain.handle('fetch-app-info', async () => {
  return await fetchAppInfo();
});

async function executeBulkRole(csvFilePath: string, guildName: string) {
  let roleUserList: string[][];

  try {
    roleUserList = parse(await readFile(csvFilePath, { encoding: 'utf-8' }));
  } catch (err) {
    log('error', `CSVファイルの読み込みに失敗しました: ${err}`);
    showError('CSVファイルの読み込みに失敗しました。');
    return;
  }

  roleUserList.shift();

  if (typeof guildIdMap === 'undefined') {
    try {
      await fetchAppInfo();
      executeBulkRole(csvFilePath, guildName);
      return;
    } catch (err) {
      log('error', `アプリ・サーバーに関する情報の取得に失敗しました: ${err}`);
      showError('アプリ・サーバーに関する情報の取得に失敗しました。');
      return;
    }
  }

  const guildId = guildIdMap[guildName];

  const rest = createRESTClient();

  let members: RESTGetAPIGuildMembersResult;

  try {
    members = (await rest.get(Routes.guildMembers(guildId))) as RESTGetAPIGuildMembersResult;
  } catch (err) {
    log('error', `メンバー情報の取得に失敗しました: ${err}`);
    showError('メンバ―情報の取得に失敗しました。');
    return;
  }

  let roles: RESTGetAPIGuildRolesResult;

  try {
    roles = (await rest.get(Routes.guildRoles(guildId))) as RESTGetAPIGuildRolesResult;
  } catch (err) {
    log('error', `ロール情報の取得に失敗しました: ${err}`);
    showError('ロール情報の取得に失敗しました。');
    return;
  }

  const duplicateMemberNames: string[] = [];

  const memberIdMap = members.reduce<Record<string, string>>((acc, member) => {
    const memberName = member.nick ?? member.user?.global_name ?? member.user?.username;
    const memberId = member.user.id;

    if (duplicateMemberNames.includes(memberName)) {
      acc[`${memberName} (ID: ${memberId})`] = memberId;
      return acc;
    }

    if (acc[memberName]) {
      acc[`${memberName} (ID: ${acc[memberName]})`] = acc[memberName];
      delete acc[memberName];
      duplicateMemberNames.push(memberName);
      return acc;
    }

    acc[memberName] = memberId;
    return acc;
  }, {});

  const duplicateRoleNames: string[] = [];

  const roleIdMap = roles.reduce<Record<string, string>>((acc, role) => {
    const roleName = role.name;
    const memberId = role.id;

    if (duplicateRoleNames.includes(roleName)) {
      acc[`${roleName} (ID: ${memberId})`] = memberId;
      return acc;
    }

    if (acc[roleName]) {
      acc[`${roleName} (ID: ${acc[roleName]})`] = acc[roleName];
      delete acc[roleName];
      duplicateRoleNames.push(roleName);
      return acc;
    }

    acc[roleName] = memberId;
    return acc;
  }, {});

  let progressCurrentCount: number = 0;
  let progressFailedCount: number = 0;
  let progressTotalCount: number = roleUserList.length;

  function incrementProgress(type: 'success' | 'failed') {
    progressCurrentCount += 1;

    if(type === 'failed') progressFailedCount += 1;

    if(mainWindow) {
      mainWindow.webContents.send('progress-update', progressCurrentCount, progressFailedCount, progressTotalCount);
    }
  }

  async function setGuildMemberRole(
    guildId: string,
    memberName: string,
    roleName: string
  ): Promise<void> {
    const memberId = memberIdMap[memberName];
    const roleId = roleIdMap[roleName];

    if (typeof memberId === 'undefined') {
      log('error', `メンバー ${memberName} が見つかりませんでした。`);
      incrementProgress('failed');
      return;
    }

    if (typeof roleId === 'undefined') {
      log('error', `ロール ${roleName} が見つかりませんでした。`);
      incrementProgress('failed');
      return;
    }

    try {
      await rest.put(Routes.guildMemberRole(guildId, memberId, roleId));
      log(
        'info',
        `メンバー ${memberName} にロール ${roleName} を付与しました。`
      );
      incrementProgress('success');
    } catch (err) {
      log(
        'error',
        `メンバー ${memberName} にロール ${roleName} を付与できませんでした: ${err}`
      );
      incrementProgress('failed');
    }
  }

  for (let i = 0; i < roleUserList.length; i += BATCH_SIZE) {
    const startTime = Date.now();
    const batch = roleUserList.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (item) => {
        const memberName = item[0];
        const roleName = item[1];

        if (
          typeof memberName === 'undefined' ||
          typeof roleName === 'undefined' ||
          typeof guildIdMap === 'undefined'
        )
          return;

        return setGuildMemberRole(guildId, memberName, roleName);
      })
    );

    const elapsedTime = Date.now() - startTime;

    if (i + BATCH_SIZE < roleUserList.length) {
      const waitTime = Math.max(0, INTERVAL - elapsedTime);
      await sleep(waitTime);
    }
  }
}

ipcMain.handle('execute-bulkrole', async (_event, csvFilePath: string, guildName: string) => {
  await executeBulkRole(csvFilePath, guildName);
});
