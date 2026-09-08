import { elements } from './elements';

export function showPage(page: 'setup' | 'usage' | 'main' | 'settings') {
  switch (page) {
    case 'setup':
      elements.setupContainer.style.display = 'block';
      elements.usageContainer.style.display = 'none';
      elements.mainContainer.style.display = 'none';
      elements.settingsContainer.style.display = 'none';
      break;
    case 'usage':
      elements.setupContainer.style.display = 'none';
      elements.usageContainer.style.display = 'block';
      elements.mainContainer.style.display = 'none';
      elements.settingsContainer.style.display = 'none';
      break;
    case 'main':
      elements.setupContainer.style.display = 'none';
      elements.usageContainer.style.display = 'none';
      elements.mainContainer.style.display = 'block';
      elements.settingsContainer.style.display = 'none';
      break;
    case 'settings':
      elements.setupContainer.style.display = 'none';
      elements.usageContainer.style.display = 'none';
      elements.mainContainer.style.display = 'none';
      elements.settingsContainer.style.display = 'block';
  }
}

export function showError(message: string) {
  elements.errorToastMessage.textContent = message;
  elements.errorToast.style.display = 'flex';
}

export function closeError() {
  elements.errorToast.style.display = 'none';
}

export function showNavBtn() {
  elements.showMainBtn.style.display = 'flex';
  elements.showUsageBtn.style.display = 'flex';
  elements.showSettingsBtn.style.display = 'flex';
}
