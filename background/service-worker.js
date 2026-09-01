/**
 * Virtual Friend — Background Service Worker (Manifest V3)
 */

const DEFAULT_SETTINGS = {
  enabled: true,
  privacyMode: false,
  characterType: "anime_image", // 'anime_image', 'procedural', 'custom_image'
  customCharacterDataUrl: null,
  size: "medium",
  position: "bottom-right",
  opacity: 1.0,
  soundsEnabled: false,
  volume: 0.5,
  animationFrequency: "normal", // 'low', 'normal', 'high'
  videoAwarenessEnabled: true,
  interactionEnabled: true
};

// Immediate safety check to populate defaults if storage is empty
chrome.storage.local.get(null, (currentSettings) => {
  if (!currentSettings || Object.keys(currentSettings).length === 0) {
    chrome.storage.local.set(DEFAULT_SETTINGS, () => {
      console.log("[Virtual Friend] Storage initialized with defaults.");
    });
  }
});

// Initialize settings on installation or extension updates
chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.local.get(null, (currentSettings) => {
    const merged = { ...DEFAULT_SETTINGS, ...currentSettings };
    chrome.storage.local.set(merged, () => {
      console.log("[Virtual Friend] Settings merged on install/update.");
    });
  });
});

// Listen for keyboard command shortcuts (e.g. Ctrl+Shift+P for Privacy Mode)
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-privacy-mode") {
    chrome.storage.local.get(["privacyMode"], (result) => {
      const newPrivacyState = !result.privacyMode;
      chrome.storage.local.set({ privacyMode: newPrivacyState }, () => {
        console.log(`[Virtual Friend] Privacy Mode set to: ${newPrivacyState}`);
        
        // Notify all active tabs
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                action: "privacyModeToggled",
                privacyMode: newPrivacyState
              }).catch(() => {
                // Ignore tabs where content script isn't running (e.g. chrome://)
              });
            }
          });
        });
      });
    });
  }
});

// Handle runtime messages from content script or popup UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getSettings") {
    chrome.storage.local.get(null, (settings) => {
      sendResponse({ settings: { ...DEFAULT_SETTINGS, ...settings } });
    });
    return true; // Keep message channel open for async response
  }
});
