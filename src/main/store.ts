import Store from 'electron-store';

export interface ConfigStoreSchema {
  appId?: string;
  botToken?: string;
}

export class ConfigStore {
  store: Store;

  constructor() {
    this.store = new Store<ConfigStoreSchema>({
      encryptionKey: 'your-app-secret-key',
    });
  }

  getConfig(): ConfigStoreSchema {
    return {
      appId: this.store.get('appId', ''),
      botToken: this.store.get('botToken', ''),
    };
  }

  saveConfig(config: ConfigStoreSchema): void {
    this.store.set('appId', config.appId);
    this.store.set('botToken', config.botToken);
  }
}
