// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer, IpcRendererEvent, webUtils } from 'electron';

contextBridge.exposeInMainWorld('api', {
  onShowError: (callback: (message: string) => void) => {
    ipcRenderer.removeAllListeners('show-error');
    ipcRenderer.on('show-error', (_event: IpcRendererEvent, message: string) => callback(message));
  },
  onLog: (callback: (text: string) => void) => {
    ipcRenderer.removeAllListeners('log');
    ipcRenderer.on('log', (_event: IpcRendererEvent, text: string) => callback(text));
  },
  onProgressUpdate: (callback: (currentCount: number, failedCount: number, totalCount: number) => void) => {
    ipcRenderer.removeAllListeners('progress-update');
    ipcRenderer.on('progress-update', (_event: IpcRendererEvent, currentCount: number, failedCount: number, totalCount: number) => callback(currentCount, failedCount, totalCount));
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
