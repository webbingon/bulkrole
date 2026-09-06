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

export interface IElectronAPI {
  onShowError: (callback: (message: string) => void) => void;
  onLog: (callback: (text: string) => void) => void;
  onProgressUpdate: (callback: (currentCount: number, failedCount: number, totalCount: number) => void) => void;
  fetchAppInfo: () => Promise<{ botName: string; appId: string; guildNames: string[] } | undefined>;
  executeBulkRole: (csvFile: File, guildId: string) => Promise<void>;
  saveConfig: (config: { appId: string; botToken: string }) => Promise<boolean>;
  getConfig: () => Promise<{ appId: string; botToken: string }>;
  openExternal: (url: string) => void;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}

import './index.css';

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

  const appIdInput = document.getElementById('app-id') as HTMLInputElement;
  const botTokenInput = document.getElementById('bot-token') as HTMLInputElement;
  const inviteLink = document.getElementById('invite-link') as HTMLAnchorElement;

  const settingsSaveBtn = document.getElementById('settings-save-btn') as HTMLButtonElement;

  let isSettingsCompleted = false;

  function onSettingsInput() {
    const appId = appIdInput.value.trim();
    const botToken = botTokenInput.value.trim();

    if (appId.length >= 17 && appId.length <= 19 && botToken.length > 0) {
      const url = `https://discord.com/oauth2/authorize?client_id=${appId}&permissions=1099780063232&integration_type=0&scope=bot`;
      inviteLink.href = url;
      inviteLink.textContent = 'Botをサーバーに招待する (クリック)';
      inviteLink.classList.remove('disabled');
      settingsSaveBtn.disabled = false;
      isSettingsCompleted = true;
    } else {
      inviteLink.href = '#';
      inviteLink.textContent = '← アプリID・トークンを入力するとリンクが生成されます';
      inviteLink.classList.add('disabled');
      settingsSaveBtn.disabled = true;
      isSettingsCompleted = false;
    }
  }

  if (appIdInput && botTokenInput && inviteLink) {
    appIdInput.addEventListener('input', onSettingsInput);
    botTokenInput.addEventListener('input', onSettingsInput);
  }

  const settingsContainer = document.getElementById('settings-container') as HTMLElement;
  const usageContainer = document.getElementById('usage-container') as HTMLElement;
  const mainContainer = document.getElementById('main-container') as HTMLElement;

  function showPage(page: 'settings' | 'usage' | 'main') {
    switch (page) {
      case 'settings':
        settingsContainer.style.display = 'block';
        usageContainer.style.display = 'none';
        mainContainer.style.display = 'none';
        break;
      case 'usage':
        settingsContainer.style.display = 'none';
        usageContainer.style.display = 'block';
        mainContainer.style.display = 'none';
        break;
      case 'main':
        settingsContainer.style.display = 'none';
        usageContainer.style.display = 'none';
        mainContainer.style.display = 'block';
        break;
    }
  }

  const errorToast = document.getElementById('error-toast') as HTMLElement;
  const errorToastMessage = document.getElementById('error-toast-message') as HTMLElement;
  const errorToastClose = document.getElementById('error-toast-close') as HTMLButtonElement;

  function showError(message: string) {
    if (errorToast && errorToastMessage) {
      errorToastMessage.textContent = message;
      errorToast.style.display = 'flex';
    }
  }

  function closeError() {
    if (errorToast) {
      errorToast.style.display = 'none';
    }
  }

  errorToastClose?.addEventListener('click', closeError);

  const usageContinueBtn = document.getElementById('usage-continue-btn') as HTMLButtonElement;

  settingsSaveBtn.addEventListener('click', async () => {
    if (isSettingsCompleted) {
      closeError();
      settingsSaveBtn.disabled = true;
      const appId = appIdInput.value.trim();
      const botToken = botTokenInput.value.trim();
      await window.api.saveConfig({ appId, botToken });
      settingsSaveBtn.disabled = false;
      showPage('usage');
    } else {
      showError('アプリID・トークンを正しく入力してください。');
    }
  });

  usageContinueBtn.addEventListener('click', async () => {
    showPage('main');
    await fetchAppInfo();
    showNavBtn();
  });

  const showMainBtn = document.getElementById('show-main-btn') as HTMLButtonElement;
  const showUsageBtn = document.getElementById('show-usage-btn') as HTMLButtonElement;
  const showSettingsBtn = document.getElementById('show-settings-btn') as HTMLButtonElement;

  showMainBtn.addEventListener('click', () => showPage('main'));
  showUsageBtn.addEventListener('click', () => showPage('usage'));
  showSettingsBtn.addEventListener('click', () => showPage('settings'));

  function showNavBtn() {
    showMainBtn.style.display = 'flex';
    showUsageBtn.style.display = 'flex';
    showSettingsBtn.style.display = 'flex';
  }

  const logOutput = document.getElementById('log-output') as HTMLTextAreaElement;

  window.api.onLog((text) => {
    if (logOutput) {
      logOutput.value += `${text}\n`;
    }
  });

  window.api.onShowError((message) => {
    showError(message);
  });

  const botNameField = document.getElementById('bot-name') as HTMLElement;
  const appIdField = document.getElementById('bot-app-id') as HTMLElement;
  const guildCountField = document.getElementById('guild-count') as HTMLElement;
  const guildSelect = document.getElementById('guild-select') as HTMLSelectElement;

  async function fetchAppInfo() {
    guildSelect.disabled = true;
    guildSelect.innerHTML = '<option value="">サーバーを読み込んでいます...</option>';

    const appInfo = await window.api.fetchAppInfo();

    if (typeof appInfo === 'undefined') return;

    if (botNameField && appIdField && guildCountField) {
      botNameField.innerText = appInfo.botName;
      appIdField.innerText = appInfo.appId;
      guildCountField.innerText = String(appInfo.guildNames.length);
    }

    if (!guildSelect) return;

    if (appInfo.guildNames.length === 0) {
      guildSelect.innerHTML = '<option value="">参加しているサーバーが存在しません</option>';
      return;
    }

    guildSelect.innerHTML = '<option value="">サーバーを選んでください</option>';

    appInfo.guildNames.forEach((guildName) => {
      const option = document.createElement('option');
      option.value = guildName;
      option.textContent = guildName;
      guildSelect.appendChild(option);
    });

    guildSelect.disabled = false;
  }

  const refreshGuildsBtn = document.getElementById('refresh-guilds-btn');
  refreshGuildsBtn?.addEventListener('click', fetchAppInfo);

  const executeBtn = document.getElementById('execute-btn');

  if (executeBtn) {
    executeBtn.addEventListener('click', async () => {
      const guildName = guildSelect.value.trim();

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

      await window.api.executeBulkRole(selectedFile, guildName);
    });
  }

  const progressField = document.getElementById('progress');

  window.api.onProgressUpdate((currentCount, failedCount, totalCount) => {
    if(progressField) {
      progressField.innerText = `${currentCount} (うち失敗: ${failedCount}) / ${totalCount}`;
    }
  });

  try {
    const savedConfig = await window.api.getConfig();

    if (savedConfig.appId && savedConfig.botToken) {
      if (appIdInput) appIdInput.value = savedConfig.appId;
      if (botTokenInput) botTokenInput.placeholder = '設定済み (非表示)';
      showPage('main');
      await fetchAppInfo();
      showNavBtn();
    } else {
      showPage('settings');
    }
  } catch (err) {
    console.error(`Failed to load settings: ${err}`);
    showPage('settings');
  }

  console.log('Done!');
});
