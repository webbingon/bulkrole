import { app, safeStorage } from 'electron';
import Store from 'electron-store';

export interface ConfigStoreSchema {
  botToken?: string;
  isBotTokenEncrypted?: boolean;
}

export class ConfigStore {
  store: Store;

  constructor() {
    this.store = new Store<ConfigStoreSchema>();
  }

  getConfig(): ConfigStoreSchema {
    const isBotTokenEncrypted = this.store.get('isBotTokenEncrypted', false) as boolean;
    const botToken = this.store.get('botToken', '') as string;

    if (isBotTokenEncrypted) {
      if (safeStorage.isEncryptionAvailable()) {
        try {
          const encryptedBufferBotToken = Buffer.from(botToken, 'base64');
          const decryptedBotToken = safeStorage.decryptString(encryptedBufferBotToken);
          return {
            botToken: decryptedBotToken,
          };
        } catch (err) {
          throw new Error('トークンの復号に失敗しました。', { cause: err });
        }
      } else {
        console.warn('The bot token is encrypted but safeStorage is unavailable.');
        return { botToken: '' };
      }
    }

    return {
      botToken,
    };
  }

  saveConfig(config: ConfigStoreSchema): void {
    if (typeof config.botToken !== 'undefined') this.setBotToken(config.botToken);
  }

  setBotToken(token: string): void {
    if (!token) {
      this.store.delete('botToken');
      this.store.delete('isBotTokenEncrypted');
      return;
    }

    if (safeStorage.isEncryptionAvailable()) {
      const encryptedBuffer = safeStorage.encryptString(token);
      this.store.set('botToken', encryptedBuffer.toString('base64'));
      this.store.set('isBotTokenEncrypted', true);
    } else if (!app.isPackaged) {
      console.warn('safeStorage is unavailable.');
      this.store.set('botToken', token);
      this.store.set('isBotTokenEncrypted', false);
    } else {
      throw new Error('OSの暗号化機能 (safeStorage) が利用できません。');
    }
  }
}
