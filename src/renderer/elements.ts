export const elements = {
  // 画面コンテナ
  setupContainer: document.getElementById('setup-container') as HTMLElement,
  usageContainer: document.getElementById('usage-container') as HTMLElement,
  mainContainer: document.getElementById('main-container') as HTMLElement,
  settingsContainer: document.getElementById('settings-container') as HTMLElement,

  // ナビゲーション
  showMainBtn: document.getElementById('show-main-btn') as HTMLButtonElement,
  showUsageBtn: document.getElementById('show-usage-btn') as HTMLButtonElement,
  showSettingsBtn: document.getElementById('show-settings-btn') as HTMLButtonElement,

  // セットアップ画面
  appIdInput: document.getElementById('app-id') as HTMLInputElement,
  setupBotTokenInput: document.getElementById('setup-bot-token') as HTMLInputElement,
  inviteLink: document.getElementById('invite-link') as HTMLAnchorElement,
  setupSaveBtn: document.getElementById('setup-save-btn') as HTMLButtonElement,
  usageContinueBtn: document.getElementById('usage-continue-btn') as HTMLButtonElement,

  // トースト
  errorToast: document.getElementById('error-toast') as HTMLElement,
  errorToastMessage: document.getElementById('error-toast-message') as HTMLElement,
  errorToastClose: document.getElementById('error-toast-close') as HTMLButtonElement,

  // メイン画面
  botNameField: document.getElementById('bot-name') as HTMLElement,
  appIdField: document.getElementById('bot-app-id') as HTMLElement,
  guildCountField: document.getElementById('guild-count') as HTMLElement,
  guildSelect: document.getElementById('guild-select') as HTMLSelectElement,
  refreshGuildsBtn: document.getElementById('refresh-guilds-btn') as HTMLButtonElement,
  csvFileInput: document.getElementById('csv-file') as HTMLInputElement,
  executeBtn: document.getElementById('execute-btn') as HTMLButtonElement,
  logOutput: document.getElementById('log-output') as HTMLTextAreaElement,
  progressText: document.getElementById('progress-text') as HTMLElement,
  progressBar: document.getElementById('progress-bar') as HTMLProgressElement,

  // 設定画面
  settingsBotTokenInput: document.getElementById('settings-bot-token') as HTMLInputElement,
  settingsClearRestartBtn: document.getElementById('settings-clear-restart') as HTMLButtonElement,
  settingsSaveBtn: document.getElementById('settings-save-btn') as HTMLButtonElement,
};
