import { elements } from './elements';

export function showPage(page: 'settings' | 'usage' | 'main') {
  switch (page) {
    case 'settings':
      elements.settingsContainer.style.display = 'block';
      elements.usageContainer.style.display = 'none';
      elements.mainContainer.style.display = 'none';
      break;
    case 'usage':
      elements.settingsContainer.style.display = 'none';
      elements.usageContainer.style.display = 'block';
      elements.mainContainer.style.display = 'none';
      break;
    case 'main':
      elements.settingsContainer.style.display = 'none';
      elements.usageContainer.style.display = 'none';
      elements.mainContainer.style.display = 'block';
      break;
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
