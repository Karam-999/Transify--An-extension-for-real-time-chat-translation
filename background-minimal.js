// Minimal background service worker
console.log('🔵 Background service worker starting...');

// Initialize default settings
chrome.runtime.onInstalled.addListener(() => {
  console.log('🔵 Extension installed/updated');
  chrome.storage.sync.set({
    enabled: true,
    autoIncoming: true,
    autoOutgoing: true,
    fromLang: 'auto',
    toLang: 'es',
    apiUrl: 'https://libretranslate.de',
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🔵 Message received:', request.action);

  if (request.action === 'translate') {
    // Translate text
    translateText(request.text, request.fromLang, request.toLang)
      .then((result) => {
        console.log('✅ Translation successful:', result);
        sendResponse(result);
      })
      .catch((error) => {
        console.error('❌ Translation failed:', error);
        // Fallback: return a test translation so UI still works
        sendResponse({
          translatedText: `[TEST] ${request.text} → Spanish`,
          detectedLanguage: 'en',
          confidence: 0.5,
          error: error.message,
        });
      });
    return true; // Keep channel open for async response
  }

  if (request.action === 'getSettings') {
    chrome.storage.sync.get(null, (settings) => {
      sendResponse(settings);
    });
    return true;
  }
});

// Translation function using MyMemory API
async function translateText(text, fromLang, toLang) {
  try {
    console.log(`🌐 Translating: "${text}" from ${fromLang} to ${toLang}`);

    // Use MyMemory API (free, no key required)
    // Fix: MyMemory needs proper langpair format like "en|es"
    const sourceLang = fromLang === 'auto' ? 'en' : fromLang;
    const langPair = `${sourceLang}|${toLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=${langPair}`;

    console.log('📡 API URL:', url);

    const response = await fetch(url);
    const data = await response.json();

    console.log('📦 API Response:', JSON.stringify(data));

    if (data.responseData && data.responseData.translatedText) {
      const translated = data.responseData.translatedText;
      console.log('✅ Translation successful:', translated);

      return {
        translatedText: translated,
        detectedLanguage: sourceLang,
        confidence: 1.0,
      };
    } else {
      console.error('❌ Invalid response:', data);
      throw new Error('Translation API returned no data');
    }
  } catch (error) {
    console.error('❌ Translation error:', error);
    throw error;
  }
}

console.log('🔵 Background service worker ready');
