import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { parse } from 'csv/sync';
import { readFile } from 'fs/promises';
import { ConfigStore, ConfigStoreSchema } from './main/store';
import { DiscordRESTManager } from './main/discord';
import iconv from 'iconv-lite';

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
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
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

const configStore = new ConfigStore();

ipcMain.handle('save-config', (_event, config: ConfigStoreSchema) => {
  configStore.saveConfig(config);
  return true;
});

ipcMain.handle('get-config', () => configStore.getConfig());

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

function sendLog(type: 'info' | 'error', message: string) {
  const date = new Date();
  mainWindow?.webContents.send('send-log', date, type, message);
}

function getDiscordRESTManager(): DiscordRESTManager {
  const botToken = configStore.getConfig().botToken;

  if (!botToken) {
    throw new Error('Botのトークンが設定されていません。');
  }

  return new DiscordRESTManager(botToken);
}

ipcMain.handle('fetch-app-info', async () => {
  const restManager = getDiscordRESTManager();
  return await restManager.fetchAppInfo();
});

async function readCSVFile(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);

  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return iconv.decode(buffer.subarray(3), 'utf8');
  }

  const utf8Text = buffer.toString('utf8');
  if (!utf8Text.includes('\uFFFD')) {
    return utf8Text;
  }

  return iconv.decode(buffer, 'shiftjis');
}

async function executeBulkRole(csvFilePath: string, guildName: string) {
  let roleUserList: string[][];

  try {
    const csvFileContent = await readCSVFile(csvFilePath);
    roleUserList = parse(csvFileContent);
    roleUserList.shift();
  } catch (err) {
    throw new Error('CSVファイルの読み込みに失敗しました。', { cause: err });
  }

  const restManager = getDiscordRESTManager();

  const guildIdMap = await restManager.getGuildIdMap();
  const guildId = guildIdMap[guildName];
  if (!guildId) {
    throw new Error(`サーバー ${guildName} が見つかりませんでした。`);
  }

  const memberIdMap = await restManager.getMemberIdMap(guildId);
  const roleIdMap = await restManager.getRoleIdMap(guildId);

  let progressCurrentCount: number = 0;
  let progressFailedCount: number = 0;
  const progressTotalCount: number = roleUserList.length;

  function incrementProgress(type: 'success' | 'failed') {
    progressCurrentCount += 1;

    if (type === 'failed') progressFailedCount += 1;

    if (mainWindow) {
      mainWindow.webContents.send(
        'progress-update',
        progressCurrentCount,
        progressFailedCount,
        progressTotalCount
      );
    }
  }

  async function addGuildMemberRole(
    guildId: string,
    memberName: string,
    roleName: string
  ): Promise<void> {
    const memberId = memberIdMap[memberName];
    const roleId = roleIdMap[roleName];

    if (typeof memberId === 'undefined') {
      sendLog('error', `メンバー ${memberName} が見つかりませんでした。`);
      incrementProgress('failed');
      return;
    }

    if (typeof roleId === 'undefined') {
      sendLog('error', `ロール ${roleName} が見つかりませんでした。`);
      incrementProgress('failed');
      return;
    }

    try {
      await restManager.addGuildMemberRole(guildId, memberId, roleId);
      sendLog('info', `メンバー ${memberName} にロール ${roleName} を付与しました。`);
      incrementProgress('success');
    } catch (err) {
      sendLog(
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

        if (typeof memberName === 'undefined' || typeof roleName === 'undefined') return;

        return addGuildMemberRole(guildId, memberName, roleName);
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

ipcMain.on('clear-settings-restart', () => {
  configStore.saveConfig({ botToken: '' });
  app.relaunch();
  app.exit();
});
