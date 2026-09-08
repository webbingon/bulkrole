// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer, IpcRendererEvent, webUtils } from 'electron';

contextBridge.exposeInMainWorld('api', {
  onSentLog: (callback: (date: Date, type: 'info' | 'error', message: string) => void) => {
    ipcRenderer.removeAllListeners('send-log');
    ipcRenderer.on(
      'send-log',
      (_event: IpcRendererEvent, date: Date, type: 'info' | 'error', message: string) =>
        callback(date, type, message)
    );
  },
  onProgressUpdate: (
    callback: (currentCount: number, failedCount: number, totalCount: number) => void
  ) => {
    ipcRenderer.removeAllListeners('progress-update');
    ipcRenderer.on(
      'progress-update',
      (_event: IpcRendererEvent, currentCount: number, failedCount: number, totalCount: number) =>
        callback(currentCount, failedCount, totalCount)
    );
  },
  fetchAppInfo: () => ipcRenderer.invoke('fetch-app-info'),
  executeBulkRole: (csvFile: File, guildName: string) =>
    ipcRenderer.invoke('execute-bulkrole', webUtils.getPathForFile(csvFile), guildName),
  saveConfig: (config: { appId: string; botToken: string }) =>
    ipcRenderer.invoke('save-config', config),
  getConfig: () => ipcRenderer.invoke('get-config'),
  // URLを受け取ってメインプロセスへ送信する
  openExternal: (url: string) => ipcRenderer.send('open-external-link', url),
});
