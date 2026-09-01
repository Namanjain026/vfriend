/**
 * Virtual Friend — Options Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const defaultPosition = document.getElementById('defaultPosition');
  const defaultSize = document.getElementById('defaultSize');
  const defaultFrameInterval = document.getElementById('defaultFrameInterval');
  const resetBtn = document.getElementById('resetBtn');

  // Load options
  chrome.storage.local.get(['position', 'size', 'frameInterval'], (res) => {
    if (res.position) defaultPosition.value = res.position;
    if (res.size) defaultSize.value = res.size;
    if (res.frameInterval && defaultFrameInterval) defaultFrameInterval.value = res.frameInterval;
  });

  defaultPosition.addEventListener('change', (e) => {
    chrome.storage.local.set({ position: e.target.value });
  });

  defaultSize.addEventListener('change', (e) => {
    chrome.storage.local.set({ size: e.target.value });
  });

  if (defaultFrameInterval) {
    defaultFrameInterval.addEventListener('change', (e) => {
      chrome.storage.local.set({ frameInterval: e.target.value });
    });
  }

  resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all Virtual Friend settings to defaults?')) {
      chrome.storage.local.set({
        enabled: true,
        privacyMode: false,
        characterType: "anime_image",
        customCharacterDataUrl: null,
        size: "medium",
        position: "bottom-right",
        opacity: 1.0,
        soundsEnabled: false,
        volume: 0.5,
        animationFrequency: "normal",
        frameInterval: "3s",
        videoAwarenessEnabled: true,
        interactionEnabled: true
      }, () => {
        defaultPosition.value = "bottom-right";
        defaultSize.value = "medium";
        if (defaultFrameInterval) defaultFrameInterval.value = "3s";
        alert('Virtual Friend settings reset to default!');
      });
    }
  });
});
