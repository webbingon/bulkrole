/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';
import { elements } from './renderer/elements';
import { showError, showPage, closeError, showNavBtn } from './renderer/ui';
import { AppInfo } from './main/discord';
import { ConfigStoreSchema } from './main/store';

export interface IElectronAPI {
  onSentLog: (callback: (date: Date, type: 'info' | 'error', message: string) => void) => void;
  onProgressUpdate: (
    callback: (currentCount: number, failedCount: number, totalCount: number) => void
  ) => void;
  fetchAppInfo: () => Promise<AppInfo>;
  executeBulkRole: (csvFile: File, guildId: string) => Promise<void>;
  saveConfig: (config: ConfigStoreSchema) => Promise<boolean>;
  getConfig: () => Promise<ConfigStoreSchema>;
  openExternal: (url: string) => void;
  clearSettingsRestart: () => void;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}

async function fetchAppInfo() {
  elements.guildSelect.disabled = true;
  elements.guildSelect.innerHTML = '<option value="">サーバーを読み込んでいます...</option>';

  let appInfo: AppInfo;

  try {
    appInfo = await window.api.fetchAppInfo();
  } catch (err) {
    showError('Discord APIとの通信に失敗しました。トークンが誤っている可能性があります。');
    console.error('Discord APIとの通信に失敗しました:', err);
    return;
  }

  elements.botNameField.innerText = appInfo.botName;
  elements.appIdField.innerText = appInfo.appId;
  elements.guildCountField.innerText = String(appInfo.guildNames.length);

  if (appInfo.guildNames.length === 0) {
    elements.guildSelect.innerHTML = '<option value="">参加しているサーバーが存在しません</option>';
    return;
  }

  elements.guildSelect.innerHTML = '<option value="">サーバーを選んでください</option>';

  appInfo.guildNames.forEach((guildName) => {
    const option = document.createElement('option');
    option.value = guildName;
    option.textContent = guildName;
    elements.guildSelect.appendChild(option);
  });

  elements.guildSelect.disabled = false;
}

async function initSetupContainer() {
  let isSetupSettingsCompleted = false;

  const onSettingsInput = () => {
    const appId = elements.appIdInput.value.trim();
    const botToken = elements.setupBotTokenInput.value.trim();

    if (appId.length >= 17 && appId.length <= 19 && botToken.length > 0) {
      const url = `https://discord.com/oauth2/authorize?client_id=${appId}&permissions=1099780063232&integration_type=0&scope=bot`;
      elements.inviteLink.href = url;
      elements.inviteLink.textContent = 'Botをサーバーに招待する (クリック)';
      elements.inviteLink.classList.remove('disabled');
      elements.setupSaveBtn.disabled = false;
      isSetupSettingsCompleted = true;
    } else {
      elements.inviteLink.href = '#';
      elements.inviteLink.textContent = '← アプリID・トークンを入力するとリンクが生成されます';
      elements.inviteLink.classList.add('disabled');
      elements.setupSaveBtn.disabled = true;
      isSetupSettingsCompleted = false;
    }
  };

  elements.appIdInput.addEventListener('input', onSettingsInput);
  elements.setupBotTokenInput.addEventListener('input', onSettingsInput);

  elements.setupSaveBtn.addEventListener('click', async () => {
    if (!isSetupSettingsCompleted) showError('アプリID・トークンを正しく入力してください。');

    closeError();
    elements.setupSaveBtn.disabled = true;
    const botToken = elements.setupBotTokenInput.value.trim();

    try {
      await window.api.saveConfig({ botToken });
    } catch (err) {
      showError(
        'トークンの保存に失敗しました。OSが暗号化機能をサポートしていない可能性があります。'
      );
      console.error('トークンの保存に失敗しました:', err);
      elements.setupSaveBtn.disabled = false;
      return;
    }

    showPage('usage');
    elements.setupSaveBtn.disabled = false;
  });
}

async function initMainContainer() {
  window.api.onSentLog((date, type, message) => {
    const text = `${date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })} ${type}: ${message}`;

    elements.logOutput.value += `${text}\n`;
  });

  elements.refreshGuildsBtn.addEventListener('click', fetchAppInfo);

  elements.executeBtn.addEventListener('click', async () => {
    const guildName = elements.guildSelect.value.trim();

    if (guildName === '') {
      showError('サーバーを選択してください。');
      return;
    }

    const csvFileInput = document.getElementById('csv-file') as HTMLInputElement;
    const files = csvFileInput.files;

    if (!files || files.length === 0) {
      showError('CSVファイルを指定してください。');
      return;
    }

    const selectedFile = files[0];

    closeError();
    elements.executeBtn.disabled = true;

    try {
      await window.api.executeBulkRole(selectedFile, guildName);
    } catch (err) {
      showError('処理の実行に失敗しました。');
      console.error('処理の実行に失敗しました:', err);
    }

    elements.executeBtn.disabled = false;
  });

  window.api.onProgressUpdate((currentCount, failedCount, totalCount) => {
    elements.progressText.innerText = `${currentCount} (うち失敗: ${failedCount}) / ${totalCount}`;

    const percent = (currentCount / totalCount) * 100;
    elements.progressBar.innerText = `${percent}%`;
    elements.progressBar.value = percent;
  });
}

async function initSettingsContainer() {
  const onSettingsInput = () => {
    const botToken = elements.settingsBotTokenInput.value.trim();

    if (botToken.length >= 1) {
      elements.settingsSaveBtn.disabled = false;
    } else {
      elements.settingsSaveBtn.disabled = true;
    }
  };

  elements.settingsBotTokenInput.addEventListener('input', onSettingsInput);

  elements.settingsClearRestartBtn.addEventListener('click', window.api.clearSettingsRestart);

  elements.settingsSaveBtn.addEventListener('click', async () => {
    const botToken = elements.settingsBotTokenInput.value.trim();

    elements.settingsSaveBtn.disabled = true;

    try {
      await window.api.saveConfig({ botToken });
    } catch (err) {
      showError('設定の保存に失敗しました。');
      console.error('設定の保存に失敗しました:', err);
      elements.settingsSaveBtn.disabled = false;
    }

    showPage('main');
    elements.settingsSaveBtn.disabled = false;
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  document.addEventListener('click', (event: MouseEvent) => {
    const target = (event.target as HTMLElement).closest('a');

    if (
      target &&
      target.href &&
      (target.href.startsWith('http://') || target.href.startsWith('https://'))
    ) {
      event.preventDefault(); // アプリ内での画面推移を阻止
      window.api.openExternal(target.href); // 外部ブラウザで開く
    }
  });

  initSetupContainer();
  initMainContainer();
  initSettingsContainer();

  elements.errorToastClose.addEventListener('click', closeError);

  elements.usageContinueBtn.addEventListener('click', async () => {
    showPage('main');
    await fetchAppInfo();
    showNavBtn();
  });

  elements.showMainBtn.addEventListener('click', () => showPage('main'));
  elements.showUsageBtn.addEventListener('click', () => showPage('usage'));
  elements.showSettingsBtn.addEventListener('click', () => showPage('settings'));

  try {
    const savedConfig = await window.api.getConfig();

    if (savedConfig.botToken) {
      showPage('main');
      await fetchAppInfo();
      showNavBtn();
    } else {
      showPage('setup');
    }
  } catch (err) {
    console.error(`Failed to load settings: ${err}`);
    showPage('setup');
  }

  console.log('Done!');
});
