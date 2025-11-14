// popup.js
class TranslatorPopup {
  constructor() {
    this.init();
    this.bindEvents();
    this.loadSettings();
    this.checkStatus();
  }

  init() {
    this.elements = {
      enableTranslation: document.getElementById('enableTranslation'),
      autoIncoming: document.getElementById('autoIncoming'),
      autoOutgoing: document.getElementById('autoOutgoing'),
      fromLang: document.getElementById('fromLang'),
      toLang: document.getElementById('toLang'),
      status: document.getElementById('status'),
      statusText: document.getElementById('statusText'),
    };
  }

  bindEvents() {
    // Toggle events
    this.elements.enableTranslation.addEventListener('change', (e) => {
      this.saveSettings();
      this.updateContentScript();
      this.checkStatus();
    });

    this.elements.autoIncoming.addEventListener('change', () => {
      this.saveSettings();
      this.updateContentScript();
    });

    this.elements.autoOutgoing.addEventListener('change', () => {
      this.saveSettings();
      this.updateContentScript();
    });

    // Language change events
    this.elements.fromLang.addEventListener('change', () => {
      this.saveSettings();
      this.updateContentScript();
    });

    this.elements.toLang.addEventListener('change', () => {
      this.saveSettings();
      this.updateContentScript();
    });
  }

  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get({
        enabled: false,
        autoIncoming: true,
        autoOutgoing: false,
        fromLang: 'auto',
        toLang: 'en',
        apiUrl: 'https://libretranslate.de',
      });

      this.elements.enableTranslation.checked = settings.enabled;
      this.elements.autoIncoming.checked = settings.autoIncoming;
      this.elements.autoOutgoing.checked = settings.autoOutgoing;
      this.elements.fromLang.value = settings.fromLang;
      this.elements.toLang.value = settings.toLang;

      this.updateUI();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async saveSettings() {
    try {
      const settings = {
        enabled: this.elements.enableTranslation.checked,
        autoIncoming: this.elements.autoIncoming.checked,
        autoOutgoing: this.elements.autoOutgoing.checked,
        fromLang: this.elements.fromLang.value,
        toLang: this.elements.toLang.value,
        apiUrl: 'https://libretranslate.de',
      };

      await chrome.storage.sync.set(settings);
      this.updateUI();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  updateUI() {
    const enabled = this.elements.enableTranslation.checked;

    // Disable/enable language and auto options based on main toggle
    this.elements.autoIncoming.disabled = !enabled;
    this.elements.autoOutgoing.disabled = !enabled;
    this.elements.fromLang.disabled = !enabled;
    this.elements.toLang.disabled = !enabled;

    // Update opacity for visual feedback
    const opacity = enabled ? '1' : '0.5';
    document.querySelectorAll('.language-section').forEach((section) => {
      section.style.opacity = opacity;
    });
  }

  async updateContentScript() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (this.isSupportedSite(tab.url)) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'updateSettings',
          settings: {
            enabled: this.elements.enableTranslation.checked,
            autoIncoming: this.elements.autoIncoming.checked,
            autoOutgoing: this.elements.autoOutgoing.checked,
            fromLang: this.elements.fromLang.value,
            toLang: this.elements.toLang.value,
            apiUrl: 'https://libretranslate.de',
          },
        });
      }
    } catch (error) {
      console.error('Failed to update content script:', error);
    }
  }

  async checkStatus() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (this.isSupportedSite(tab.url)) {
        const isEnabled = this.elements.enableTranslation.checked;
        this.updateStatus(isEnabled, 'Supported platform detected');
      } else {
        this.updateStatus(false, 'Navigate to a supported platform');
      }
    } catch (error) {
      this.updateStatus(false, 'Unable to check status');
    }
  }

  updateStatus(isActive, message) {
    this.elements.status.className = `status ${
      isActive ? 'active' : 'inactive'
    }`;
    this.elements.statusText.textContent = message;
  }

  isSupportedSite(url) {
    if (!url) return false;

    const supportedSites = [
      'web.whatsapp.com',
      'web.telegram.org',
      'discord.com',
      'slack.com',
      'teams.microsoft.com',
      'messenger.com',
      'facebook.com',
    ];

    return supportedSites.some((site) => url.includes(site));
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TranslatorPopup();
});
