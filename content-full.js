// content.js
// Real-time translation content script
console.log('═══════════════════════════════════════');
console.log('🔥 CONTENT SCRIPT LOADING...');
console.log('═══════════════════════════════════════');
console.log('📍 URL:', window.location.href);
console.log('📄 Document state:', document.readyState);

class UniversalTranslator {
  constructor() {
    console.log('🏗️ Constructor called');
    try {
      this.settings = {};
      this.isEnabled = false;
      this.platform = this.detectPlatform();
      this.selectors = this.getPlatformSelectors();
      this.observers = [];
      this.translationCache = new Map();
      this.lastTranslatedInput = '';
      this.cssInjected = false;

      console.log('✅ Constructor initialized, calling init()...');
      this.init();
    } catch (error) {
      console.error('❌ Constructor error:', error);
      alert('Constructor error: ' + error.message);
    }
  }

  async init() {
    console.log('🚀 Init function called');
    try {
      await this.loadSettings();
      this.injectCSS();
      this.setupMessageListener();
      this.setupKeyboardShortcuts();
      this.setupDoubleClickTranslation();

      console.log('🚀 Universal Translator initialized for:', this.platform);
      console.log('⚙️ Settings loaded:', this.settings);
      console.log('✅ Enabled:', this.isEnabled);

      if (this.isEnabled) {
        console.log('🎯 Starting to observe messages...');
        this.startObserving();
      } else {
        console.log('⏸️ Translation disabled in settings');
      }

      this.createFloatingWidget();
    } catch (error) {
      console.error('❌ Failed to initialize translator:', error);
    }
  }

  detectPlatform() {
    const hostname = window.location.hostname;

    if (hostname.includes('web.whatsapp.com')) return 'whatsapp';
    if (hostname.includes('web.telegram.org')) return 'telegram';
    if (hostname.includes('discord.com')) return 'discord';
    if (hostname.includes('slack.com')) return 'slack';
    if (hostname.includes('teams.microsoft.com')) return 'teams';
    if (hostname.includes('messenger.com')) return 'messenger';
    if (hostname.includes('facebook.com')) return 'facebook';

    return 'unknown';
  }

  injectCSS() {
    if (this.cssInjected) return;

    // Inject CSS from content.css
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('content.css');
    document.head.appendChild(link);

    this.cssInjected = true;
  }

  getPlatformSelectors() {
    console.log('🔧 Getting selectors for platform:', this.platform);

    const selectors = {
      whatsapp: {
        messageInput:
          '[contenteditable="true"][data-tab="10"], [contenteditable="true"][data-tab="9"]',
        messages:
          '[data-testid="conversation-panel-messages"] .message-in, [data-testid="conversation-panel-messages"] .message-out, [data-testid="conversation-panel-messages"] [data-testid="msg-container"]',
        messageText: '.copyable-text span, [data-testid="msg-text"]',
        sendButton: '[data-testid="send"], [data-icon="send"]',
        messagesContainer: '[data-testid="conversation-panel-messages"]',
      },
      telegram: {
        messageInput: '.input-message-input, [contenteditable="true"]',
        messages: '.message, .bubble, [class*="message-"]',
        messageText:
          '.message-content, .bubble-content, [class*="message-content"]',
        sendButton: '.btn-send, [data-testid="send"]',
        messagesContainer: '.messages-container, [class*="messages-"]',
      },
      discord: {
        messageInput: '[data-slate-editor="true"], [contenteditable="true"]',
        messages:
          '[id^="chat-messages-"] [class*="message-"], [class*="message-"]',
        messageText: '[class*="messageContent-"], [class*="messageContent"]',
        sendButton: '[data-testid="send-button"], [class*="sendButton"]',
        messagesContainer: '[id^="chat-messages-"], [class*="messages-"]',
      },
      slack: {
        messageInput: '[data-qa="message_input"], [contenteditable="true"]',
        messages: '[data-qa="message"], [class*="message-"]',
        messageText: '[data-qa="message-text"], [class*="message-text"]',
        sendButton: '[data-qa="send_message_button"], [class*="send-button"]',
        messagesContainer:
          '[data-qa="messages_container"], [class*="messages-"]',
      },
      teams: {
        messageInput: '[data-tid="ckeditor"], [contenteditable="true"]',
        messages:
          '[data-tid="message-pane"] .ui-chat__message, [class*="message-"]',
        messageText: '.ui-chat__messagecontent, [class*="message-content"]',
        sendButton: '[data-tid="send-button"], [class*="send-button"]',
        messagesContainer: '[data-tid="message-pane"], [class*="messages-"]',
      },
      messenger: {
        messageInput: '[contenteditable="true"], [data-testid="message_input"]',
        messages: '[data-testid="message"], [class*="message-"]',
        messageText: '[data-testid="message_text"], [class*="message-text"]',
        sendButton: '[data-testid="send_button"], [class*="send-button"]',
        messagesContainer:
          '[data-testid="messages_container"], [class*="messages-"]',
      },
      facebook: {
        messageInput: '[contenteditable="true"], [data-testid="message_input"]',
        messages: '[data-testid="message"], [class*="message-"]',
        messageText: '[data-testid="message_text"], [class*="message-text"]',
        sendButton: '[data-testid="send_button"], [class*="send-button"]',
        messagesContainer:
          '[data-testid="messages_container"], [class*="messages-"]',
      },
    };

    return (
      selectors[this.platform] || {
        messageInput: '[contenteditable="true"], input[type="text"]',
        messages: '[class*="message"], [data-testid*="message"]',
        messageText: '[class*="text"], [class*="content"]',
        sendButton: '[class*="send"], [data-testid*="send"]',
        messagesContainer: '[class*="messages"], [class*="chat"]',
      }
    );
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        this.settings = response || {};
        this.isEnabled = this.settings.enabled || false;
        resolve();
      });
    });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'updateSettings':
          this.settings = request.settings;
          this.isEnabled = request.settings.enabled;

          if (this.isEnabled) {
            this.startObserving();
          } else {
            this.stopObserving();
          }
          break;

        case 'toggleTranslation':
          this.isEnabled = request.enabled;
          this.settings.enabled = request.enabled;

          if (this.isEnabled) {
            this.startObserving();
            this.showToast('Translation enabled', 'success');
          } else {
            this.stopObserving();
            this.showToast('Translation disabled', 'info');
          }
          break;

        case 'showTranslation':
          this.showTranslationPopup(
            request.original,
            request.translation,
            request.fromLang,
            request.toLang
          );
          break;
      }

      sendResponse({ success: true });
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+T: Toggle translation
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'toggle-translation' });
      }

      // Ctrl+Shift+L: Switch languages
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        chrome.runtime.sendMessage({ action: 'switch-languages' });
      }
    });
  }

  setupDoubleClickTranslation() {
    // Handle double-tap/click on incoming messages
    document.addEventListener('dblclick', async (e) => {
      console.log('🖱️ Double-click detected on:', e.target);

      // Try to find the message container - check multiple levels
      let messageElement = e.target;
      let attempts = 0;

      // Walk up the DOM tree to find message container
      while (messageElement && attempts < 10) {
        if (
          messageElement.hasAttribute &&
          (messageElement.hasAttribute('data-testid') ||
            messageElement.classList.contains('message-in') ||
            messageElement.classList.contains('message-out'))
        ) {
          console.log('📦 Found message element:', messageElement);
          break;
        }
        messageElement = messageElement.parentElement;
        attempts++;
      }

      if (messageElement) {
        // Find the text content - try multiple selectors
        const textElement =
          messageElement.querySelector('[data-testid="msg-text"]') ||
          messageElement.querySelector('.copyable-text span') ||
          messageElement.querySelector('span.selectable-text') ||
          e.target.closest('span.selectable-text') ||
          e.target;

        if (textElement) {
          const messageText =
            textElement.textContent?.trim() || textElement.innerText?.trim();

          console.log('📝 Extracted message text:', messageText);

          if (messageText && messageText.length > 0) {
            try {
              console.log(
                '🔄 Translating message:',
                messageText.substring(0, 50)
              );
              const result = await this.translateText(messageText);

              this.showTranslationPopup(
                messageText,
                result.translatedText,
                this.settings.fromLang,
                this.settings.toLang
              );

              console.log('✅ Translation popup shown');
              return;
            } catch (error) {
              console.error('❌ Translation failed:', error);
              this.showToast('Translation failed: ' + error.message, 'error');
              return;
            }
          }
        }
      }

      // Fallback to selected text translation
      const selectedText = window.getSelection().toString().trim();
      if (selectedText && selectedText.length > 0) {
        console.log('📝 Using selected text:', selectedText);
        try {
          const result = await this.translateText(selectedText);
          this.showTranslationPopup(
            selectedText,
            result.translatedText,
            this.settings.fromLang,
            this.settings.toLang
          );
        } catch (error) {
          this.showToast('Translation failed', 'error');
        }
      }
    });
  }

  startObserving() {
    console.log('🎬 startObserving() called');
    console.log('📋 Settings:', {
      autoIncoming: this.settings.autoIncoming,
      autoOutgoing: this.settings.autoOutgoing,
      isEnabled: this.isEnabled,
    });

    this.stopObserving(); // Clean up existing observers

    // Observe incoming messages
    if (this.settings.autoIncoming) {
      console.log('✅ autoIncoming is TRUE - starting observer...');
      this.observeIncomingMessages();
    } else {
      console.log('❌ autoIncoming is FALSE - skipping observer');
    }

    // Observe outgoing messages
    if (this.settings.autoOutgoing) {
      console.log('✅ autoOutgoing is TRUE - starting observer...');
      this.observeOutgoingMessages();
    } else {
      console.log('❌ autoOutgoing is FALSE - skipping observer');
    }

    // Update floating widget
    this.updateFloatingWidget(true);
  }

  stopObserving() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.updateFloatingWidget(false);
  }

  observeIncomingMessages() {
    console.log('🔎 observeIncomingMessages() called');
    console.log('📍 Platform:', this.platform);
    console.log(
      '🎯 Looking for container with selector:',
      this.selectors.messagesContainer
    );

    const messagesContainer = document.querySelector(
      this.selectors.messagesContainer ||
        '[data-testid="conversation-panel-messages"], .messages-container, [id^="chat-messages-"]'
    );

    if (!messagesContainer) {
      console.log(
        '❌ Messages container not found for platform:',
        this.platform
      );
      console.log('Tried selector:', this.selectors.messagesContainer);

      // Let's see what IS on the page
      console.log('🔍 Checking what elements exist...');
      console.log(
        'conversation-panel-messages:',
        document.querySelector('[data-testid="conversation-panel-messages"]')
      );
      console.log(
        'Any data-testid:',
        document.querySelectorAll('[data-testid]').length + ' elements'
      );
      return;
    }

    console.log('✅ Messages container found!', messagesContainer);
    console.log('🎯 Starting to observe...');

    // First, translate all existing messages on the page
    console.log('🏁 Calling translateExistingMessages()...');
    this.translateExistingMessages();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            console.log('📨 New message detected, processing...');
            this.processNewMessage(node);
          }
        });
      });
    });

    observer.observe(messagesContainer, {
      childList: true,
      subtree: true,
    });

    this.observers.push(observer);
  }

  translateExistingMessages() {
    console.log('🔍 Looking for existing messages to translate...');

    // Find all message elements currently on the page
    const messageSelector =
      this.selectors.messages ||
      '[data-testid="msg-container"], .message, [class*="message"]';

    const messages = document.querySelectorAll(messageSelector);
    console.log(`📊 Found ${messages.length} existing messages`);

    if (messages.length === 0) {
      console.warn('⚠️ No messages found with selector:', messageSelector);
      // Try alternative selectors
      const altMessages = document.querySelectorAll('[data-testid^="msg"]');
      console.log(
        `🔄 Trying alternative selector, found ${altMessages.length} messages`
      );

      altMessages.forEach((msg, index) => {
        console.log(
          `📝 Processing existing message ${index + 1}/${altMessages.length}`
        );
        this.processNewMessage(msg);
      });
      return;
    }

    // Process each message
    messages.forEach((msg, index) => {
      console.log(
        `📝 Processing existing message ${index + 1}/${messages.length}`
      );
      this.processNewMessage(msg);
    });
  }

  observeOutgoingMessages() {
    console.log('🎤 Setting up outgoing message translation...');

    const messageInput = document.querySelector(this.selectors.messageInput);

    if (!messageInput) {
      console.log('❌ Message input not found');
      return;
    }

    console.log('✅ Message input found:', messageInput);

    // Intercept send button clicks
    const sendButton = document.querySelector(this.selectors.sendButton);
    if (sendButton) {
      console.log('✅ Send button found, adding click interceptor');

      sendButton.addEventListener(
        'click',
        async (e) => {
          console.log('📤 Send button clicked!');
          const text = messageInput.textContent || messageInput.value;

          if (text && text.trim()) {
            console.log('📝 Text to translate:', text);

            // Prevent default send
            e.preventDefault();
            e.stopPropagation();

            try {
              // Translate first
              console.log('🔄 Translating before send...');
              const result = await this.translateText(text.trim());

              console.log('✅ Translation result:', result.translatedText);

              // Replace with translation
              if (messageInput.contentEditable === 'true') {
                messageInput.textContent = result.translatedText;
              } else {
                messageInput.value = result.translatedText;
              }

              // Trigger input event so WhatsApp knows text changed
              messageInput.dispatchEvent(new Event('input', { bubbles: true }));

              // Now click send again (but this will send the translated text)
              setTimeout(() => {
                console.log('📨 Sending translated message...');
                sendButton.click();
              }, 100);

              this.showToast('Message translated', 'success');
            } catch (error) {
              console.error('❌ Translation failed:', error);
              this.showToast('Translation failed', 'error');
            }
          }
        },
        true
      ); // Use capture phase to intercept before WhatsApp
    }

    // Add translation button near input
    this.addTranslationButton(messageInput);
  }

  async processNewMessage(messageElement) {
    const textElements = messageElement.querySelectorAll(
      this.selectors.messageText
    );

    console.log(
      '🔍 Processing message element. Text elements found:',
      textElements.length
    );

    // Process each text element sequentially to avoid race conditions
    for (const textElement of textElements) {
      const originalText = textElement.textContent.trim();

      console.log('📝 Original text:', originalText);

      if (originalText && originalText.length > 3) {
        try {
          console.log('🔄 Translating:', originalText.substring(0, 50) + '...');
          const result = await this.translateText(originalText);

          console.log('✅ Translation result:', result);

          if (result.translatedText && result.translatedText !== originalText) {
            this.addTranslationToMessage(
              textElement,
              result.translatedText,
              originalText
            );
          } else {
            console.log('⚠️ Translation same as original, skipping');
          }
        } catch (error) {
          console.error('❌ Failed to translate incoming message:', error);
        }
      } else {
        console.log('⏭️ Skipping - text too short or empty');
      }
    }
  }

  async handleOutgoingMessage(inputElement) {
    const text = inputElement.textContent || inputElement.value;

    if (text && text.trim() !== this.lastTranslatedInput) {
      try {
        const result = await this.translateText(text);

        if (result.translatedText !== text) {
          // Replace the input text with translation
          if (inputElement.contentEditable === 'true') {
            inputElement.textContent = result.translatedText;
          } else {
            inputElement.value = result.translatedText;
          }

          this.lastTranslatedInput = result.translatedText;
          this.showToast(
            `Translated to ${this.getLanguageName(this.settings.toLang)}`,
            'success'
          );
        }
      } catch (error) {
        console.error('Failed to translate outgoing message:', error);
        this.showToast('Translation failed', 'error');
      }
    }
  }

  addTranslationToMessage(textElement, translation, original) {
    console.log('🎨 addTranslationToMessage called!', {
      translation,
      original,
    });
    console.log('📍 Target element:', textElement);

    // Check if translation already exists
    if (textElement.querySelector('.translation-overlay')) {
      console.log('⚠️ Translation overlay already exists, skipping');
      return;
    }

    // Create translation display below the message
    const translationDiv = document.createElement('div');
    translationDiv.className = 'translation-overlay show';
    translationDiv.style.cssText = `
      position: relative !important;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.95), rgba(118, 75, 162, 0.95)) !important;
      color: white !important;
      padding: 8px 12px !important;
      margin-top: 4px !important;
      border-radius: 8px !important;
      font-size: 13px !important;
      opacity: 1 !important;
      visibility: visible !important;
      display: block !important;
    `;

    translationDiv.innerHTML = `
      <div style="color: white; font-weight: 500;">
        🌐 ${translation}
      </div>
      <div style="margin-top: 4px; text-align: right;">
        <button class="toggle-btn" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
          Show Original
        </button>
      </div>
    `;

    // Add toggle functionality
    const toggleBtn = translationDiv.querySelector('.toggle-btn');
    const textDiv = translationDiv.querySelector('div');
    let showingOriginal = false;

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showingOriginal = !showingOriginal;
      if (showingOriginal) {
        textDiv.innerHTML = `📝 ${original}`;
        toggleBtn.textContent = 'Show Translation';
      } else {
        textDiv.innerHTML = `🌐 ${translation}`;
        toggleBtn.textContent = 'Show Original';
      }
    });

    // Add after the text element
    textElement.parentElement.appendChild(translationDiv);

    console.log('✅ Translation display added!');
  }

  addTranslationButton(inputElement) {
    // Remove existing button if any
    const existingBtn = document.querySelector('.translation-input-btn');
    if (existingBtn) existingBtn.remove();

    const button = document.createElement('button');
    button.className = 'translation-input-btn';
    button.innerHTML = '🌐';
    button.title = 'Click to translate message';
    button.style.cssText = `
      position: absolute;
      bottom: 12px;
      right: 60px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 50%;
      width: 42px;
      height: 42px;
      font-size: 18px;
      cursor: pointer;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Hover behavior removed for accessibility / UX: no visual change on mouseenter/mouseleave
    // (previously scaled and changed shadow on hover)

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const text = inputElement.textContent || inputElement.value;

      console.log('🔘 Button clicked!');
      console.log('📝 Input text:', text);
      console.log('⚙️ Current settings:', this.settings);

      if (text && text.trim()) {
        // Show loading state
        button.innerHTML = '⏳';
        button.disabled = true;

        try {
          console.log('🔄 Starting translation...');
          console.log(
            'From:',
            this.settings.fromLang,
            'To:',
            this.settings.toLang
          );

          const result = await this.translateText(text.trim());

          console.log('✅ Translation SUCCESS!');
          console.log('Original:', text.trim());
          console.log('Translated:', result.translatedText);

          // Update input with translation - Back to working method
          try {
            if (inputElement.contentEditable === 'true') {
              // Focus first
              inputElement.focus();

              // Select all and delete (this was working before)
              document.execCommand('selectAll', false, null);
              document.execCommand('delete', false, null);

              // Insert translated text
              document.execCommand('insertText', false, result.translatedText);

              console.log(
                '📝 After translation, content is:',
                inputElement.textContent
              );

              // Move cursor to end
              setTimeout(() => {
                inputElement.focus();
                const range = document.createRange();
                const sel = window.getSelection();
                if (inputElement.childNodes.length > 0) {
                  range.selectNodeContents(inputElement);
                  range.collapse(false);
                  sel.removeAllRanges();
                  sel.addRange(range);
                }
              }, 10);
            } else {
              inputElement.value = result.translatedText;
              inputElement.dispatchEvent(new Event('input', { bubbles: true }));
              inputElement.focus();
            }
          } catch (updateError) {
            console.error('Error updating input:', updateError);
          }

          this.showToast(
            `✅ ${result.translatedText.substring(0, 30)}...`,
            'success'
          );

          // Reset button
          button.innerHTML = '🌐';
          button.disabled = false;
        } catch (error) {
          console.error('❌ Translation FAILED:', error);
          console.error('Error details:', error.message);
          this.showToast('❌ Translation failed: ' + error.message, 'error');
          button.innerHTML = '🌐';
          button.disabled = false;
        }
      } else {
        console.warn('⚠️ No text to translate');
        this.showToast('Please type a message first', 'warning');
      }
    });

    // Wait a bit for WhatsApp to fully render, then add button
    setTimeout(() => {
      // Find the footer that contains the input
      const footer =
        document.querySelector(
          'footer[data-testid="conversation-compose-box-input"]'
        ) || document.querySelector('footer');

      if (footer) {
        // Ensure footer has relative positioning
        footer.style.position = 'relative';
        footer.appendChild(button);

        console.log('✅ Translation button added to footer');
        console.log('Footer element:', footer);
      } else {
        // Fallback: try to find the parent container of input
        const parent = inputElement.parentElement?.parentElement;
        if (parent) {
          parent.style.position = 'relative';
          parent.appendChild(button);
          console.log('✅ Translation button added to parent container');
        } else {
          // Last resort: body with fixed position
          button.style.position = 'fixed';
          button.style.right = '80px';
          button.style.bottom = '20px';
          document.body.appendChild(button);
          console.log('⚠️ Translation button added to body (fallback)');
        }
      }
    }, 500);
  }

  async translateText(text) {
    console.log('🔵 translateText() called');
    console.log('📝 Text to translate:', text);
    console.log('⚙️ Settings:', {
      fromLang: this.settings.fromLang,
      toLang: this.settings.toLang,
      apiUrl: this.settings.apiUrl,
    });

    // Check cache first
    const cacheKey = `${text}-${this.settings.fromLang}-${this.settings.toLang}`;
    if (this.translationCache.has(cacheKey)) {
      console.log('💾 Found in cache!');
      return this.translationCache.get(cacheKey);
    }

    console.log('📡 Sending message to background script...');

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'translate',
          text: text,
          fromLang: this.settings.fromLang,
          toLang: this.settings.toLang,
          apiUrl: this.settings.apiUrl,
        },
        (response) => {
          console.log('📨 Received response from background:', response);

          if (chrome.runtime.lastError) {
            console.error('❌ Runtime error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else if (response && response.translation) {
            console.log('✅ Got translation wrapper format');
            // Handle response from background.js which wraps translation in 'translation' object
            const translation = {
              translatedText: response.translation.translatedText,
              detectedLanguage: response.translation.detectedLanguage,
              confidence: response.translation.confidence || 1.0,
            };

            // Cache the result
            this.translationCache.set(cacheKey, translation);

            // Limit cache size
            if (this.translationCache.size > 100) {
              const firstKey = this.translationCache.keys().next().value;
              this.translationCache.delete(firstKey);
            }

            console.log('✅ Resolving with translation:', translation);
            resolve(translation);
          } else if (response && response.translatedText) {
            console.log('✅ Got direct translation format');
            // Handle direct response format (from background-minimal.js)
            const translation = {
              translatedText: response.translatedText,
              detectedLanguage: response.detectedLanguage,
              confidence: response.confidence || 1.0,
            };

            // Cache the result
            this.translationCache.set(cacheKey, translation);

            // Limit cache size
            if (this.translationCache.size > 100) {
              const firstKey = this.translationCache.keys().next().value;
              this.translationCache.delete(firstKey);
            }

            console.log('✅ Resolving with translation:', translation);
            resolve(translation);
          } else {
            console.error('❌ Invalid response format:', response);
            reject(
              new Error(
                'Translation failed: ' +
                  (response?.error || 'No translation data')
              )
            );
          }
        }
      );
    });
  }

  createFloatingWidget() {
    if (document.querySelector('.translator-widget')) return;

    const widget = document.createElement('div');
    widget.className = 'translator-widget';
    widget.innerHTML = `
            <div class="widget-content">
                <div class="widget-icon">🌐</div>
                <div class="widget-status">Inactive</div>
                <div class="widget-langs"></div>
            </div>
        `;

    widget.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'toggle-translation' });
    });

    document.body.appendChild(widget);
    this.updateFloatingWidget(this.isEnabled);
  }

  updateFloatingWidget(isActive) {
    const widget = document.querySelector('.translator-widget');
    if (!widget) return;

    const status = widget.querySelector('.widget-status');
    const langs = widget.querySelector('.widget-langs');

    if (isActive) {
      widget.classList.add('active');
      status.textContent = 'Active';
      langs.textContent = `${this.getLanguageName(
        this.settings.fromLang
      )} → ${this.getLanguageName(this.settings.toLang)}`;
    } else {
      widget.classList.remove('active');
      status.textContent = 'Inactive';
      langs.textContent = '';
    }
  }

  showTranslationPopup(original, translation, fromLang, toLang) {
    // Remove existing popup
    const existingPopup = document.querySelector('.translation-popup');
    if (existingPopup) existingPopup.remove();

    const popup = document.createElement('div');
    popup.className = 'translation-popup';
    popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <span class="popup-title">Translation</span>
                    <button class="popup-close">×</button>
                </div>
                <div class="popup-body">
                    <div class="translation-row">
                        <div class="lang-label">${this.getLanguageName(
                          fromLang
                        )}</div>
                        <div class="text-content original">${original}</div>
                    </div>
                    <div class="translation-arrow">↓</div>
                    <div class="translation-row">
                        <div class="lang-label">${this.getLanguageName(
                          toLang
                        )}</div>
                        <div class="text-content translated">${translation}</div>
                    </div>
                </div>
                <div class="popup-actions">
                    <button class="copy-btn" data-text="${translation}">Copy Translation</button>
                    <button class="insert-btn" data-text="${translation}">Insert</button>
                </div>
            </div>
        `;

    // Position popup at cursor
    const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
    popup.style.left = `${rect.left + window.scrollX}px`;
    popup.style.top = `${rect.bottom + window.scrollY + 10}px`;

    // Event listeners
    popup
      .querySelector('.popup-close')
      .addEventListener('click', () => popup.remove());

    popup.querySelector('.copy-btn').addEventListener('click', (e) => {
      navigator.clipboard.writeText(e.target.dataset.text);
      this.showToast('Copied to clipboard', 'success');
      popup.remove();
    });

    popup.querySelector('.insert-btn').addEventListener('click', (e) => {
      const messageInput = document.querySelector(this.selectors.messageInput);
      if (messageInput) {
        if (messageInput.contentEditable === 'true') {
          messageInput.textContent = e.target.dataset.text;
        } else {
          messageInput.value = e.target.dataset.text;
        }
        this.showToast('Translation inserted', 'success');
      }
      popup.remove();
    });

    document.body.appendChild(popup);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (popup.parentNode) popup.remove();
    }, 10000);
  }

  showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.translator-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `translator-toast ${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('show'), 100);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  getLanguageName(code) {
    const languages = {
      auto: 'Auto-detect',
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      ru: 'Russian',
      ja: 'Japanese',
      ko: 'Korean',
      zh: 'Chinese',
      ar: 'Arabic',
      hi: 'Hindi',
      tr: 'Turkish',
      pl: 'Polish',
      nl: 'Dutch',
    };

    return languages[code] || code.toUpperCase();
  }
}

// Class is now defined globally, no try-catch wrapper

// Initialize when DOM is ready
console.log('📄 Document state:', document.readyState);
try {
  if (document.readyState === 'loading') {
    console.log('⏳ Waiting for DOM to load...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('✅ DOM loaded, initializing translator...');
      try {
        new UniversalTranslator();
      } catch (error) {
        console.error('❌ Failed to create UniversalTranslator:', error);
        alert('Failed to initialize translator: ' + error.message);
      }
    });
  } else {
    console.log('✅ DOM already loaded, initializing translator...');
    try {
      new UniversalTranslator();
    } catch (error) {
      console.error('❌ Failed to create UniversalTranslator:', error);
      alert('Failed to initialize translator: ' + error.message);
    }
  }
} catch (error) {
  console.error('❌ Initialization error:', error);
  alert('Initialization error: ' + error.message);
}

console.log('═══════════════════════════════════════');
console.log('✅ Content script finished loading');
console.log('═══════════════════════════════════════');
